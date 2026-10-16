/** Firebase Auth remains the credential store. No public username lookup is needed. */
export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error(
      "Use a username of 3–32 letters, numbers, dots, underscores or hyphens.",
    );
  }
  return username;
}
export function usernameEmail(value: string): string {
  return `${normalizeUsername(value)}@users.scala.invalid`;
}
