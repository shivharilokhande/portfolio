/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Spring Boot backend (apps/api). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
