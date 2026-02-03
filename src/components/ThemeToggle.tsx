"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = resolvedTheme ?? theme;

  return (
    <button
      type="button"
      className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-full font-bold shadow transition"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      title="Cambiar tema"
    >
      {current === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}