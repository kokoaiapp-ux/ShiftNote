export const PRODUCTION_APP_URL = "https://shiftnote.care";

export function browserAppUrl() {
  if (typeof window === "undefined") return PRODUCTION_APP_URL;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? window.location.origin
    : PRODUCTION_APP_URL;
}