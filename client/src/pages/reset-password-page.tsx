import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";

export default function ResetPasswordPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get("token");
  const [, setLocation] = useLocation();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const { data: tokenStatus, isLoading: isVerifying } = useQuery<{ valid: boolean; error?: string }>({
    queryKey: ["/api/verify-reset-token", token],
    queryFn: async () => {
      if (!token) return { valid: false, error: "Token no proporcionado" };
      const res = await fetch(`/api/verify-reset-token?token=${encodeURIComponent(token)}`);
      return res.json();
    },
    enabled: !!token,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/reset-password", { token, newPassword });
      setIsSuccess(true);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido restablecida exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al restablecer la contraseña",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Enlace inválido</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  El enlace de recuperación no es válido. Por favor solicita uno nuevo.
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">
                    Solicitar nuevo enlace
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (!tokenStatus?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Enlace expirado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {tokenStatus?.error || "El enlace ha expirado o ya fue utilizado. Por favor solicita uno nuevo."}
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">
                    Solicitar nuevo enlace
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <Link href="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver a iniciar sesión
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <img src={nexxoLogo} alt="Nexxo" className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-bold text-primary">NEXXO</h1>
            <p className="text-sm text-muted-foreground">Sistema Comercial</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Nueva Contraseña
            </CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">¡Contraseña actualizada!</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <Link href="/auth">
                  <Button className="w-full">
                    Ir a iniciar sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    data-testid="input-new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-reset-submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Restablecer Contraseña"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
