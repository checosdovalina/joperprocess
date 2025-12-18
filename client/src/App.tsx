import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
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
import PaymentsPage from "@/pages/payments-page";
import UsersPage from "@/pages/users-page";
import ProductsPage from "@/pages/products-page";
import IncidentsPage from "@/pages/incidents-page";
import IncidentDetailPage from "@/pages/incident-detail-page";
import PublicQuotationApproval from "@/pages/public-quotation-approval";
import PublicIncidentPortal from "@/pages/public-incident-portal";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/checkins/:id" component={CheckinDetailPage} />
      <ProtectedRoute path="/checkins" component={CheckinsPage} />
      <ProtectedRoute path="/scheduled-visits" component={ScheduledVisitsPage} />
      <ProtectedRoute path="/quotations" component={QuotationsPage} />
      <ProtectedRoute path="/credit-auth" component={CreditAuthPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/shipments" component={ShipmentsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/accounts-receivable" component={AccountsReceivablePage} />
      <ProtectedRoute path="/payments" component={PaymentsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/products" component={ProductsPage} />
      <ProtectedRoute path="/incidents/:id" component={IncidentDetailPage} />
      <ProtectedRoute path="/incidents" component={IncidentsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center h-14 px-4 border-b bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
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
  const [isQuotationApproval] = useRoute("/aprobar-cotizacion/:token");
  const [isIncidentPortal] = useRoute("/public/incidents/:token");
  const isPublicRoute = isQuotationApproval || isIncidentPortal;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {isPublicRoute ? (
            <Switch>
              <Route path="/aprobar-cotizacion/:token" component={PublicQuotationApproval} />
              <Route path="/public/incidents/:token" component={PublicIncidentPortal} />
            </Switch>
          ) : (
            <MainLayout />
          )}
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
