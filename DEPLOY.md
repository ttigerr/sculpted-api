# Deploy

One-time setup to run **once per environment**. After this, every push to `main` builds, publishes to GHCR, migrates the database, and rolls the Container App.

Defaults used in this doc:

| | Value |
| - | - |
| Resource group | `sculpted-api-rg` |
| Region         | `southeastasia` |
| Env            | `sculpted-api-env` |
| Container App  | `sculpted-api` |
| Log Analytics  | `sculpted-api-logs` |
| Image          | `ghcr.io/ttigerr/sculpted-api` |

---

## 1. Create the resource group

```bash
az login
az account set --subscription "<your-subscription-id>"
az group create --name sculpted-api-rg --location southeastasia
```

## 2. Register required Azure providers (once per subscription)

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## 3. Create an Azure AD app for GitHub OIDC

```bash
az ad app create --display-name "github-sculpted-api" --query appId -o tsv
# -> APP_ID
az ad sp create --id <APP_ID>
```

Assign it `Contributor` on the resource group only:

```bash
SUB_ID=$(az account show --query id -o tsv)
az role assignment create \
  --role Contributor \
  --assignee <APP_ID> \
  --scope "/subscriptions/$SUB_ID/resourceGroups/sculpted-api-rg"
```

Add federated credentials so GitHub Actions can log in without a secret:

```bash
# Deploy via the `production` GitHub Environment (what the workflow uses)
az ad app federated-credential create --id <APP_ID> --parameters '{
  "name":"github-env-production",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:ttigerr/sculpted-api:environment:production",
  "audiences":["api://AzureADTokenExchange"]
}'
```

## 4. Configure GitHub repo secrets & variables

Repo → Settings → Secrets and variables → Actions:

**Secrets** (Settings → Secrets):

| Name | Value |
| - | - |
| `AZURE_CLIENT_ID`         | App ID from step 3 |
| `AZURE_TENANT_ID`         | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID`   | `az account show --query id -o tsv` |
| `DATABASE_URL_UNPOOLED`   | Unpooled Postgres URL. Used by the `migrate` job only. Never injected into the running Container App. |

**Variables** (Settings → Variables):

| Name | Value |
| - | - |
| `AZURE_RESOURCE_GROUP`  | `sculpted-api-rg` |
| `AZURE_CONTAINER_APP`   | `sculpted-api` |

**Environment**: create a `production` GitHub Environment (Settings → Environments → *New environment*). Add required reviewers if you want a manual gate on prod deploys. The `migrate` and `deploy` jobs both target this environment.

## 5. First push to main (publishes the first image)

```bash
git switch main
git merge develop
git push
```

Watch the Actions tab:

- `test` passes.
- `build-and-push` publishes `ghcr.io/ttigerr/sculpted-api:sha-<short>` and `:latest`.
- **`migrate` fails** — DATABASE_URL_UNPOOLED is set, but we haven't verified it reaches prod yet; or it may succeed if the migration already ran on dev-schema and the prod branch is in sync.
- **`deploy` fails** — the Container App doesn't exist yet. Expected on the first push.

Copy the `sha-<short>` tag — you need it for step 7.

## 6. Make the GHCR image pullable from Azure

By default the `ghcr.io/<org>/<repo>` package GitHub creates on first push is **private**. Azure Container Apps won't pull it without creds. Pick one:

- **Make it public** (simplest): GitHub → *Packages* → `sculpted-api` → *Package settings* → *Change visibility* → *Public*. No proprietary code lives in this image, so this is the recommended path for the side-project / free-tier use case.
- **Keep private**: GitHub Free gives 500 MB of private storage per account — ~3 images at this app's size. Add a PAT with `read:packages` to the Container App as registry credentials, and set up a cleanup job that keeps only the last 3 tags. Costs more in setup and ongoing housekeeping.

## 7. Create the Azure resources with Bicep

Use the `sha-<short>` tag from step 5 — never `:latest`, so you always know exactly what's running.

```bash
az deployment group create \
  --resource-group sculpted-api-rg \
  --template-file infra/main.bicep \
  --parameters \
    image='ghcr.io/ttigerr/sculpted-api:sha-<short-from-step-5>' \
    databaseUrl='<pooled DATABASE_URL>' \
    azureTenantName='<tenant short name>' \
    azureUserSignInFlow='B2C_1_signin' \
    azureUserSignUpFlow='B2C_1_signup' \
    azureClientId='<app registration client id>' \
    b2cIssuer='https://<tenant>.b2clogin.com/<tenant-id>/v2.0/'
```

`B2C_ISSUER` note: pull it from `https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/<signin-flow>/v2.0/.well-known/openid-configuration` → the `issuer` field.

Grab the output URL — that is `BACKEND_BASE_URL/api` for the mobile app.

## 8. Re-run the failed deploy

Actions → the failed `deploy` job → *Re-run failed jobs*. It should pass now that the Container App exists. From here on, every merge to `main` runs the full `test → build-and-push → migrate → deploy` pipeline automatically.

---

## Later: changing env vars or secrets

Edit `infra/main.bicep` and re-run step 7. Bicep is declarative — only drifted properties are updated. Alternatively, `az containerapp secret set` / `az containerapp update --set-env-vars` for one-off changes.

## Cost watch

- **Container Apps consumption**: free monthly allowance ≈ 180k vCPU-s and 360k GiB-s per subscription. Scale-to-zero (`minReplicas: 0`) keeps us inside it.
- **Log Analytics**: `logsDailyCapGb` defaults to `0.15` (~4.5 GB/month) to stay inside the ~5 GB/month free ingestion allowance. If logs stop appearing, the cap tripped — raise it or thin the logs.
- **GHCR**: free for public images; 500 MB private storage on Free plan.
- Set a **$1 Cost Management budget alert** so any charge pages you immediately.

## Rollback (code)

```bash
az containerapp revision list --name sculpted-api --resource-group sculpted-api-rg -o table
az containerapp revision activate --revision <previous-revision-name> \
  --name sculpted-api --resource-group sculpted-api-rg
```

## Rollback (database)

Database changes cannot be rolled back the same way. Keep migrations **additive only** — add columns, don't drop them in the same release that stops using them. Drop in a later release.
