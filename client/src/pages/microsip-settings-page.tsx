import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database, 
  Save, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Package, 
  FileText, 
  CreditCard,
  FolderTree,
  Play,
  TestTube
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { MicrosipConfig, MicrosipSyncLog } from "@shared/schema";

interface MicrosipConfigResponse extends Partial<MicrosipConfig> {
  configured: boolean;
}

export default function MicrosipSettingsPage() {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    host: "",
    port: 3050,
    database: "",
    username: "",
    password: "",
    enabled: false,
    syncCustomers: true,
    syncProducts: true,
    syncCategories: true,
    syncInvoices: true,
    syncPayments: true,
    masterDataInterval: 120,
    transactionalInterval: 60,
  });

  const { data: config, isLoading: isLoadingConfig } = useQuery<MicrosipConfigResponse>({
    queryKey: ["/api/microsip/config"],
  });

  const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery<MicrosipSyncLog[]>({
    queryKey: ["/api/microsip/logs"],
  });

  useEffect(() => {
    if (config && config.configured) {
      setFormData({
        host: config.host || "",
        port: config.port || 3050,
        database: config.database || "",
        username: config.username || "",
        password: config.password || "",
        enabled: config.enabled || false,
        syncCustomers: config.syncCustomers ?? true,
        syncProducts: config.syncProducts ?? true,
        syncCategories: config.syncCategories ?? true,
        syncInvoices: config.syncInvoices ?? true,
        syncPayments: config.syncPayments ?? true,
        masterDataInterval: config.masterDataInterval || 120,
        transactionalInterval: config.transactionalInterval || 60,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/microsip/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microsip/config"] });
      toast({
        title: "Configuración guardada",
        description: "La configuración de Microsip ha sido guardada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/microsip/test-connection", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Conexión exitosa",
          description: data.message,
        });
      } else {
        toast({
          title: "Error de conexión",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo probar la conexión",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await apiRequest("POST", "/api/microsip/sync", { type });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/microsip/logs"] });
        toast({
          title: "Sincronización completada",
          description: "Los datos han sido sincronizados correctamente.",
        });
      } else {
        toast({
          title: "Error en sincronización",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error durante la sincronización",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest("PATCH", "/api/microsip/toggle", { enabled });
      return response.json();
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/microsip/config"] });
      toast({
        title: enabled ? "Sincronización activada" : "Sincronización desactivada",
        description: enabled 
          ? "La sincronización automática ha sido activada." 
          : "La sincronización automática ha sido desactivada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // SQL Query state
  const [sqlQuery, setSqlQuery] = useState("SELECT FIRST 10 ARTICULO_ID, PRECIO_EMPRESA_ID, PRECIO FROM PRECIOS_ARTICULOS ORDER BY ARTICULO_ID");
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[]; rowCount: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const sqlQueryMutation = useMutation({
    mutationFn: async (sql: string) => {
      const response = await apiRequest("POST", "/api/microsip/query", { sql });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        setQueryError(data.error);
        setQueryResult(null);
      } else {
        setQueryResult(data);
        setQueryError(null);
      }
    },
    onError: (error: Error) => {
      setQueryError(error.message);
      setQueryResult(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Exitoso</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case "started":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> En proceso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeIcon = (type: string) => {
    switch (type) {
      case "customers":
        return <Users className="w-4 h-4" />;
      case "products":
        return <Package className="w-4 h-4" />;
      case "categories":
        return <FolderTree className="w-4 h-4" />;
      case "invoices":
        return <FileText className="w-4 h-4" />;
      case "payments":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-microsip">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6" data-testid="page-microsip-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6" />
            Integración Microsip
          </h1>
          <p className="text-muted-foreground">
            Sincroniza clientes, productos, facturas y pagos desde Microsip
          </p>
        </div>
        {config?.configured && (
          <div className="flex items-center gap-2">
            <Label htmlFor="sync-toggle">Sincronización automática</Label>
            <Switch
              id="sync-toggle"
              checked={config.enabled || false}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
              data-testid="switch-auto-sync"
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Conexión</CardTitle>
            <CardDescription>
              Datos para conectarse a la base de datos Firebird de Microsip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Servidor (IP o hostname)</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  data-testid="input-host"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Puerto</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="3050"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 3050 })}
                  data-testid="input-port"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Ruta de la base de datos</Label>
              <Input
                id="database"
                placeholder="C:\Microsip\Base de Datos\EMPRESA.FDB"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                data-testid="input-database"
              />
              <p className="text-xs text-muted-foreground">
                Ruta completa al archivo .FDB en el servidor de Microsip
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  placeholder="SYSDBA"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-password"
                />
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending || !formData.host || !formData.database}
                data-testid="button-test-connection"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Probar conexión
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-config">
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {config?.configured && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Opciones de Sincronización</CardTitle>
              <CardDescription>
                Selecciona qué datos deseas sincronizar desde Microsip
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label>Clientes</Label>
                  </div>
                  <Switch
                    checked={formData.syncCustomers}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCustomers: checked })}
                    data-testid="switch-sync-customers"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <Label>Categorías</Label>
                  </div>
                  <Switch
                    checked={formData.syncCategories}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCategories: checked })}
                    data-testid="switch-sync-categories"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label>Productos</Label>
                  </div>
                  <Switch
                    checked={formData.syncProducts}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncProducts: checked })}
                    data-testid="switch-sync-products"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label>Facturas</Label>
                  </div>
                  <Switch
                    checked={formData.syncInvoices}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncInvoices: checked })}
                    data-testid="switch-sync-invoices"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <Label>Pagos</Label>
                  </div>
                  <Switch
                    checked={formData.syncPayments}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncPayments: checked })}
                    data-testid="switch-sync-payments"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="masterInterval">Intervalo datos maestros (min)</Label>
                  <Input
                    id="masterInterval"
                    type="number"
                    value={formData.masterDataInterval}
                    onChange={(e) => setFormData({ ...formData, masterDataInterval: parseInt(e.target.value) || 120 })}
                    data-testid="input-master-interval"
                  />
                  <p className="text-xs text-muted-foreground">Clientes, productos, categorías</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transInterval">Intervalo transaccional (min)</Label>
                  <Input
                    id="transInterval"
                    type="number"
                    value={formData.transactionalInterval}
                    onChange={(e) => setFormData({ ...formData, transactionalInterval: parseInt(e.target.value) || 60 })}
                    data-testid="input-trans-interval"
                  />
                  <p className="text-xs text-muted-foreground">Facturas, pagos</p>
                </div>
              </div>

              <Button 
                type="button" 
                onClick={() => saveMutation.mutate(formData)} 
                disabled={saveMutation.isPending}
                data-testid="button-save-sync-options"
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar opciones
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sincronización Manual</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("all")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-all"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar todo
                </Button>
              </CardTitle>
              <CardDescription>
                Ejecuta la sincronización manualmente cuando lo necesites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("customers")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-customers"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("categories")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-categories"
                >
                  <FolderTree className="mr-2 h-4 w-4" />
                  Categorías
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("products")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-products"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Productos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("invoices")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-invoices"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Facturas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("payments")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-payments"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Sincronización
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLogs()}
                  data-testid="button-refresh-logs"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs && logs.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {getSyncTypeIcon(log.syncType)}
                          <div>
                            <p className="font-medium capitalize">{log.syncType}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.startedAt && format(new Date(log.startedAt), "dd MMM yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              {log.recordsCreated} nuevos / {log.recordsUpdated} actualizados
                            </p>
                            {(log.recordsSkipped ?? 0) > 0 && (
                              <p className="text-xs text-orange-500">{log.recordsSkipped} omitidos</p>
                            )}
                          </div>
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay registros de sincronización
                </div>
              )}
            </CardContent>
          </Card>

          {config.lastSyncStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Estado Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Última sync clientes</p>
                    <p className="font-medium">
                      {config.lastCustomerSync 
                        ? format(new Date(config.lastCustomerSync), "dd/MM HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última sync productos</p>
                    <p className="font-medium">
                      {config.lastProductSync 
                        ? format(new Date(config.lastProductSync), "dd/MM HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última sync categorías</p>
                    <p className="font-medium">
                      {config.lastCategorySync 
                        ? format(new Date(config.lastCategorySync), "dd/MM HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última sync facturas</p>
                    <p className="font-medium">
                      {config.lastInvoiceSync 
                        ? format(new Date(config.lastInvoiceSync), "dd/MM HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última sync pagos</p>
                    <p className="font-medium">
                      {config.lastPaymentSync 
                        ? format(new Date(config.lastPaymentSync), "dd/MM HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </p>
                  </div>
                </div>
                {config.lastSyncError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{config.lastSyncError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Intérprete SQL (Solo Lectura)
              </CardTitle>
              <CardDescription>
                Ejecuta consultas SELECT en Microsip para depuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sql-query">Consulta SQL</Label>
                <textarea
                  id="sql-query"
                  data-testid="input-sql-query"
                  className="w-full min-h-[100px] p-3 rounded-md border bg-background font-mono text-sm resize-y"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT FIRST 10 * FROM ARTICULOS"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  data-testid="button-run-query"
                  onClick={() => sqlQueryMutation.mutate(sqlQuery)}
                  disabled={sqlQueryMutation.isPending || !sqlQuery.trim()}
                >
                  {sqlQueryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Ejecutar
                </Button>
                <span className="text-sm text-muted-foreground">
                  Solo consultas SELECT - máximo 5,000 filas
                </span>
              </div>

              {queryError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{queryError}</p>
                </div>
              )}

              {queryResult && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {queryResult.rowCount} filas encontradas
                  </p>
                  <ScrollArea className="h-[400px] border rounded-lg">
                    <div className="overflow-auto">
                      <table className="w-full text-sm" data-testid="table-sql-results">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            {queryResult.columns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left font-medium border-b whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.rows.map((row, i) => (
                            <tr key={i} className="border-b hover:bg-muted/50">
                              {queryResult.columns.map((col) => (
                                <td key={col} className="px-3 py-2 whitespace-nowrap font-mono">
                                  {row[col] === null ? (
                                    <span className="text-muted-foreground italic">null</span>
                                  ) : typeof row[col] === 'object' ? (
                                    JSON.stringify(row[col])
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
