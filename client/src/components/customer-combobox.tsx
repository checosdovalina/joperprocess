import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X, Building2 } from "lucide-react";
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
import { Customer } from "@shared/schema";
import { useI18n } from "@/hooks/use-i18n";

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
  placeholder,
  disabled = false,
  "data-testid": testId,
}: CustomerComboboxProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const resolvedPlaceholder = placeholder ?? t("incidents.select-customer");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value]
  );

  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es")),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    if (!search) return sortedCustomers.slice(0, 60);
    const query = normalize(search);
    return sortedCustomers
      .filter(
        (c) =>
          normalize(c.name || "").includes(query) ||
          normalize(c.rfc || "").includes(query) ||
          normalize(c.phone || "").includes(query) ||
          normalize(c.city || "").includes(query) ||
          normalize(c.microsipCode || "").includes(query) ||
          normalize(c.address || "").includes(query)
      )
      .slice(0, 60);
  }, [sortedCustomers, search]);

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
          {selectedCustomer ? (
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{selectedCustomer.name}</span>
              {selectedCustomer.microsipCode && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {selectedCustomer.microsipCode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{resolvedPlaceholder}</span>
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
              placeholder={t("customers.combobox-search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid={`${testId}-search`}
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-[320px]">
            <CommandEmpty>
              {search ? t("customers.no-results") : t("customers.type-to-search")}
            </CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover-elevate rounded-md mx-1 my-0.5",
                    value === customer.id && "bg-primary/10"
                  )}
                  onClick={() => {
                    onValueChange(customer.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  data-testid={`${testId}-option-${customer.id}`}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    value === customer.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {(customer.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      value === customer.id && "text-primary"
                    )}>
                      {customer.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {customer.microsipCode && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {customer.microsipCode}
                        </span>
                      )}
                      {customer.rfc && (
                        <span className="text-xs text-muted-foreground">
                          RFC: {customer.rfc}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="text-xs text-muted-foreground">
                          {customer.phone}
                        </span>
                      )}
                      {customer.city && (
                        <span className="text-xs text-muted-foreground">
                          {customer.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              ))}
              {filteredCustomers.length === 60 && (
                <div className="py-2 px-4 text-xs text-muted-foreground text-center border-t">
                  {t("customers.showing-60")}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
