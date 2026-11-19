export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ghms-theme";

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

export function storeTheme(theme: Theme): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Inline script that runs before hydration to avoid a theme flash. */
export const themeInitScript = `
(function(){try{
var t=localStorage.getItem('${STORAGE_KEY}')||'system';
var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d);
}catch(e){}})();
`;
