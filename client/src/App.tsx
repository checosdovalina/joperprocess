import { Switch, Route, useRoute, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Component, ReactNode } from "react";

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-destructive">{t("error.unexpected")}</h2>
      <p className="text-muted-foreground text-sm max-w-md">{error?.message}</p>
      <button
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        onClick={onReset}
        data-testid="button-back-dashboard"
      >
        {t("error.back-dashboard")}
      </button>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => { this.setState({ hasError: false, error: null }); window.location.href = "/dashboard"; }}
        />
      );
    }
    return this.props.children;
  }
}
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import { useAuth } from "./hooks/use-auth";
import { Loader2, Moon, Sun } from "lucide-react";
import { TenantProvider } from "./hooks/use-tenant";
import { ThemeProvider, useTheme } from "./hooks/use-theme";
import CustomersPage from "@/pages/customers-page";
import CheckinsPage from "@/pages/checkins-page";
import CheckinDetailPage from "@/pages/checkin-detail-page";
import ScheduledVisitsPage from "@/pages/scheduled-visits-page";
import QuotationsPage from "@/pages/quotations-page";
import CreditAuthPage from "@/pages/credit-auth-page";
import OrdersPage from "@/pages/orders-page";
import ShipmentsPage from "@/pages/shipments-page";
import InvoicesPage from "@/pages/invoices-page";
import AccountsReceivablePage from "@/pages/accounts-receivable-page";
import AccountStatementsPage from "@/pages/account-statements-page";
import PaymentsPage from "@/pages/payments-page";
import UsersPage from "@/pages/users-page";
import ProductsPage from "@/pages/products-page";
import DocumentsPage from "@/pages/documents-page";
import SystemLogsPage from "@/pages/system-logs-page";
import IncidentsPage from "@/pages/incidents-page";
import CompanySettingsPage from "@/pages/company-settings-page";
import MicrosipSettingsPage from "@/pages/microsip-settings-page";
import IncidentDetailPage from "@/pages/incident-detail-page";
import PublicQuotationApproval from "@/pages/public-quotation-approval";
import PublicShippingApprovalPage from "@/pages/public-shipping-approval";
import PublicAccountStatementPage from "@/pages/public-account-statement-page";
import PublicIncidentPortal from "@/pages/public-incident-portal";
import PublicSupportPage from "@/pages/public-support-page";
import CompanyRegistrationPage from "@/pages/company-registration-page";
import PublicTicketPage from "@/pages/public-ticket-page";
import TenantsPage from "@/pages/tenants-page";
import EmpresasPage from "@/pages/empresas-page";
import CompaniesPage from "@/pages/companies-page";
import ProductionPage from "@/pages/production-page";
import ReportsPage from "@/pages/reports-page";
import OrderReleasePage from "@/pages/order-release-page";
import ProductionBoardPage from "@/pages/production-board-page";
import PipelinePage from "@/pages/pipeline-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { UserRole } from "@shared/schema";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

const PAGE_TITLE_KEYS: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/customers": "nav.customers",
  "/checkins": "nav.checkins",
  "/scheduled-visits": "nav.scheduled-visits",
  "/quotations": "nav.quotations",
  "/credit-auth": "nav.credit-auth",
  "/orders": "nav.orders",
  "/production": "nav.production",
  "/board": "nav.board",
  "/pipeline": "nav.pipeline",
  "/order-release": "nav.order-release",
  "/shipments": "nav.shipments",
  "/accounts-receivable": "nav.accounts-receivable",
  "/account-statements": "nav.account-statements",
  "/payments": "nav.payments",
  "/reports": "nav.reports",
  "/incidents": "nav.incidents",
  "/products": "nav.products",
  "/documents": "nav.documents",
  "/users": "nav.users",
  "/company-settings": "nav.company-settings",
  "/microsip": "nav.microsip",
  "/tenants": "nav.tenants",
  "/empresas": "nav.empresas",
  "/companies": "nav.companies",
};

function getPageTitle(location: string, t: (key: string) => string): string {
  if (location.startsWith("/checkins/")) return t("nav.checkin-detail");
  if (location.startsWith("/incidents/")) return t("nav.incident-detail");
  const key = PAGE_TITLE_KEYS[location];
  return key ? t(key) : "Nexxo";
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      aria-label="Cambiar tema"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function SmartLandingPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/checkins/:id" component={CheckinDetailPage} />
      <ProtectedRoute path="/checkins" component={CheckinsPage} />
      <ProtectedRoute path="/scheduled-visits" component={ScheduledVisitsPage} />
      <ProtectedRoute path="/quotations" component={QuotationsPage} />
      <ProtectedRoute path="/credit-auth" component={CreditAuthPage} />
      <ProtectedRoute path="/order-release" component={OrderReleasePage} allowedRoles={[UserRole.ADMIN]} />
      <ProtectedRoute path="/orders" component={OrdersPage} allowedRoles={[UserRole.ADMIN, UserRole.VENTAS_LOGISTICA]} />
      <ProtectedRoute path="/production" component={ProductionPage} allowedRoles={[UserRole.ADMIN, UserRole.FABRICA]} />
      <ProtectedRoute path="/shipments" component={ShipmentsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/accounts-receivable" component={AccountsReceivablePage} />
      <ProtectedRoute path="/account-statements" component={AccountStatementsPage} allowedRoles={[UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION]} />
      <ProtectedRoute path="/payments" component={PaymentsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/products" component={ProductsPage} />
      <ProtectedRoute path="/documents" component={DocumentsPage} />
      <ProtectedRoute path="/system-logs" component={SystemLogsPage} allowedRoles={[UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION]} />
      <ProtectedRoute path="/incidents/:id" component={IncidentDetailPage} />
      <ProtectedRoute path="/incidents" component={IncidentsPage} />
      <ProtectedRoute path="/company-settings" component={CompanySettingsPage} />
      <ProtectedRoute path="/microsip" component={MicrosipSettingsPage} />
      <ProtectedRoute path="/pipeline" component={PipelinePage} allowedRoles={[UserRole.ADMIN, UserRole.VENTAS_LOGISTICA]} />
      <ProtectedRoute path="/reports" component={ReportsPage} allowedRoles={[UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA]} />
      <ProtectedRoute path="/tenants" component={TenantsPage} />
      <ProtectedRoute path="/empresas" component={EmpresasPage} allowedRoles={[UserRole.ADMIN]} requireSuperAdmin />
      <ProtectedRoute path="/companies" component={CompaniesPage} allowedRoles={[UserRole.ADMIN]} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout() {
  const [location] = useLocation();
  const { t } = useI18n();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const pageTitle = getPageTitle(location, t);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-5 w-px bg-border" />
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  const [isLandingPage] = useRoute("/");
  const [isAuthPage] = useRoute("/auth");
  const [isForgotPassword] = useRoute("/forgot-password");
  const [isResetPassword] = useRoute("/reset-password");
  const [isQuotationApproval] = useRoute("/aprobar-cotizacion/:token");
  const [isShippingApproval] = useRoute("/autorizar-envio/:token");
  const [isIncidentPortal] = useRoute("/public/incidents/:token");
  const [isSupportPage] = useRoute("/soporte");
  const [isTicketPage] = useRoute("/soporte/ticket/:token");
  const [isRegisterCompany] = useRoute("/registro");
  const [isBoardRoute] = useRoute("/board");
  const [isPipelineTvRoute] = useRoute("/pipeline-tv");
  const isPublicRoute = isLandingPage || isAuthPage || isForgotPassword || isResetPassword || isQuotationApproval || isShippingApproval || isIncidentPortal || isSupportPage || isTicketPage || isRegisterCompany;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <AuthProvider>
            <TooltipProvider>
              <ErrorBoundary>
              {isPublicRoute ? (
                <Switch>
                  <Route path="/" component={SmartLandingPage} />
                  <Route path="/auth" component={AuthPage} />
                  <Route path="/forgot-password" component={ForgotPasswordPage} />
                  <Route path="/reset-password" component={ResetPasswordPage} />
                  <Route path="/aprobar-cotizacion/:token" component={PublicQuotationApproval} />
                  <Route path="/autorizar-envio/:token" component={PublicShippingApprovalPage} />
                  <Route path="/estado-cuenta/:token" component={PublicAccountStatementPage} />
                  <Route path="/public/incidents/:token" component={PublicIncidentPortal} />
                  <Route path="/soporte/ticket/:token" component={PublicTicketPage} />
                  <Route path="/soporte" component={PublicSupportPage} />
                  <Route path="/registro" component={CompanyRegistrationPage} />
                </Switch>
              ) : isBoardRoute ? (
                <ProtectedRoute path="/board" component={ProductionBoardPage} />
              ) : isPipelineTvRoute ? (
                <ProtectedRoute path="/pipeline-tv" component={PipelinePage} allowedRoles={[UserRole.ADMIN, UserRole.VENTAS_LOGISTICA]} />
              ) : (
                <MainLayout />
              )}
              </ErrorBoundary>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
