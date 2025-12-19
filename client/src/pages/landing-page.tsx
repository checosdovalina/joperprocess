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
  CheckCircle2
} from "lucide-react";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";

export default function LandingPage() {
  const features = [
    {
      icon: Users,
      title: "Gestión de Clientes",
      description: "Control completo de tu cartera de clientes con historial de visitas, créditos y transacciones."
    },
    {
      icon: FileText,
      title: "Cotizaciones Inteligentes",
      description: "Crea cotizaciones con precios dinámicos, descuentos y aprobaciones automatizadas."
    },
    {
      icon: CreditCard,
      title: "Autorización de Crédito",
      description: "Análisis automático y asistido por IA para decisiones de crédito más precisas."
    },
    {
      icon: Truck,
      title: "Control de Embarques",
      description: "Seguimiento de envíos con números de serie, firmas digitales y trazabilidad completa."
    },
    {
      icon: BarChart3,
      title: "Facturación y Cobranza",
      description: "Gestión de facturas, pagos y cuentas por cobrar con estados de cuenta automáticos."
    },
    {
      icon: Shield,
      title: "Gestión de Incidencias",
      description: "Portal de soporte para clientes con seguimiento de tickets y adjuntos de evidencia."
    }
  ];

  const benefits = [
    "Automatiza tu proceso comercial completo",
    "Reduce tiempos de respuesta hasta un 70%",
    "Visibilidad en tiempo real de todas las operaciones",
    "Acceso móvil optimizado para vendedores en campo",
    "Reportes y análisis para mejores decisiones",
    "Integración con sistemas de facturación CFDI"
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={nexxoLogo} alt="Nexxo" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              NEXXO
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost" data-testid="link-login">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth?tab=register">
              <Button data-testid="link-register">
                Comenzar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="h-4 w-4" />
              Sistema Comercial de Nueva Generación
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Gestiona todo tu proceso comercial en{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                un solo lugar
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nexxo es la plataforma integral que conecta ventas, crédito, producción, 
              embarques y facturación. Diseñada para empresas que buscan 
              eficiencia y control total.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?tab=register">
                <Button size="lg" className="text-lg px-8" data-testid="button-hero-start">
                  Comenzar Ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/soporte">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-hero-support">
                  Portal de Soporte
                  <Globe className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para tu operación comercial
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Módulos integrados que trabajan juntos para optimizar cada etapa de tu proceso de ventas
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate transition-all duration-300">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
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
                Impulsa la productividad de tu equipo comercial
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Con Nexxo, tu equipo puede enfocarse en vender mientras el sistema 
                automatiza las tareas administrativas y mantiene todo sincronizado.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-1">
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
            Listo para transformar tu operación comercial?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Únete a las empresas que ya están optimizando sus procesos con Nexxo
          </p>
          <Link href="/auth?tab=register">
            <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-start">
              Comenzar Gratis
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
              © {new Date().getFullYear()} Nexxo. Sistema Comercial Integral.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/soporte" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Soporte
              </Link>
              <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Acceder
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
