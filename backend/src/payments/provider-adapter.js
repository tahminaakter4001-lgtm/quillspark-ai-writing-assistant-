const BLOCKED_CODE = "BKASH_PROVIDER_CONTRACT_REQUIRED";

function blocked(operation) {
  const error = new Error(
    "bKash provider operation is disabled until the authorized merchant's official Sandbox API contract is reviewed and mapped."
  );
  error.code = BLOCKED_CODE;
  error.operation = operation;
  return error;
}

/**
 * Fail-closed adapter scaffold.
 *
 * This intentionally performs no HTTP requests and does not guess provider
 * endpoints, headers, payload fields, token formats, or callback semantics.
 * Replace the blocked methods only after the merchant-specific official
 * Sandbox contract has been reviewed and covered by contract tests.
 */
export function createBkashSandboxAdapter() {
  return Object.freeze({
    async grantToken() {
      throw blocked("grantToken");
    },
    async refreshToken() {
      throw blocked("refreshToken");
    },
    async createPayment() {
      throw blocked("createPayment");
    },
    async executePayment() {
      throw blocked("executePayment");
    },
    async queryPayment() {
      throw blocked("queryPayment");
    },
    async searchTransaction() {
      throw blocked("searchTransaction");
    },
    async refund() {
      throw blocked("refund");
    }
  });
}

export { BLOCKED_CODE as BKASH_PROVIDER_CONTRACT_REQUIRED };
