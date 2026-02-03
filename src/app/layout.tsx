import type { Metadata } from "next";
import "./globals.css";
import { CarritoProvider } from "@/components/CarritoContext";
import ToasterClient from "@/components/ToasterClient";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WishlistProvider } from "@/components/WishlistContext";
// import { ForceSystemTheme } from "@/components/ForceSystemTheme";

export const metadata: Metadata = {
  title: "Cosmos - Heladería Artesanal",
  description: "Sistema de gestión de inventario y ventas para heladería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* <ForceSystemTheme /> */}

          <AuthProvider>
            <WishlistProvider>
              <CarritoProvider>
                <ToasterClient />
                {children}
              </CarritoProvider>
            </WishlistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}