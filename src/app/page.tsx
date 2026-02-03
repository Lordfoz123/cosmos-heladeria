import Header from "@/components/Header";
import Link from "next/link";
import { IceCreamCone, ArrowRight, BarChart3, Package, ShoppingCart } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Header showNotifications={true} />

      <div
        className={[
          "min-h-screen",
          // light gradient (suave)
          "bg-gradient-to-br from-background via-background to-secondary",
          // dark gradient (tu estilo)
          "dark:from-[#0d2c47] dark:via-[#1a4570] dark:to-[#2a5a8f]",
          "text-foreground",
        ].join(" ")}
      >
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="text-center space-y-8 max-w-4xl">
            {/* Logo */}
            <div className="flex justify-center mb-8 animate-fade-in">
              <div className="rounded-full bg-card/30 dark:bg-white/10 p-8 backdrop-blur-sm border border-border/50 dark:border-white/20">
                <IceCreamCone className="h-20 w-20 text-foreground dark:text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-6xl md:text-7xl font-bold text-foreground dark:text-white mb-4 animate-fade-in-up">
              Cosmos
            </h1>

            <p className="text-2xl md:text-3xl text-muted-foreground dark:text-white/80 font-light mb-4 animate-fade-in-up animation-delay-200">
              Heladería Artesanal
            </p>

            <p className="text-xl md:text-2xl text-foreground/80 dark:text-white/90 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              Sistema completo de gestión de inventario, ventas y pedidos online
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto animate-fade-in-up animation-delay-400">
              <div className="bg-card/60 dark:bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-border/60 dark:border-white/20 hover:bg-card/80 dark:hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-primary/15 dark:bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Package className="h-7 w-7 text-primary dark:text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground dark:text-white">Control de Inventario</h3>
                <p className="text-sm text-muted-foreground dark:text-white/80 leading-relaxed">
                  Gestión de sabores, insumos y stock en tiempo real
                </p>
              </div>

              <div className="bg-card/60 dark:bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-border/60 dark:border-white/20 hover:bg-card/80 dark:hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-primary/15 dark:bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <BarChart3 className="h-7 w-7 text-primary dark:text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground dark:text-white">Reportes de Ventas</h3>
                <p className="text-sm text-muted-foreground dark:text-white/80 leading-relaxed">
                  Estadísticas detalladas y sabores más vendidos
                </p>
              </div>

              <div className="bg-card/60 dark:bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-border/60 dark:border-white/20 hover:bg-card/80 dark:hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="bg-primary/15 dark:bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <ShoppingCart className="h-7 w-7 text-primary dark:text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground dark:text-white">Pedidos Online</h3>
                <p className="text-sm text-muted-foreground dark:text-white/80 leading-relaxed">
                  Catálogo digital para delivery y retiro
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-12 animate-fade-in-up animation-delay-600">
              <Link href="/dashboard">
                <button className="group flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all shadow-2xl hover:scale-105">
                  Ir al Dashboard
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </button>
              </Link>

              <Link href="/tienda">
                <button className="flex items-center justify-center gap-2 bg-card/50 dark:bg-white/10 backdrop-blur-md text-foreground dark:text-white px-8 py-4 rounded-xl font-semibold text-lg border border-border/60 dark:border-white/30 hover:bg-card/70 dark:hover:bg-white/20 transition-all">
                  Ver Catálogo
                  <IceCreamCone className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}