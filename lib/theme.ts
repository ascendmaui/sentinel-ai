import tokens from "./tokens.json";

export type ThemeName = "dark" | "light" | "high-contrast";
export const THEME_KEY = "sa-theme";
export const THEME_NAMES: ThemeName[] = ["dark", "light", "high-contrast"];

export const THEME_META: Record<ThemeName, string> = {
  dark: tokens.themes.dark.color.bg,
  light: tokens.themes.light.color.bg,
  "high-contrast": tokens.themes["high-contrast"].color.bg,
};

export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"&&t!=="light"&&t!=="high-contrast"){var m=window.matchMedia;t=m&&m("(prefers-contrast: more)").matches?"high-contrast":"dark"}d.setAttribute("data-theme",t)}catch(e){d.setAttribute("data-theme","dark")}})();`;
