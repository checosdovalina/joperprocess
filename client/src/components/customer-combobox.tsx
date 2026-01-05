import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Customer } from "@shared/schema";

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function CustomerCombobox({
  customers,
  value,
  onValueChange,
  placeholder = "Selecciona un cliente",
  disabled = false,
  "data-testid": testId,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value]
  );

  const filteredCustomers = useMemo(() => {
    if (!search) return customers.slice(0, 50);
    const query = search.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.rfc?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.city?.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [customers, search]);

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
          <span className="truncate">
            {selectedCustomer ? selectedCustomer.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Buscar por nombre, RFC, email, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid={`${testId}-search`}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSearch("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandList>
            <CommandEmpty>
              {search
                ? "No se encontraron clientes"
                : "Escribe para buscar..."}
            </CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onValueChange(customer.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                  data-testid={`${testId}-option-${customer.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[customer.rfc, customer.city, customer.phone]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
              {filteredCustomers.length === 50 && (
                <div className="py-2 px-4 text-xs text-muted-foreground text-center">
                  Mostrando primeros 50 resultados. Escribe para filtrar más.
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
