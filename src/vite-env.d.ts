/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly GOOGLE_SHEETS_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
