export const PROJECT_VERSION = String((globalThis as typeof globalThis & { __PROJECT_VERSION__?: string }).__PROJECT_VERSION__ ?? 'development');
