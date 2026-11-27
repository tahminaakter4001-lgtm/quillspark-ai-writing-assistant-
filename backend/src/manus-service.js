const MANUS_BASE_URL = "https://api.manus.ai";

function getApiKey() {
  const key = process.env.MANUS_API_KEY;
  if (!key) {
    const error = new Error("Manus integration is not configured.");
    error.code = "MANUS_NOT_CONFIGURED";
    throw error;
  }
  return key;
}

export async function manusRequest(path, { method = "GET", body, query } = {}) {
  const url = new URL(path, MANUS_BASE_URL);
  if (query) for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { "x-manus-api-key": getApiKey(), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
    redirect: "error"
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    const error = new Error("Manus API request failed.");
    error.code = response.status === 429 ? "MANUS_RATE_LIMITED"
      : response.status === 401 || response.status === 403 ? "MANUS_AUTH_FAILED"
      : response.status === 404 ? "MANUS_NOT_FOUND"
      : response.status >= 500 ? "MANUS_UPSTREAM_ERROR" : "MANUS_BAD_REQUEST";
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function normalizeManusMessages(payload) {
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const statusEvent = messages.find((item) => item?.status_update?.agent_status);
  const status = statusEvent?.status_update?.agent_status;
  const normalized = status === "running" ? "running"
    : status === "waiting" ? "waiting"
    : status === "stopped" ? "completed"
    : status === "error" ? "failed" : "unknown";
  const resultEvent = messages.find((item) => item?.assistant_message?.content);
  const errorEvent = messages.find((item) => item?.error_message?.content);
  const waiting = statusEvent?.status_update?.status_detail || null;
  return {
    status: normalized,
    progress: statusEvent?.status_update?.brief || statusEvent?.status_update?.description || null,
    waiting: waiting ? {
      eventId: waiting.waiting_for_event_id || null,
      eventType: waiting.waiting_for_event_type || null,
      description: waiting.waiting_description || null,
      inputSchema: waiting.confirm_input_schema || null
    } : null,
    result: normalized === "completed" ? resultEvent?.assistant_message?.content || null : null,
    failure: normalized === "failed" ? errorEvent?.error_message?.content || "Manus task failed." : null
  };
}
