const PRODUCTION_URL = "https://www.thetapm.site";

export function getAppUrl(path: string = ""): string {
  let base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(base)) {
    base = PRODUCTION_URL;
  }
  base = base.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
