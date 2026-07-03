import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";

export default function ResetPasswordPage() {
  const { t } = useI18n();
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
      if (!token) return { valid: false, error: t("auth.token-not-provided") };
      const res = await fetch(`/api/verify-reset-token?token=${encodeURIComponent(token)}`);
      return res.json();
    },
    enabled: !!token,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: t("label.error"),
        description: t("auth.complete-fields"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("label.error"),
        description: t("auth.passwords-no-match"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t("label.error"),
        description: t("auth.password-min"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/reset-password", { token, newPassword });
      setIsSuccess(true);
      toast({
        title: t("auth.password-updated"),
        description: t("auth.password-updated-desc"),
      });
    } catch (error: any) {
      toast({
        title: t("label.error"),
        description: error.message || t("auth.reset-error"),
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
                <h3 className="text-lg font-semibold mb-2">{t("auth.invalid-link")}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t("auth.invalid-link-desc")}
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">
                    {t("auth.request-new-link")}
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
          <p className="mt-4 text-muted-foreground">{t("auth.verifying-link")}</p>
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
                <h3 className="text-lg font-semibold mb-2">{t("auth.expired-link")}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {tokenStatus?.error || t("auth.expired-link-desc")}
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">
                    {t("auth.request-new-link")}
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
          {t("auth.back-to-login")}
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <img src={nexxoLogo} alt="Nexxo" className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-bold text-primary">NEXXO</h1>
            <p className="text-sm text-muted-foreground">{t("auth.system-name")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t("auth.new-password-title")}
            </CardTitle>
            <CardDescription>
              {t("auth.new-password-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("auth.password-updated-title")}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t("auth.password-updated-full")}
                </p>
                <Link href="/auth">
                  <Button className="w-full">
                    {t("auth.go-to-login")}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("auth.new-password")}</Label>
                  <Input
                    id="newPassword"
                    data-testid="input-new-password"
                    type="password"
                    placeholder={t("auth.min-6-chars")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirm-password")}</Label>
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder={t("auth.repeat-password")}
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
                      {t("auth.updating")}
                    </>
                  ) : (
                    t("auth.reset-password-btn")
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
