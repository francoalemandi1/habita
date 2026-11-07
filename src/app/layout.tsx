import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Schibsted_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/query-provider";
import { SnackbarProvider } from "@/components/ds/snackbar";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Habita - Coordinación del Hogar",
    template: "%s | Habita",
  },
  description:
    "Coordiná tu hogar en un solo lugar: tareas automáticas, gastos compartidos, comparador de precios, recetas y actividades. Gratis para toda la familia.",
  keywords: [
    "coordinación del hogar",
    "tareas del hogar",
    "gastos compartidos",
    "comparar precios supermercados",
    "gestión familiar",
    "organización del hogar",
    "recetas personalizadas",
    "familia",
  ],
  authors: [{ name: "Habita" }],
  creator: "Habita",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Habita",
    title: "Habita - Coordinación del Hogar",
    description:
      "Tareas, gastos, compras, recetas y salidas: todo tu hogar coordinado en un solo lugar. Gratis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Habita - Coordinación del Hogar",
    description:
      "Tareas, gastos, compras, recetas y salidas: todo tu hogar coordinado en un solo lugar. Gratis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fef3c7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${schibstedGrotesk.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <SnackbarProvider>{children}</SnackbarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
