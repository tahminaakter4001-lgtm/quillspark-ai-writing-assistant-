# QuillSpark Dashboard Modal + OpenAI connection

This folder provides a reusable accessible modal and a dashboard settings surface for the existing server-side QuillSpark API.

## Files
- `Modal.tsx`: controlled native HTML dialog; supports title, description, body, footer, size, Escape and backdrop controls.
- `OpenAISettingsModal.tsx`: endpoint configuration and non-secret health status display.

## Integration
Import `OpenAISettingsModal` into the dashboard page. Keep `open` state in that page. Supply:
- `apiBaseUrl`: the deployed QuillSpark backend origin.
- `health`: result of GET `/healthz`, fetched by a trusted server-side route.
- `onSaveEndpoint`: authenticated server action/API call that stores the endpoint in your app's server-side settings.

Example:
```tsx
const [open, setOpen] = useState(false);
<OpenAISettingsModal
  open={open}
  onOpenChange={setOpen}
  apiBaseUrl={savedApiOrigin}
  health={health}
  checking={checking}
  onSaveEndpoint={saveApiOrigin}
/>
```

## Security boundary
The current backend protects `/v1/*` using `QUILLSPARK_API_TOKEN`. Do not call those routes directly from browser JavaScript and do not ship that token to the browser. Implement an authenticated same-origin server route/proxy that verifies the user's session and forwards approved requests to the backend. Derive reviewer identity from the host application's authenticated session, not request-body input.

Keep `OPENAI_API_KEY` and `QUILLSPARK_API_TOKEN` in the deployment platform's secret manager. The modal deliberately has no API-key textbox. Configure `OPENAI_API_KEY` and `OPENAI_MODEL` on the backend host. The backend's `/healthz` reports only booleans, not secret values.

## Styling and validation
The components use Tailwind utility classes and React/TypeScript. Adapt tokens to the host design system if Tailwind is not installed. The repository currently has no verified dashboard frontend source tree, so these files are integration-ready components, not a claim that the Manus-hosted site has been changed. Run the consuming app's lint, typecheck, accessibility tests, and production build after integration.
