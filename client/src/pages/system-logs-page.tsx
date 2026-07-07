import { Fragment, useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Mail,
  Database,
  Settings,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface LogEntry {
  id: string;
  source: "system" | "microsip";
  category: string;
  level: "info" | "warning" | "error";
  action: string | null;
  message: string;
  details: unknown;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  account_statement: "Estados de Cuenta",
  microsip_sync: "Sincronización Microsip",
  system: "Sistema",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  account_statement: Mail,
  microsip_sync: Database,
  system: Settings,
};

const LEVEL_ICONS: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function LevelBadge({ level }: { level: LogEntry["level"] }) {
  const Icon = LEVEL_ICONS[level] ?? Info;
  if (level === "error") {
    return (
      <Badge variant="destructive" className="gap-1" data-testid={`badge-level-${level}`}>
        <Icon className="h-3 w-3" /> Error
      </Badge>
    );
  }
  if (level === "warning") {
    return (
      <Badge
        className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-transparent"
        data-testid={`badge-level-${level}`}
      >
        <Icon className="h-3 w-3" /> Advertencia
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1" data-testid={`badge-level-${level}`}>
      <Icon className="h-3 w-3" /> Info
    </Badge>
  );
}

export default function SystemLogsPage() {
  const { t } = useI18n();
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading, isFetching, refetch } = useQuery<LogEntry[]>({
    queryKey: ["/api/system-logs"],
  });

  const filtered = logs.filter(
    (l) => (category === "all" || l.category === category) && (level === "all" || l.level === level),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              {t("nav.system-logs")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Envíos de estados de cuenta y sincronizaciones con Microsip
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-logs"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56" data-testid="select-category">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="account_statement">Estados de Cuenta</SelectItem>
            <SelectItem value="microsip_sync">Sincronización Microsip</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-level">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="info">Información</SelectItem>
            <SelectItem value="warning">Advertencias</SelectItem>
            <SelectItem value="error">Errores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground" data-testid="text-empty">
              No hay registros para mostrar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-44">Fecha</TableHead>
                  <TableHead className="w-52">Categoría</TableHead>
                  <TableHead className="w-36">Nivel</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const CatIcon = CATEGORY_ICONS[log.category] ?? Settings;
                  const isOpen = expanded.has(log.id);
                  const hasDetails =
                    log.details != null &&
                    !(typeof log.details === "object" && Object.keys(log.details as object).length === 0);
                  return (
                    <Fragment key={log.id}>
                      <TableRow
                        className={hasDetails ? "cursor-pointer" : ""}
                        onClick={() => hasDetails && toggle(log.id)}
                        data-testid={`row-log-${log.id}`}
                      >
                        <TableCell>
                          {hasDetails ? (
                            isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-sm">
                            <CatIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            {CATEGORY_LABELS[log.category] ?? log.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <LevelBadge level={log.level} />
                        </TableCell>
                        <TableCell className="text-sm">{log.message}</TableCell>
                      </TableRow>
                      {isOpen && hasDetails && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={4}>
                            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
