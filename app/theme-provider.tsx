"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void; resolvedTheme: "light" | "dark" };

const ThemeContext = createContext<ThemeContextValue>({ theme: "system", setTheme: () => undefined, resolvedTheme: "light" });

function getResolvedTheme(theme: Theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("jobflow-theme") as Theme | null;
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle("dark", getResolvedTheme(theme) === "dark");
    };
    apply();
    window.localStorage.setItem("jobflow-theme", theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedTheme = typeof window === "undefined" ? "light" : getResolvedTheme(theme);
    return { theme, setTheme, resolvedTheme };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
