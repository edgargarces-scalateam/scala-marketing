import { applicationDefault } from "firebase-admin/app";
/** Reuse a signed-in Firebase CLI account in memory; never export its credentials. */
export async function operatorCredential(useFirebaseCli = false) {
  if (!useFirebaseCli) return applicationDefault();
  const cli = await import("firebase-tools/lib/auth.js");
  const account = cli.getGlobalDefaultAccount();
  if (!account) throw Error("Sign in with firebase login first.");
  return {
    getAccessToken: async () => {
      const token = await cli.getAccessToken(account.tokens.refresh_token, [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/firebase",
      ]);
      return { access_token: token.access_token, expires_in: 3600 };
    },
  };
}
