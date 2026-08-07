export const PRODUCTION_APP_URL = "https://shiftnote.care";

export function browserAppUrl() {
  if (typeof window === "undefined") return PRODUCTION_APP_URL;
  const hostname = window.location.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "shiftnote.care", "www.shiftnote.care"].includes(hostname)) {
    return window.location.origin;
  }
  return PRODUCTION_APP_URL;
}
