import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  moreResultsLabel?: string;
  disabled?: boolean;
  limit?: number;
  "data-testid"?: string;
}

const normalize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function SearchCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  moreResultsLabel,
  disabled = false,
  limit = 60,
  "data-testid": testId,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, "es")),
    [options]
  );

  const filtered = useMemo(() => {
    if (!search) return sorted.slice(0, limit);
    const q = normalize(search);
    return sorted
      .filter(
        (o) =>
          normalize(o.label).includes(q) ||
          normalize(o.sublabel || "").includes(q)
      )
      .slice(0, limit);
  }, [sorted, search, limit]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
          data-testid={testId}
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              {selected.sublabel && (
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {selected.sublabel}
                </span>
              )}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(480px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3 gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid={testId ? `${testId}-search` : undefined}
              autoFocus
            />
            {search && (
              <Button variant="ghost" size="icon" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover-elevate rounded-md mx-1 my-0.5",
                    value === option.value && "bg-primary/10"
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-sm truncate",
                        value === option.value && "text-primary font-medium"
                      )}
                    >
                      {option.label}
                    </span>
                    {option.sublabel && (
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              ))}
              {filtered.length === limit && moreResultsLabel && (
                <div className="py-2 px-4 text-xs text-muted-foreground text-center border-t">
                  {moreResultsLabel}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
