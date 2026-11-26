import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Keep choices inside the dialog: no native popup or second floating layer
// competing with the modal's focus handling inside the preview iframe.
export function ZoneSellerPicker({ zoneName, vendedorId, value, candidates, pending, onChange }: {
  zoneName: string;
  vendedorId: number;
  value: string | null;
  candidates: { id: string; fullName: string; email: string | null }[];
  pending: boolean;
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const choicesId = `zone-seller-choices-${vendedorId}`;
  const selected = candidates.find(candidate => candidate.id === value);
  return (
    <div className="w-44 shrink-0">
      <Button
        type="button"
        variant="outline"
        className="w-full h-auto min-h-8 justify-between px-2 py-1 text-xs"
        data-testid={`select-zone-seller-${vendedorId}`}
        aria-label={`Vendedor de ${zoneName}`}
        aria-expanded={open}
        aria-controls={choicesId}
        onClick={() => setOpen(previous => !previous)}
      >
        <span className="truncate">{selected?.fullName ?? (value ? "Usuario asignado" : "Sin asignar")}</span>
        <ChevronDown className="ml-1 h-3 w-3 shrink-0" />
      </Button>
      {open && (
        <fieldset id={choicesId} className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-background p-1" disabled={pending}>
          <legend className="sr-only">Vendedor de {zoneName}</legend>
          {[{ id: "", fullName: "Sin asignar", email: null }, ...candidates].map(candidate => (
            <label key={candidate.id} className="flex items-start gap-2 rounded px-1 py-2 text-xs cursor-pointer hover:bg-accent">
              <input
                type="radio"
                className="mt-0.5 shrink-0"
                name={`zone-seller-${vendedorId}`}
                value={candidate.id}
                checked={(value ?? "") === candidate.id}
                onChange={() => onChange(candidate.id || null)}
              />
              <span className="min-w-0 break-words">
                <span className="block">{candidate.fullName}</span>
                {candidate.email && <span className="block break-all text-muted-foreground">{candidate.email}</span>}
              </span>
            </label>
          ))}
          {pending && <p role="status" className="px-1 text-xs text-muted-foreground">Guardando…</p>}
        </fieldset>
      )}
    </div>
  );
}
