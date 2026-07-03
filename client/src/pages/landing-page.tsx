import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  CreditCard, 
  Truck, 
  BarChart3, 
  Shield, 
  Zap, 
  Globe,
  ArrowRight,
  CheckCircle2,
  Building2
} from "lucide-react";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";
import { useTenant } from "@/hooks/use-tenant";
import { useI18n } from "@/hooks/use-i18n";

export default function LandingPage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { t } = useI18n();
  
  const isSubdomain = tenant && tenant.subdomain && tenant.subdomain !== "main";
  const displayName = isSubdomain ? tenant.name : "NEXXO";
  const hasCustomLogo = isSubdomain && tenant?.logoUrl && tenant.logoUrl.trim() !== "";
  const displayLogo = hasCustomLogo ? tenant.logoUrl : (isSubdomain ? null : nexxoLogo);
  const tagline = isSubdomain ? `${t("landing.welcome-to")} ${tenant.name}` : t("landing.tagline-default");
  const features = [
    {
      icon: Users,
      titleKey: "landing.feature-customers.title",
      descKey: "landing.feature-customers.desc"
    },
    {
      icon: FileText,
      titleKey: "landing.feature-quotations.title",
      descKey: "landing.feature-quotations.desc"
    },
    {
      icon: CreditCard,
      titleKey: "landing.feature-credit.title",
      descKey: "landing.feature-credit.desc"
    },
    {
      icon: Truck,
      titleKey: "landing.feature-shipments.title",
      descKey: "landing.feature-shipments.desc"
    },
    {
      icon: BarChart3,
      titleKey: "landing.feature-billing.title",
      descKey: "landing.feature-billing.desc"
    },
    {
      icon: Shield,
      titleKey: "landing.feature-incidents.title",
      descKey: "landing.feature-incidents.desc"
    }
  ];

  const benefits = [
    "landing.benefit-1",
    "landing.benefit-2",
    "landing.benefit-3",
    "landing.benefit-4",
    "landing.benefit-5",
    "landing.benefit-6"
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} className="h-10 w-10 object-contain" />
            ) : (
              <Building2 className="h-10 w-10 text-primary" />
            )}
            <span className="text-2xl font-bold text-primary">
              {displayName}
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost" data-testid="link-login">
                {t("auth.login")}
              </Button>
            </Link>
            <Link href="/auth?tab=register">
              <Button className="bg-primary hover:bg-primary/90" data-testid="link-register">
                {t("landing.get-started")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="h-4 w-4" />
              {tagline}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {isSubdomain ? (
                <>
                  {t("landing.portal-of")}{" "}
                  <span className="text-primary">{tenant?.name}</span>
                </>
              ) : (
                <>
                  {t("landing.hero-title-1")}{" "}
                  <span className="text-primary">{t("landing.hero-title-2")}</span>
                </>
              )}
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {isSubdomain ? (
                t("landing.hero-desc-subdomain")
              ) : (
                t("landing.hero-desc-default")
              )}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={isSubdomain ? "/auth?tab=register" : "/registro"}>
                <Button size="lg" className="text-lg px-8" data-testid="button-hero-start">
                  {t("landing.start-now")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {isSubdomain && (
                <Link href="/soporte">
                  <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-hero-support">
                    {t("landing.support-portal")}
                    <Globe className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("landing.features-title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("landing.features-subtitle")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate transition-all duration-300">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t("landing.productivity-title")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t("landing.productivity-desc")}
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{t(benefit)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-primary p-1">
                <div className="h-full w-full rounded-xl bg-background flex items-center justify-center">
                  <img src={nexxoLogo} alt="Nexxo" className="w-48 h-48 opacity-80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing.cta-title")}
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t("landing.cta-subtitle")}
          </p>
          <Link href="/auth?tab=register">
            <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-start">
              {t("landing.start-free")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={nexxoLogo} alt="Nexxo" className="h-8 w-8" />
              <span className="text-xl font-bold">NEXXO</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Nexxo. {t("landing.footer-tagline")}
            </p>
            <div className="flex items-center gap-4">
              {isSubdomain && (
                <Link href="/soporte" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("landing.support")}
                </Link>
              )}
              <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.access")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
