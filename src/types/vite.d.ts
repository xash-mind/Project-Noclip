declare module 'vite' {
  export interface UserConfig { [key: string]: unknown; }
  export function defineConfig<T extends UserConfig>(config: T): T;
  export function build(config?: UserConfig): Promise<unknown>;
}
