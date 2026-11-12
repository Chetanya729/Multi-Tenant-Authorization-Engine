/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the API, e.g. https://api.madora.in. Empty = same origin as the dashboard. */
  readonly VITE_API_BASE_URL?: string;
  /** "true" shows the demo-account picker on the sign-in page. */
  readonly VITE_DEMO_MODE?: string;
}
