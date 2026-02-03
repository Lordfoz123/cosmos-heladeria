"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ForceSystemTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("system");
  }, [setTheme]);

  return null;
}