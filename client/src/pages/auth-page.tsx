import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2 } from "lucide-react";
import { UserRole } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "vendedor" as string,
  });

  // Check if public registration is allowed (only for first user)
  const { data: registrationStatus } = useQuery<{ allowed: boolean }>({
    queryKey: ["/api/allow-registration"],
  });

  const allowRegistration = registrationStatus?.allowed ?? false;

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      ...registerData,
      active: true,
    });
  };

  const roleOptions = [
    { value: UserRole.VENDEDOR, label: "Vendedor" },
    { value: UserRole.CREDITO_COBRANZA, label: "Crédito y Cobranza" },
    { value: UserRole.VENTAS_LOGISTICA, label: "Ventas/Logística" },
    { value: UserRole.FABRICA, label: "Fábrica" },
    { value: UserRole.EMBARQUES, label: "Embarques" },
    { value: UserRole.FACTURACION, label: "Facturación" },
    { value: UserRole.ADMIN, label: "Administrador" },
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GRUPO JOPER</h1>
              <p className="text-sm text-muted-foreground">Sistema Comercial</p>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            {allowRegistration ? (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Registro</TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="login" data-testid="tab-login">Iniciar Sesión</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder al sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Usuario</Label>
                      <Input
                        id="login-username"
                        data-testid="input-login-username"
                        type="text"
                        value={loginData.username}
                        onChange={(e) =>
                          setLoginData({ ...loginData, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        "Iniciar Sesión"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {allowRegistration && (
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Crear Cuenta</CardTitle>
                    <CardDescription>
                      Configuración inicial del sistema - Crear primer usuario administrador
                    </CardDescription>
                  </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-fullName">Nombre Completo</Label>
                      <Input
                        id="register-fullName"
                        data-testid="input-register-fullname"
                        type="text"
                        value={registerData.fullName}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, fullName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo Electrónico</Label>
                      <Input
                        id="register-email"
                        data-testid="input-register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Usuario</Label>
                      <Input
                        id="register-username"
                        data-testid="input-register-username"
                        type="text"
                        value={registerData.username}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        data-testid="input-register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-role">Rol</Label>
                      <Select
                        value={registerData.role}
                        onValueChange={(value) =>
                          setRegisterData({ ...registerData, role: value })
                        }
                      >
                        <SelectTrigger id="register-role" data-testid="select-register-role">
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        "Crear Cuenta"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center p-8 bg-primary text-primary-foreground">
        <div className="max-w-lg space-y-6">
          <h2 className="text-4xl font-bold">
            Gestión Comercial Integral
          </h2>
          <p className="text-lg text-primary-foreground/90">
            Sistema completo para gestionar todo el proceso comercial de GRUPO JOPER,
            desde el check-in del vendedor hasta la facturación y cobranza.
          </p>
          <ul className="space-y-3 text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                ✓
              </div>
              <span>Cotizaciones y seguimiento de pedidos en tiempo real</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                ✓
              </div>
              <span>Autorización de crédito y control de morosidad automatizado</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                ✓
              </div>
              <span>Embarques con firmas digitales y trazabilidad completa</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                ✓
              </div>
              <span>Facturación CFDI y cobranza con estados de cuenta automáticos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
