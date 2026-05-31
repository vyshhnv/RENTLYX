const stripTrailingSlash = (value) => value.replace(/\/+$/, "");

export const DJANGO_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_DJANGO_ORIGIN || "http://127.0.0.1:8000"
);

export const AI_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_AI_ORIGIN || "http://127.0.0.1:8001"
);

export const API_BASE_URL = `${DJANGO_ORIGIN}/api`;
export const WS_ORIGIN = DJANGO_ORIGIN.replace(/^http/i, "ws");

export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildDjangoUrl = (path = "") => {
  if (!path) return DJANGO_ORIGIN;
  return `${DJANGO_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildAiUrl = (path = "") => {
  if (!path) return AI_ORIGIN;
  return `${AI_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildWsUrl = (path = "") => {
  if (!path) return WS_ORIGIN;
  return `${WS_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return buildDjangoUrl(path);
};
