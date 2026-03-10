import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nunito, Indie_Flower } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const indieFlower = Indie_Flower({
  variable: "--font-indie-flower",
  subsets: ["latin"],
  weight: "400",
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
      <body className={`${nunito.variable} ${indieFlower.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
