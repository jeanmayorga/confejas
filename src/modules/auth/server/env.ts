import "server-only";

export function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must be configured with at least 32 characters.",
    );
  }

  return secret;
}
