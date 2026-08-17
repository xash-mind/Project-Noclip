interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_NOCLIP_STUDIO_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
