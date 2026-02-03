"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Factory, FlaskConical, Plus } from "lucide-react";
import { LotesTab } from "@/components/produccion/tabs/LotesTab";
import { RecetasTab } from "@/components/produccion/tabs/RecetasTab";
import StyledModal from "@/components/StyledModal";
import { WizardLoteModal } from "@/components/produccion/WizardLoteModal";

type TabKey = "lotes" | "subrecetas" | "finales";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export function ProduccionPanel() {
  const [tab, setTab] = useState<TabKey>("lotes");
  const [nuevoLoteOpen, setNuevoLoteOpen] = useState(false);

  // TODO: Reemplaza por tu usuario real (auth/context)
  const usuarioNombre = "usuario demo";

  const tabs = useMemo(
    () =>
      [
        { key: "lotes", label: "Lotes", icon: ClipboardList },
        { key: "subrecetas", label: "Sub-recetas", icon: FlaskConical },
        { key: "finales", label: "Finales", icon: Factory },
      ] as const,
    []
  );

  const tabBase = "px-5 py-2 rounded-full font-bold transition border border-transparent relative";
  const tabActive = "bg-card text-foreground shadow-sm border-border";
  const tabInactive = "text-muted-foreground hover:text-foreground";

  return (
    <div className="flex flex-col gap-6">
      {/* Header estilo Catálogo */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <div className="flex gap-2 items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-none">Producción</h2>
            <span className="bg-muted text-foreground border border-border rounded-full px-3 py-0.5 font-semibold text-sm">
              Panel
            </span>
          </div>
          <div className="text-muted-foreground text-sm mt-1">
            Lotes, sub-recetas y control de insumos por pesaje real.
          </div>
        </div>

        <button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-full shadow-sm transition-all flex items-center gap-2"
          onClick={() => setNuevoLoteOpen(true)}
          type="button"
        >
          <Plus size={18} /> Nuevo lote
        </button>
      </div>

      {/* Tabs pills estilo Catálogo */}
      <div className="inline-flex rounded-full bg-muted p-1 border border-border self-start">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(tabBase, active ? tabActive : tabInactive)}
              type="button"
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {tab === "lotes" && <LotesTab onNuevoLote={() => setNuevoLoteOpen(true)} />}
      {tab === "subrecetas" && <RecetasTab tipo="subreceta" />}
      {tab === "finales" && <RecetasTab tipo="final" />}

      {/* Modal Nuevo lote con StyledModal */}
      <StyledModal open={nuevoLoteOpen} onClose={() => setNuevoLoteOpen(false)}>
        <WizardLoteModal
          open={nuevoLoteOpen}
          onClose={() => setNuevoLoteOpen(false)}
          usuarioNombre={usuarioNombre}
          // tipo: undefined => muestra subrecetas + finales (se elige en el Step 1)
        />
      </StyledModal>
    </div>
  );
}