declare module 'vite' {
  export function defineConfig<T>(config: T): T;
  export function build(config?: unknown): Promise<unknown>;
  export function createServer(config?: unknown): Promise<{ listen(): Promise<void>; resolvedUrls?: unknown }>;
  export function preview(config?: unknown): Promise<unknown>;
}
interface ImportMetaEnv { readonly DEV?: boolean; readonly PROD?: boolean; }
interface ImportMeta { readonly env: ImportMetaEnv; }
