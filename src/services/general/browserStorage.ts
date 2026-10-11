/** Browser policies may deny storage entirely; preferences must not prevent rendering. */
export function readBrowserStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The caller still owns the current document's in-memory preference.
  }
}
