import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Customer, InsertCustomer } from "@shared/schema";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Users, UserCheck, UserX, Plus, Pencil, Search, X, Mail, Phone, MapPin, Building, CreditCard, Calendar, Trash2, Loader2, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "@/components/customer-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export default function CustomersPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [downloadingStatementId, setDownloadingStatementId] = useState<string | null>(null);

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
  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      // Search filter (name, RFC, email, phone, code, address)
      if (searchQuery) {
        const query = normalize(searchQuery);
        const matchesSearch = 
          normalize(customer.name || "").includes(query) ||
          normalize(customer.rfc || "").includes(query) ||
          normalize(customer.phone || "").includes(query) ||
          normalize(customer.contactName || "").includes(query) ||
          normalize(customer.microsipCode || "").includes(query) ||
          normalize(customer.city || "").includes(query) ||
          normalize(customer.address || "").includes(query);
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
    successMessage: t("customers.created-success"),
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
        title: t("label.success"),
        description: t("customers.updated-success"),
      });
      setFormOpen(false);
      setEditingCustomer(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setCustomerToDelete(null);
      toast({ title: t("customers.deleted") });
    },
    onError: () => {
      toast({ title: t("label.error"), description: t("customers.delete-error"), variant: "destructive" });
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

  const handleDownloadStatement = async (customer: Customer) => {
    setDownloadingStatementId(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}/account-statement-pdf`);
      if (!res.ok) throw new Error(t("customers.pdf-error"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-${customer.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("label.error"), description: t("customers.statement-error"), variant: "destructive" });
    } finally {
      setDownloadingStatementId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("customers.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("customers.subtitle")}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} data-testid="button-add-customer">
          <Plus className="h-4 w-4 mr-2" />
          {t("customers.new")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("customers.total")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("customers.active")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("customers.blocked")}</CardTitle>
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
              <CardTitle>{t("customers.all")}</CardTitle>
              <CardDescription>
                {hasActiveFilters 
                  ? `${filteredCustomers.length} / ${customers?.length || 0}`
                  : `${customers?.length || 0}`}
              </CardDescription>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("customers.combobox-search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "blocked")}>
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder={t("customers.state")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("label.all")}</SelectItem>
                <SelectItem value="active">{t("status.active")}</SelectItem>
                <SelectItem value="blocked">{t("status.blocked")}</SelectItem>
              </SelectContent>
            </Select>
            {uniqueCities.length > 0 && (
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-city-filter">
                  <SelectValue placeholder={t("customers.city")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("customers.all-cities")}</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-2" />
                {t("btn.clear")}
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
                    <TableHead>{t("customers.col.client")}</TableHead>
                    <TableHead>{t("customers.col.rfc")}</TableHead>
                    <TableHead>{t("customers.col.contact")}</TableHead>
                    <TableHead>{t("customers.col.location")}</TableHead>
                    <TableHead className="text-right">{t("customers.col.credit")}</TableHead>
                    <TableHead>{t("customers.col.status")}</TableHead>
                    <TableHead className="text-right">{t("customers.col.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      className="hover-elevate cursor-pointer" 
                      data-testid={`row-customer-${customer.id}`}
                      onDoubleClick={() => setViewingCustomer(customer)}
                    >
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
                          {customer.creditDays} {t("customers.days")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.blocked ? (
                          <Badge variant="destructive" data-testid={`status-blocked-${customer.id}`}>
                            {t("status.blocked")}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${customer.id}`}>
                            {t("status.active")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("customers.download-statement")}
                            onClick={(e) => { e.stopPropagation(); handleDownloadStatement(customer); }}
                            disabled={downloadingStatementId === customer.id}
                            data-testid={`button-statement-customer-${customer.id}`}
                          >
                            {downloadingStatementId === customer.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <FileText className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCustomer(customer)}
                            data-testid={`button-edit-customer-${customer.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setCustomerToDelete(customer)}
                              data-testid={`button-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hasActiveFilters ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("customers.no-results")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearFilters}
                data-testid="button-clear-filters-empty"
              >
                <X className="h-4 w-4 mr-2" />
                {t("btn.clear-filters")}
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("label.no-results")}</p>
              <Button
                className="mt-4"
                onClick={() => setFormOpen(true)}
                data-testid="button-add-first-customer"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("customers.create-first")}
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

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => { if (!open) setCustomerToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("btn.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customerToDelete?.name}</strong>? {t("customers.delete-confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-customer">{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => customerToDelete && deleteCustomerMutation.mutate(customerToDelete.id)}
              disabled={deleteCustomerMutation.isPending}
              data-testid="button-confirm-delete-customer"
            >
              {deleteCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btn.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewingCustomer?.name}</DialogTitle>
            <div className="flex items-center gap-2 pt-2">
              {viewingCustomer?.blocked ? (
                <Badge variant="destructive">{t("status.blocked")}</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">{t("status.active")}</Badge>
              )}
              {viewingCustomer?.microsipCode && (
                <Badge variant="outline">Microsip: {viewingCustomer.microsipCode}</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t("customers.contact-info")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewingCustomer?.contactName && (
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Contacto</p>
                      <p className="text-sm text-muted-foreground">{viewingCustomer.contactName}</p>
                    </div>
                  </div>
                )}
                {viewingCustomer?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{viewingCustomer.email}</p>
                    </div>
                  </div>
                )}
                {viewingCustomer?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t("label.phone")}</p>
                      <p className="text-sm text-muted-foreground">{viewingCustomer.phone}</p>
                    </div>
                  </div>
                )}
                {viewingCustomer?.rfc && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">RFC</p>
                      <p className="text-sm text-muted-foreground font-mono">{viewingCustomer.rfc}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t("label.address")}</h4>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {viewingCustomer?.address && <p>{viewingCustomer.address}</p>}
                  <p>
                    {[viewingCustomer?.city, viewingCustomer?.state, viewingCustomer?.zipCode]
                      .filter(Boolean)
                      .join(", ") || t("customers.no-address")}
                  </p>
                  {viewingCustomer?.country && <p className="text-muted-foreground">{viewingCustomer.country}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Credit Info */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t("customers.credit-info")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("label.credit-limit")}</p>
                    <p className="text-lg font-semibold">
                      ${parseFloat(viewingCustomer?.creditLimit || "0").toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("label.credit-days")}</p>
                    <p className="text-lg font-semibold">{viewingCustomer?.creditDays || 0} {t("label.days")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setViewingCustomer(null)}>
                {t("btn.close")}
              </Button>
              <Button onClick={() => {
                if (viewingCustomer) {
                  handleEditCustomer(viewingCustomer);
                  setViewingCustomer(null);
                }
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("btn.edit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
