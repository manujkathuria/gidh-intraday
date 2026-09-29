import { auth } from "./firebase";

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port === "8080") {
        return "";
      }
      return "http://127.0.0.1:8080";
    }
    return "";
  }
  return "";
};

export const getStreamWsUrl = (path: string): string => {
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${proto}//127.0.0.1:8080${path}`;
    }
    return `${proto}//${window.location.host}${path}`;
  }
  return `ws://127.0.0.1:8080${path}`;
};

export const getStreamWsUrlWithAuth = async (path: string): Promise<string> => {
  const baseUrl = getStreamWsUrl(path);
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}auth=${encodeURIComponent(token)}`;
    }
  } catch {
    // fallback
  }
  return baseUrl;
};

export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // fallback
  }
  return {};
}
