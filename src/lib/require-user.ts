import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError } from "./http-error";

const tenant = process.env.AZURE_TENANT_NAME!;
const flows = [
  process.env.AZURE_USER_SIGNIN_FLOW!,
  process.env.AZURE_USER_SIGNUP_FLOW!,
];

const keySets = flows.map((flow) =>
  createRemoteJWKSet(
    new URL(
      `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${flow}/discovery/v2.0/keys`,
    ),
  ),
);

// Local-only login shortcut so the app can be tested without Azure B2C.
// `next dev` sets NODE_ENV=development; deployed builds run as production,
// so this can't be switched on in the cloud, even by mistake.
const DEV_TOKEN = "dev-token";
const DEV_SUB = "dev-user";
const devBypass =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_AUTH_BYPASS === "true";

export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Missing token");

  if (devBypass && token === DEV_TOKEN) return DEV_SUB;

  for (const keys of keySets) {
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: process.env.B2C_ISSUER,
        audience: process.env.AZURE_CLIENT_ID,
      });
      return payload.sub!;
    } catch {
      // Try the next flow's key set.
    }
  }

  throw new HttpError(401, "Invalid token");
}
