import { useState, useMemo } from "react";
import { Customer, InsertCustomer } from "@shared/schema";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Plus, Pencil, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "@/components/customer-form";

export default function CustomersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const { data: customers, isLoading } = useEntityQuery<Customer[]>("/api/customers");

  // Get unique cities for filter
  const uniqueCities = useMemo(() => {
    if (!customers) return [];
    const cities = customers
      .map(c => c.city)
      .filter((city): city is string => !!city);
    return Array.from(new Set(cities)).sort();
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      // Search filter (name, RFC, email, phone)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          customer.name?.toLowerCase().includes(query) ||
          customer.rfc?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.contactName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter === "active" && customer.blocked) return false;
      if (statusFilter === "blocked" && !customer.blocked) return false;
      
      // City filter
      if (cityFilter !== "all" && customer.city !== cityFilter) return false;
      
      return true;
    });
  }, [customers, searchQuery, statusFilter, cityFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCityFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || cityFilter !== "all";

  const { toast } = useToast();

  const createCustomerMutation = useEntityMutation<Customer, InsertCustomer>({
    endpoint: "/api/customers",
    method: "POST",
    successMessage: "Cliente creado exitosamente",
    invalidateQueries: ["/api/customers"],
    onSuccessCallback: () => {
      setFormOpen(false);
      setEditingCustomer(undefined);
    },
  });

  const updateCustomerMutation = useMutation<Customer, Error, { id: string; data: InsertCustomer }>({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente actualizado exitosamente",
      });
      setFormOpen(false);
      setEditingCustomer(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: InsertCustomer) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCustomer(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de tus clientes y expedientes digitales
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} data-testid="button-add-customer">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">
              {customers?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-customers">
              {customers?.filter((c) => !c.blocked).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-blocked-customers">
              {customers?.filter((c) => c.blocked).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Todos los Clientes</CardTitle>
              <CardDescription>
                {hasActiveFilters 
                  ? `${filteredCustomers.length} de ${customers?.length || 0} clientes`
                  : `${customers?.length || 0} clientes registrados`}
              </CardDescription>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RFC, email, teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "blocked")}>
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            {uniqueCities.length > 0 && (
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-city-filter">
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ciudades</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RFC</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover-elevate" data-testid={`row-customer-${customer.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.name}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">{customer.rfc || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.contactName || "—"}
                        </div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.city && customer.state
                            ? `${customer.city}, ${customer.state}`
                            : customer.city || customer.state || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-medium">
                          ${parseFloat(customer.creditLimit || "0").toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.creditDays} días
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.blocked ? (
                          <Badge variant="destructive" data-testid={`status-blocked-${customer.id}`}>
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${customer.id}`}>
                            Activo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCustomer(customer)}
                          data-testid={`button-edit-customer-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hasActiveFilters ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron clientes con los filtros actuales</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearFilters}
                data-testid="button-clear-filters-empty"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay clientes registrados</p>
              <Button
                className="mt-4"
                onClick={() => setFormOpen(true)}
                data-testid="button-add-first-customer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleFormSubmit}
        isPending={createCustomerMutation.isPending || updateCustomerMutation.isPending}
        customer={editingCustomer}
      />
    </div>
  );
}
