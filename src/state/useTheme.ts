import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "auto";
const KEY = "pocketo-theme";

function apply(mode: ThemeMode): void {
  const dark =
    mode === "dark" ||
    (mode === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#131316" : "#faf7f2");
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem(KEY) as ThemeMode) || "dark",
  );

  useEffect(() => {
    apply(mode);
    localStorage.setItem(KEY, mode);
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const cycle = () =>
    setMode((m) => (m === "dark" ? "light" : m === "light" ? "auto" : "dark"));

  return { mode, setMode, cycle };
}
