import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Redirect, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { UserRole } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";

export default function AuthPage() {
  const { t } = useI18n();
  const { user, loginMutation, registerMutation } = useAuth();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab");
  
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "vendedor" as string,
  });

  const { data: registrationStatus } = useQuery<{ allowed: boolean }>({
    queryKey: ["/api/allow-registration"],
  });

  const allowRegistration = registrationStatus?.allowed ?? false;
  
  const [activeTab, setActiveTab] = useState("login");
  
  useEffect(() => {
    if (tabFromUrl === "register" && allowRegistration) {
      setActiveTab("register");
    } else {
      setActiveTab("login");
    }
  }, [tabFromUrl, allowRegistration]);

  if (user) {
    return <Redirect to="/dashboard" />;
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
    { value: UserRole.VENDEDOR, labelKey: "role.vendedor" },
    { value: UserRole.CREDITO_COBRANZA, labelKey: "role.credito_cobranza" },
    { value: UserRole.VENTAS_LOGISTICA, labelKey: "role.ventas_logistica" },
    { value: UserRole.FABRICA, labelKey: "role.fabrica" },
    { value: UserRole.EMBARQUES, labelKey: "role.embarques" },
    { value: UserRole.FACTURACION, labelKey: "role.facturacion" },
    { value: UserRole.ADMIN, labelKey: "role.admin" },
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("auth.back-home")}
          </Link>
          
          <div className="flex items-center gap-3 mb-8">
            <img src={nexxoLogo} alt="Nexxo" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-primary">NEXXO</h1>
              <p className="text-sm text-muted-foreground">{t("auth.system-name")}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {allowRegistration ? (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">{t("auth.register-tab")}</TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="login" data-testid="tab-login">{t("auth.login")}</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{t("auth.login")}</CardTitle>
                  <CardDescription>
                    {t("auth.login-desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">{t("label.user")}</Label>
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
                      <Label htmlFor="login-password">{t("auth.password")}</Label>
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
                          {t("auth.logging-in")}
                        </>
                      ) : (
                        t("auth.login")
                      )}
                    </Button>
                    <div className="text-center mt-4">
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        {t("auth.forgot-password")}
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {allowRegistration && (
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("auth.create-account")}</CardTitle>
                    <CardDescription>
                      {t("auth.register-desc")}
                    </CardDescription>
                  </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-fullName">{t("auth.full-name")}</Label>
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
                      <Label htmlFor="register-email">{t("auth.email")}</Label>
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
                      <Label htmlFor="register-username">{t("label.user")}</Label>
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
                      <Label htmlFor="register-password">{t("auth.password")}</Label>
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
                      <Label htmlFor="register-role">{t("label.role")}</Label>
                      <Select
                        value={registerData.role}
                        onValueChange={(value) =>
                          setRegisterData({ ...registerData, role: value })
                        }
                      >
                        <SelectTrigger id="register-role" data-testid="select-register-role">
                          <SelectValue placeholder={t("auth.select-role")} />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
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
                          {t("auth.registering")}
                        </>
                      ) : (
                        t("auth.create-account")
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
          <div className="flex items-center gap-4 mb-4">
            <img src={nexxoLogo} alt="Nexxo" className="h-16 w-16" />
            <h2 className="text-4xl font-bold">NEXXO</h2>
          </div>
          <p className="text-lg text-white/90">
            {t("auth.hero-desc")}
          </p>
          <ul className="space-y-3 text-white/80">
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5 flex-shrink-0 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t("auth.feature-1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5 flex-shrink-0 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t("auth.feature-2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5 flex-shrink-0 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t("auth.feature-3")}</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5 flex-shrink-0 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{t("auth.feature-4")}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
