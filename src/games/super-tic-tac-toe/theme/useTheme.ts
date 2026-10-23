import { createContext, useContext } from "react";
import type { ThemeConfig } from "../state/types.ts";
import { grassTheme } from "./themes.ts";
interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}
export const ThemeContext = createContext<ThemeContextValue>({
  theme: grassTheme,
  setTheme: () => {},
});
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
