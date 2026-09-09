/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the AgroMedConnect API, with no trailing slash and no `/api/v1` suffix — the client
   * adds the version prefix itself, and a base that already carries one produces `/api/v1/api/v1/…`
   * requests that 404 for a reason nothing in the message explains.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
