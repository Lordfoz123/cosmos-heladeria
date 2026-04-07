import type { Metadata } from "next";
import "./globals.css";
import { CarritoProvider } from "@/components/CarritoContext";
import ToasterClient from "@/components/ToasterClient";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WishlistProvider } from "@/components/WishlistContext";

// 🔥 1. IMPORTAMOS EL FOOTER AQUÍ ARRIBA 🔥
import ShopFooter from "@/components/ShopFooter";

// import { ForceSystemTheme } from "@/components/ForceSystemTheme";

export const metadata: Metadata = {
  title: "Cosmos - Infinitas Posibilidades",
  description: "Sistema de gestión de inventario y ventas para heladería",
  // 🔥 AGREGAMOS ESTO PARA EL FAVICON 🔥
  icons: {
    icon: "/favicon.png", // Busca el archivo en la carpeta 'public'
    shortcut: "/favicon.png",
    apple: "/favicon.png", // Para que se vea pro si lo guardan en el celular
  },
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
                
                {/* Aquí se carga el contenido de cada página (Inicio, Tienda, etc.) */}
                {children}

                {/* 🔥 2. PONEMOS EL FOOTER GLOBAL AL FINAL DE TODO 🔥 */}
                <ShopFooter />

              </CarritoProvider>
            </WishlistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}