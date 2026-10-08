import { HotelProviderError } from "./errors";

export const VERCEL_TEAM_SLUG = "abdullah-shabis-projects";
export const VERCEL_PROJECT_NAME = "safrbwai";
export const VERCEL_OIDC_ISSUER = `https://oidc.vercel.com/${VERCEL_TEAM_SLUG}`;
export const VERCEL_OIDC_AUDIENCE = `https://vercel.com/${VERCEL_TEAM_SLUG}`;

export type GoogleDeploymentEnvironment = "preview" | "production";

export type GoogleOidcConfig = Readonly<{
  environment: GoogleDeploymentEnvironment;
  projectNumber: string;
  workloadIdentityPoolId: string;
  workloadIdentityProviderId: string;
  serviceAccountEmail: string;
  vercelProjectId: string;
  vercelTeamId: string;
  expectedSubject: string;
  issuer: typeof VERCEL_OIDC_ISSUER;
  audience: typeof VERCEL_OIDC_AUDIENCE;
}>;

type Environment = Readonly<Record<string, string | undefined>>;

const SAFE_RESOURCE_ID = /^[a-z][a-z0-9-]{2,62}$/;
const PROJECT_NUMBER = /^\d{6,20}$/;
const VERCEL_ID = /^(prj|team)_[A-Za-z0-9]+$/;
const SERVICE_ACCOUNT_EMAIL =
  /^[a-z][a-z0-9-]{2,62}@[a-z][a-z0-9-]{4,61}\.iam\.gserviceaccount\.com$/;

export function isServerHotelIdentityLookupEnabled(
  value = process.env.HOTEL_IDENTITY_LOOKUP_ENABLED
): boolean {
  return value === "true";
}

// True only on a Vercel Preview deployment. Lets Preview verify the real UI with
// the server flag alone; Production still also needs the product capability.
export function isPreviewDeployment(env: Environment = process.env): boolean {
  return (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV) === "preview";
}

function requireMatch(
  env: Environment,
  name: string,
  pattern: RegExp
): string {
  const value = env[name]?.trim();
  if (!value || !pattern.test(value)) {
    throw new HotelProviderError("PROVIDER_CONFIG");
  }
  return value;
}

export function readGoogleOidcConfig(
  env: Environment = process.env
): GoogleOidcConfig {
  const environment = env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV;
  if (environment !== "preview" && environment !== "production") {
    throw new HotelProviderError("PROVIDER_CONFIG");
  }

  const projectNumber = requireMatch(env, "GCP_PROJECT_NUMBER", PROJECT_NUMBER);
  const workloadIdentityPoolId = requireMatch(
    env,
    "GCP_WORKLOAD_IDENTITY_POOL_ID",
    SAFE_RESOURCE_ID
  );
  const workloadIdentityProviderId = requireMatch(
    env,
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
    SAFE_RESOURCE_ID
  );
  const serviceAccountEmail = requireMatch(
    env,
    "GCP_SERVICE_ACCOUNT_EMAIL",
    SERVICE_ACCOUNT_EMAIL
  );
  const vercelProjectId = requireMatch(env, "VERCEL_PROJECT_ID", VERCEL_ID);
  const vercelTeamId = requireMatch(env, "VERCEL_TEAM_ID", VERCEL_ID);

  return {
    environment,
    projectNumber,
    workloadIdentityPoolId,
    workloadIdentityProviderId,
    serviceAccountEmail,
    vercelProjectId,
    vercelTeamId,
    expectedSubject: `owner:${VERCEL_TEAM_SLUG}:project:${VERCEL_PROJECT_NAME}:environment:${environment}`,
    issuer: VERCEL_OIDC_ISSUER,
    audience: VERCEL_OIDC_AUDIENCE,
  };
}
