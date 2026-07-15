import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
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
  TestTube,
  DollarSign,
  ShieldAlert,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { MicrosipConfig, MicrosipSyncLog } from "@shared/schema";

interface MicrosipConfigResponse extends Partial<MicrosipConfig> {
  configured: boolean;
}

export default function MicrosipSettingsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [formData, setFormData] = useState({
    host: "",
    port: 3050,
    database: "",
    cxcDatabase: "",
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
    // Poll every 3 seconds while any sync is still running; stop when all done
    refetchInterval: (query) => {
      const data = query.state.data as MicrosipSyncLog[] | undefined;
      if (data?.some(log => log.status === "started")) return 3000;
      return false;
    },
  });

  useEffect(() => {
    if (config && config.configured) {
      setFormData({
        host: config.host || "",
        port: config.port || 3050,
        database: config.database || "",
        cxcDatabase: config.cxcDatabase || "",
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
        title: t("microsip.saved-title"),
        description: t("microsip.saved-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message || t("microsip.save-error"),
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
      setTestResult(data);
      if (data.success) {
        toast({ title: t("microsip.conn-success"), description: data.message });
      } else if (data.errorCode !== 'WIRE_CRYPT') {
        toast({ title: t("microsip.conn-error"), description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message || t("microsip.test-error") });
      toast({ title: t("label.error"), description: error.message || t("microsip.test-error"), variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await apiRequest("POST", "/api/microsip/sync", { type });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/microsip/logs"] });
      if (data.success) {
        toast({
          title: t("microsip.sync-started"),
          description: data.message || t("microsip.sync-started-desc"),
        });
      } else {
        toast({
          title: t("microsip.sync-error"),
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message || t("microsip.sync-error-generic"),
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
        title: enabled ? t("microsip.enabled-title") : t("microsip.disabled-title"),
        description: enabled 
          ? t("microsip.enabled-desc") 
          : t("microsip.disabled-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection result state
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; errorCode?: string } | null>(null);

  // USD products query state
  const [usdProducts, setUsdProducts] = useState<{ CLAVE_ARTICULO: string; NOMBRE: string; MONEDA_ID: number }[] | null>(null);
  const [usdError, setUsdError] = useState<string | null>(null);

  const usdProductsMutation = useMutation({
    mutationFn: async () => {
      // MONEDA_ID is in PRECIOS_ARTICULOS (per price list 42), not in ARTICULOS
      const sql = `SELECT FIRST 500 A.ARTICULO_ID, A.NOMBRE, P.MONEDA_ID, (SELECT FIRST 1 CA.CLAVE_ARTICULO FROM CLAVES_ARTICULOS CA WHERE CA.ARTICULO_ID = A.ARTICULO_ID) AS CLAVE_ARTICULO FROM ARTICULOS A JOIN PRECIOS_ARTICULOS P ON P.ARTICULO_ID = A.ARTICULO_ID AND P.PRECIO_EMPRESA_ID = 42 WHERE A.ESTATUS = 'A' AND P.MONEDA_ID <> 1 ORDER BY A.NOMBRE`;
      const response = await apiRequest("POST", "/api/microsip/query", { sql });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        setUsdError(data.error);
        setUsdProducts(null);
      } else {
        setUsdProducts(data.rows ?? []);
        setUsdError(null);
      }
    },
    onError: (error: Error) => {
      setUsdError(error.message);
      setUsdProducts(null);
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
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> {t("microsip.badge.success")}</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> {t("label.error")}</Badge>;
      case "started":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("microsip.badge.in-progress")}</Badge>;
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
            {t("microsip.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("microsip.subtitle")}
          </p>
        </div>
        {config?.configured && (
          <div className="flex items-center gap-2">
            <Label htmlFor="sync-toggle">{t("microsip.auto-sync")}</Label>
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
            <CardTitle>{t("microsip.conn.title")}</CardTitle>
            <CardDescription>
              {t("microsip.conn.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">{t("microsip.field.host")}</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  data-testid="input-host"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">{t("microsip.field.port")}</Label>
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
              <Label htmlFor="database">{t("microsip.field.database")}</Label>
              <Input
                id="database"
                placeholder="C:\Microsip\Base de Datos\EMPRESA.FDB"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                data-testid="input-database"
              />
              <p className="text-xs text-muted-foreground">
                {t("microsip.database.hint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cxcDatabase">{t("microsip.field.cxc-database")}<span className="text-muted-foreground font-normal">{t("microsip.optional")}</span></Label>
              <Input
                id="cxcDatabase"
                placeholder="C:\Microsip\Base de Datos\EMPRESA_CXC.FDB"
                value={formData.cxcDatabase}
                onChange={(e) => setFormData({ ...formData, cxcDatabase: e.target.value })}
                data-testid="input-cxc-database"
              />
              <p className="text-xs text-muted-foreground">
                {t("microsip.cxc.hint")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("label.username")}</Label>
                <Input
                  id="username"
                  placeholder="SYSDBA"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("label.password")}</Label>
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
                onClick={() => { setTestResult(null); testConnectionMutation.mutate(); }}
                disabled={testConnectionMutation.isPending || !formData.host || !formData.database}
                data-testid="button-test-connection"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                {t("microsip.test-connection")}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-config">
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t("microsip.save-config")}
              </Button>
            </div>

            {/* Test connection result panel */}
            {testResult && !testResult.success && testResult.errorCode === 'WIRE_CRYPT' && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Error de cifrado de red (WireCrypt)
                </div>
                <p className="text-sm text-muted-foreground">
                  El servidor Firebird tiene <code className="bg-muted px-1 rounded text-xs">WireCrypt = Required</code>, pero el cliente de conexión no soporta cifrado. Para solucionar esto:
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>En el servidor donde está instalado Microsip, abre el archivo <code className="bg-muted px-1 rounded text-xs">firebird.conf</code></li>
                  <li>Generalmente se encuentra en <code className="bg-muted px-1 rounded text-xs">C:\Program Files\Firebird\Firebird_X_X\</code></li>
                  <li>Busca la línea <code className="bg-muted px-1 rounded text-xs">WireCrypt = Required</code> y cámbiala a <code className="bg-muted px-1 rounded text-xs">WireCrypt = Enabled</code></li>
                  <li>Guarda el archivo y reinicia el servicio de Firebird desde Servicios de Windows</li>
                </ol>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span><code>Enabled</code> permite conexiones con o sin cifrado. <code>Required</code> rechaza conexiones sin cifrado (como esta).</span>
                </div>
              </div>
            )}
            {testResult && !testResult.success && testResult.errorCode !== 'WIRE_CRYPT' && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{testResult.message}</p>
              </div>
            )}
            {testResult && testResult.success && (
              <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">{testResult.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {config?.configured && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("microsip.sync-options.title")}</CardTitle>
              <CardDescription>
                {t("microsip.sync-options.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label>{t("microsip.entity.customers")}</Label>
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
                    <Label>{t("microsip.entity.categories")}</Label>
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
                    <Label>{t("microsip.entity.products")}</Label>
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
                    <Label>{t("microsip.entity.invoices")}</Label>
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
                    <Label>{t("microsip.entity.payments")}</Label>
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
                  <Label htmlFor="masterInterval">{t("microsip.master-interval")}</Label>
                  <Input
                    id="masterInterval"
                    type="number"
                    value={formData.masterDataInterval}
                    onChange={(e) => setFormData({ ...formData, masterDataInterval: parseInt(e.target.value) || 120 })}
                    data-testid="input-master-interval"
                  />
                  <p className="text-xs text-muted-foreground">{t("microsip.master-interval-hint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transInterval">{t("microsip.trans-interval")}</Label>
                  <Input
                    id="transInterval"
                    type="number"
                    value={formData.transactionalInterval}
                    onChange={(e) => setFormData({ ...formData, transactionalInterval: parseInt(e.target.value) || 60 })}
                    data-testid="input-trans-interval"
                  />
                  <p className="text-xs text-muted-foreground">{t("microsip.trans-interval-hint")}</p>
                </div>
              </div>

              <Button 
                type="button" 
                onClick={() => saveMutation.mutate(formData)} 
                disabled={saveMutation.isPending}
                data-testid="button-save-sync-options"
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("microsip.save-options")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("microsip.manual.title")}</span>
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
                  {t("microsip.sync-all")}
                </Button>
              </CardTitle>
              <CardDescription>
                {t("microsip.manual.desc")}
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
                  {t("microsip.entity.customers")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("categories")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-categories"
                >
                  <FolderTree className="mr-2 h-4 w-4" />
                  {t("microsip.entity.categories")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("products")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-products"
                >
                  <Package className="mr-2 h-4 w-4" />
                  {t("microsip.entity.products")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("invoices")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-invoices"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t("microsip.entity.invoices")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate("payments")}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-payments"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("microsip.entity.payments")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t("microsip.history.title")}
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
                              {t("microsip.records-summary").replace("{created}", String(log.recordsCreated)).replace("{updated}", String(log.recordsUpdated))}
                            </p>
                            {(log.recordsSkipped ?? 0) > 0 && (
                              <p className="text-xs text-orange-500">{t("microsip.records-skipped").replace("{count}", String(log.recordsSkipped))}</p>
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
                  {t("microsip.no-logs")}
                </div>
              )}
            </CardContent>
          </Card>

          {config.lastSyncStatus && (
            <Card>
              <CardHeader>
                <CardTitle>{t("microsip.current-status")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("microsip.last-customers")}</p>
                    <p className="font-medium">
                      {config.lastCustomerSync 
                        ? format(new Date(config.lastCustomerSync), "dd/MM HH:mm", { locale: es })
                        : t("microsip.never")
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("microsip.last-products")}</p>
                    <p className="font-medium">
                      {config.lastProductSync 
                        ? format(new Date(config.lastProductSync), "dd/MM HH:mm", { locale: es })
                        : t("microsip.never")
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("microsip.last-categories")}</p>
                    <p className="font-medium">
                      {config.lastCategorySync 
                        ? format(new Date(config.lastCategorySync), "dd/MM HH:mm", { locale: es })
                        : t("microsip.never")
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("microsip.last-invoices")}</p>
                    <p className="font-medium">
                      {config.lastInvoiceSync 
                        ? format(new Date(config.lastInvoiceSync), "dd/MM HH:mm", { locale: es })
                        : t("microsip.never")
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("microsip.last-payments")}</p>
                    <p className="font-medium">
                      {config.lastPaymentSync 
                        ? format(new Date(config.lastPaymentSync), "dd/MM HH:mm", { locale: es })
                        : t("microsip.never")
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

          {/* ── Productos USD en Microsip ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("microsip.usd.title")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => usdProductsMutation.mutate()}
                  disabled={usdProductsMutation.isPending}
                  data-testid="button-query-usd-products"
                >
                  {usdProductsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {t("microsip.query")}
                </Button>
              </CardTitle>
              <CardDescription>
                {t("microsip.usd.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usdError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{usdError}</p>
                </div>
              )}

              {usdProducts === null && !usdError && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("microsip.usd.click-hint")}
                </p>
              )}

              {usdProducts !== null && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {(usdProducts.length !== 1 ? t("microsip.usd.count-plural") : t("microsip.usd.count-singular")).replace("{count}", String(usdProducts.length))}
                    {usdProducts.length === 0 ? t("microsip.usd.none-suffix") : ""}
                  </p>
                  {usdProducts.length > 0 && (
                    <ScrollArea className="h-[320px] border rounded-lg">
                      <table className="w-full text-sm" data-testid="table-usd-products">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium border-b">{t("microsip.col.key")}</th>
                            <th className="px-3 py-2 text-left font-medium border-b">{t("label.name")}</th>
                            <th className="px-3 py-2 text-center font-medium border-b w-[90px]">MONEDA_ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usdProducts.map((p, i) => (
                            <tr key={i} className="border-b hover:bg-muted/50">
                              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                                {p.CLAVE_ARTICULO ?? "—"}
                              </td>
                              <td className="px-3 py-2">{p.NOMBRE}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {p.MONEDA_ID}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                {t("microsip.sql.title")}
              </CardTitle>
              <CardDescription>
                {t("microsip.sql.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sql-query">{t("microsip.sql.query-label")}</Label>
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
                  {t("microsip.sql.run")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("microsip.sql.hint")}
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
                    {t("microsip.rows-found").replace("{count}", String(queryResult.rowCount))}
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
