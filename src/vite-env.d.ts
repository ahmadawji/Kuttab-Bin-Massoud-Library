/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  readonly GOOGLE_SHEETS_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}