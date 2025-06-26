import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useMediaQuery } from "../lib/utils";

export function ThemeProvider({ children, ...props }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={prefersDark ? "dark" : "light"}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
