const KEY = "ab.selectedProfileId";

export function getStoredProjectId(): string {
  try {
    return typeof window !== "undefined" ? (window.localStorage.getItem(KEY) || "") : "";
  } catch {
    return "";
  }
}

export function storeProjectId(id: string) {
  try {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}