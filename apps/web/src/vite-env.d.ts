/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_HERO_VIDEO_URL?: string;
  readonly VITE_HERO_VIDEO_POSTER?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
