function normalizeSiteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\/+$/, "");
}

function getSiteUrl(): string {
  const fromEnv = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;

  const productionHost = normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionHost) return `https://${productionHost}`;

  const previewHost = normalizeSiteUrl(process.env.VERCEL_URL);
  if (previewHost) return `https://${previewHost}`;

  return "http://localhost:3000";
}

export const siteUrl = getSiteUrl();

