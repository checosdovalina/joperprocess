import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
} from "lucide-react";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";

const registrationSchema = z.object({
  companyName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  contactEmail: z.string().trim().email(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface RegistrationSuccess {
  message: string;
  companyName: string;
  subdomain: string;
  portalUrl: string;
  emailSentTo: string;
}

export default function CompanyRegistrationPage() {
  const { t } = useI18n();
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const validationSchema = z.object({
    companyName: z.string().trim().min(2, t("registration.validation.company-name-required")),
    phone: z.string().trim().min(7, t("registration.validation.phone-required")),
    contactEmail: z.string().trim().email(t("registration.validation.email-invalid")),
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      companyName: "",
      phone: "",
      contactEmail: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const res = await apiRequest("POST", "/api/register-company", data);
      return (await res.json()) as RegistrationSuccess;
    },
    onSuccess: (data) => {
      setDuplicateWarning(null);
      setSuccess(data);
    },
    onError: async (error: any) => {
      let message = t("registration.generic-error");
      try {
        const parsed = JSON.parse(error.message.replace(/^\d+:\s*/, ""));
        if (parsed?.error) message = parsed.error;
      } catch {
        if (error?.message) message = error.message.replace(/^\d+:\s*/, "");
      }
      setDuplicateWarning(message);
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    setDuplicateWarning(null);
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src={nexxoLogo} alt="Nexxo" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-primary">NEXXO</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" data-testid="link-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("registration.back")}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {success ? (
            <Card data-testid="card-registration-success">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl">{t("registration.success-title")}</CardTitle>
                <CardDescription>
                  {t("registration.portal-created-prefix")}<strong>{success.companyName}</strong>{t("registration.portal-created-suffix")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>{t("registration.check-email")}</AlertTitle>
                  <AlertDescription>
                    {t("registration.email-sent-prefix")}
                    <strong data-testid="text-email-sent">{success.emailSentTo}</strong>.
                  </AlertDescription>
                </Alert>

                <div className="rounded-md border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">{t("registration.portal-address")}</p>
                  <p
                    className="text-lg font-semibold text-primary break-all"
                    data-testid="text-portal-url"
                  >
                    {success.portalUrl}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  {t("registration.spam-hint")}
                </p>

                <Link href="/">
                  <Button className="w-full" data-testid="button-go-home">
                    {t("registration.go-home")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="card-registration-form">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t("registration.title")}</CardTitle>
                <CardDescription>
                  {t("registration.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {duplicateWarning && (
                  <Alert variant="destructive" className="mb-6" data-testid="alert-duplicate-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t("registration.cannot-register")}</AlertTitle>
                    <AlertDescription>{duplicateWarning}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("registration.field.company-name")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("registration.ph.company-name")}
                              data-testid="input-company-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("registration.field.phone")}</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder={t("registration.ph.phone")}
                              data-testid="input-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("registration.field.email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="contacto@tuempresa.com"
                              data-testid="input-contact-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={mutation.isPending}
                      data-testid="button-submit-registration"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("registration.submitting")}
                        </>
                      ) : (
                        <>
                          {t("registration.submit")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
