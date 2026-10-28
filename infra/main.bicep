// Azure Container Apps deployment for sculpted-api.
// Scope: resource group. Create the RG first with `az group create`.

@description('Short app name. Used as a prefix for every resource.')
param appName string = 'sculpted-api'

@description('Deployment region.')
param location string = resourceGroup().location

@description('Container image reference (e.g. ghcr.io/ttigerr/sculpted-api:sha-abc123).')
param image string

@description('Daily cap for Log Analytics ingestion, in GB (string so decimals are allowed). Default stays inside the ~5 GB/month free ingestion allowance.')
param logsDailyCapGb string = '0.15'

@description('Max replicas. Keep small on free tier.')
param maxReplicas int = 2

@secure()
@description('Pooled DATABASE_URL for the serverless driver. Unpooled is only needed for migrations and lives as a GitHub Actions secret, not here.')
param databaseUrl string

@description('Azure AD B2C tenant short name (e.g. "sculptedauth").')
param azureTenantName string

@description('B2C sign-in user flow policy name.')
param azureUserSignInFlow string

@description('B2C sign-up user flow policy name.')
param azureUserSignUpFlow string

@description('App registration (client) id tokens are issued for.')
param azureClientId string

@description('Issuer from each flow\'s OIDC metadata.')
param b2cIssuer string

var logsName = '${appName}-logs'
var envName  = '${appName}-env'
var appResourceName = appName

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json(logsDailyCapGb)
    }
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appResourceName
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: [
        { name: 'database-url', value: databaseUrl }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'AZURE_TENANT_NAME', value: azureTenantName }
            { name: 'AZURE_USER_SIGNIN_FLOW', value: azureUserSignInFlow }
            { name: 'AZURE_USER_SIGNUP_FLOW', value: azureUserSignUpFlow }
            { name: 'AZURE_CLIENT_ID', value: azureClientId }
            { name: 'B2C_ISSUER', value: b2cIssuer }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3000 }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: maxReplicas
      }
    }
  }
}

output appUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output appName string = app.name
