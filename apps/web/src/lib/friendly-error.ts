export function friendlyError(status: number, raw?: string) {
  const msg = (raw || "").trim();
  const lower = msg.toLowerCase();
  if (lower.includes("unique") || lower.includes("already exists")) {
    return "That value is already in use. Choose a different code, email, or name.";
  }
  if (lower.includes("invalid credentials")) {
    return "Email or password is wrong. On live, use the admin email from the server .env — not the local demo login.";
  }
  if (lower.includes("too many login")) {
    return "Too many sign-in attempts. Wait 15 minutes, then try again.";
  }
  if (lower.includes("file too large") || lower.includes("too large")) {
    return msg || "File is too large. Compress it or pick a smaller image.";
  }
  if (msg) return msg;
  if (status === 401) return "You are not signed in, or the password is wrong. Sign in and try again.";
  if (status === 403) return "You do not have permission to do this.";
  if (status === 404) return "That item was not found. Refresh the page and try again.";
  if (status === 413) return "File is too large. Use a smaller image (2MB max, favicon 100KB).";
  if (status === 429) return "Too many requests. Wait a minute, then try again.";
  if (status >= 500) return "Server error. Wait a moment and try again. If it continues, check that the API is running.";
  if (status === 0) return "Could not reach the server. Check your internet connection and that the site is online.";
  return `Something went wrong (${status}). Check what you entered and try again.`;
}
