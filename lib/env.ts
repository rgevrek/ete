/** The public URL of the app, for the links in the mails. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function secureCookies(): boolean {
  return appUrl().startsWith("https://");
}
