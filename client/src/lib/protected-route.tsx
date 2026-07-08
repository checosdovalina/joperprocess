import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole } from "@shared/schema";

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles,
}: {
  path: string;
  component: () => React.JSX.Element | null;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(user.role);
    if (!hasAccess) {
      return (
        <Route path={path}>
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
              <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
              <a href="/" className="text-primary hover:underline">Volver al inicio</a>
            </div>
          </div>
        </Route>
      );
    }
  }

  return <Route path={path} component={Component} />;
}
