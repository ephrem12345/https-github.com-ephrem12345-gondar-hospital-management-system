import type { Metadata } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { themeInitScript } from "@/lib/theme/theme";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gondar Hospital Management System",
    template: "%s | GHMS",
  },
  description:
    "GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS) — a unified platform for patient care, diagnostics, pharmacy, finance and administration.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to prevent flashing. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
