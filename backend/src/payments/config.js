const REQUIRED_BKASH_SECRETS = [
  "BKASH_USERNAME",
  "BKASH_PASSWORD",
  "BKASH_APP_KEY",
  "BKASH_APP_SECRET"
];

export function getBkashSandboxConfig(env = process.env) {
  const mode = (env.BKASH_ENV || "sandbox").trim().toLowerCase();

  if (mode !== "sandbox") {
    const error = new Error("Only bKash Sandbox is enabled in this release.");
    error.code = "BKASH_LIVE_DISABLED";
    throw error;
  }

  const missing = REQUIRED_BKASH_SECRETS.filter((key) => !env[key]);
  if (missing.length) {
    const error = new Error("bKash Sandbox credentials are not configured.");
    error.code = "BKASH_NOT_CONFIGURED";
    error.missing = missing;
    throw error;
  }

  return Object.freeze({
    environment: "sandbox",
    currency: "BDT",
    // Provider URL and API version must be confirmed against the merchant's
    // current official integration contract before enabling outbound requests.
    credentials: Object.freeze({
      username: env.BKASH_USERNAME,
      password: env.BKASH_PASSWORD,
      appKey: env.BKASH_APP_KEY,
      appSecret: env.BKASH_APP_SECRET
    })
  });
}

export function isBkashSandboxConfigured(env = process.env) {
  try {
    getBkashSandboxConfig(env);
    return true;
  } catch {
    return false;
  }
}
