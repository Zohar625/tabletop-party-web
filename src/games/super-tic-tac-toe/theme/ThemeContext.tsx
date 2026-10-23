import { useState, type ReactNode } from "react";
import type { ThemeConfig } from "../state/types";
import { grassTheme } from "./themes";
import { ThemeContext } from "./useTheme";
function loadTheme(): ThemeConfig {
  try {
    const saved = JSON.parse(
      localStorage.getItem("super-ttt-theme-v2") ?? "null",
    );
    if (saved && ["classic", "grass", "rice"].includes(saved.boardSkin))
      return {
        ...grassTheme,
        boardSkin: saved.boardSkin,
        motion: saved.motion !== false,
      };
  } catch {
    /* A blocked storage area must not prevent local play. */
  }
  return grassTheme;
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<ThemeConfig>(loadTheme);
  const setTheme = (next: ThemeConfig) => {
    updateTheme(next);
    try {
      localStorage.setItem("super-ttt-theme-v2", JSON.stringify(next));
    } catch {
      /* Optional persistence. */
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
