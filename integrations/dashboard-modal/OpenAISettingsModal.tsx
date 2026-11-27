"use client";

import React, { useState } from "react";
import Modal from "./Modal";

type Health = {
  status?: string;
  service?: string;
  ai_configured?: boolean;
  database_configured?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBaseUrl: string;
  health?: Health | null;
  checking?: boolean;
  onSaveEndpoint: (url: string) => Promise<void>;
};

/**
 * Dashboard settings surface. API secrets are intentionally NOT collected here.
 * Save the endpoint through an authenticated server-side settings action.
 */
export default function OpenAISettingsModal({
  open, onOpenChange, apiBaseUrl, health, checking = false, onSaveEndpoint
}: Props) {
  const [url, setUrl] = useState(apiBaseUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    try {
      setSaving(true);
      setError("");
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
        throw new Error("Use HTTPS for deployed API endpoints.");
      }
      await onSaveEndpoint(parsed.origin);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="OpenAI connection"
      description="Configure the QuillSpark server endpoint and check its service status."
      size="lg" footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border px-4 py-2">Cancel</button>
          <button type="button" onClick={save} disabled={saving || !url.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save endpoint"}
          </button>
        </>
      }>
      <div className="space-y-5">
        <div>
          <label htmlFor="qs-api-url" className="mb-1 block text-sm font-medium">QuillSpark API base URL</label>
          <input id="qs-api-url" type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com" className="w-full rounded-lg border px-3 py-2" />
          <p className="mt-1 text-xs text-slate-500">Use your deployed QuillSpark backend URL. Do not enter an OpenAI API key here.</p>
        </div>
        <section aria-live="polite" className="rounded-lg border p-4">
          <h3 className="font-medium">Connection status</h3>
          {checking ? <p className="mt-2 text-sm text-slate-600">Checking service…</p> :
            health ? <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Service</dt><dd>{health.status === "ok" ? "Online" : "Unavailable"}</dd></div>
              <div><dt className="text-slate-500">AI configured</dt><dd>{health.ai_configured ? "Configured" : "Not configured"}</dd></div>
              <div><dt className="text-slate-500">Audit database</dt><dd>{health.database_configured ? "Connected" : "Not configured"}</dd></div>
            </dl> : <p className="mt-2 text-sm text-slate-600">No health check result yet. Check status from your authenticated server.</p>}
        </section>
        <aside className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          OpenAI credentials must remain in your hosting provider’s secret manager as OPENAI_API_KEY. Never expose them in browser storage, client-side environment variables, or GitHub.
        </aside>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
