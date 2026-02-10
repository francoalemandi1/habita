import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nunito, Indie_Flower } from "next/font/google";
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
    default: "Habita - Gestión de Tareas del Hogar",
    template: "%s | Habita",
  },
  description:
    "Gestiona las tareas del hogar de forma colaborativa y divertida. Asigna tareas, gana puntos, sube de nivel y motiva a toda la familia.",
  keywords: [
    "tareas del hogar",
    "gestión familiar",
    "organización",
    "gamificación",
    "tareas domésticas",
    "familia",
  ],
  authors: [{ name: "Habita" }],
  creator: "Habita",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Habita",
    title: "Habita - Gestión de Tareas del Hogar",
    description:
      "La forma divertida y colaborativa de gestionar las tareas del hogar para toda la familia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Habita - Gestión de Tareas del Hogar",
    description:
      "La forma divertida y colaborativa de gestionar las tareas del hogar para toda la familia.",
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
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
