"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  ChevronDown,
  Receipt,
  CalendarCheck,
  ChefHat,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { HabitaLogo } from "@/components/ui/habita-logo";

export function LandingContent() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center sm:min-h-[65vh] sm:py-20">
          <div className="mb-6">
            <HabitaLogo size={96} className="rounded-2xl" />
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground sm:mb-4 sm:text-5xl lg:text-6xl">
            Tu hogar, coordinado
          </h1>
          <p className="mb-6 max-w-2xl text-base text-muted-foreground sm:mb-8 sm:text-lg lg:text-xl">
            Tareas, gastos, compras, recetas y salidas: todo lo que tu casa
            necesita, en un solo lugar. Gratis y automático.
          </p>
          <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login">
                Comenzar gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <h2 className="mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
              Todo lo que tu hogar necesita
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                index={0}
                icon={<CalendarCheck className="h-7 w-7" />}
                title="Semanas que se organizan solas"
                description="Habita arma el plan semanal, distribuye tareas y rota responsabilidades. Vos solo aprobás."
                bg="bg-brand-lavender-light/50"
                iconBg="bg-brand-lavender"
              />
              <FeatureCard
                index={1}
                icon={<Receipt className="h-7 w-7" />}
                title="Cuentas claras, convivencia sana"
                description="Registrá gastos compartidos, llevá los balances al día y liquidá deudas entre miembros en un toque."
                bg="bg-brand-lime/50"
                iconBg="bg-brand-lime"
              />
              <FeatureCard
                index={2}
                icon={<ShoppingCart className="h-7 w-7" />}
                title="Comprá mejor, gastá menos"
                description="Compará precios entre supermercados, armá tu carrito inteligente y aprovechá las mejores ofertas y promos bancarias."
                bg="bg-brand-cream/60"
                iconBg="bg-brand-tan"
              />
              <FeatureCard
                index={3}
                icon={<MapPin className="h-7 w-7" />}
                title="Planes para disfrutar juntos"
                description="Eventos, restaurantes y actividades culturales cerca tuyo, actualizados automáticamente para tu ciudad."
                bg="bg-brand-lavender-light/40"
                iconBg="bg-brand-lavender-light"
              />
              <FeatureCard
                index={4}
                icon={<ChefHat className="h-7 w-7" />}
                title="De la heladera a la mesa"
                description="Sacale una foto a lo que tenés o contale qué hay en tu heladera. En segundos tenés recetas concretas para cocinar hoy."
                bg="bg-brand-cream/40"
                iconBg="bg-brand-cream"
              />
              <FeatureCard
                index={5}
                icon={<LayoutDashboard className="h-7 w-7" />}
                title="Todo tu hogar en un vistazo"
                description="Un dashboard con tareas del día, gastos pendientes, briefing diario y notificaciones. Sin saltar entre apps."
                bg="bg-brand-lime/40"
                iconBg="bg-brand-lime"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* How it works */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <h2 className="mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
              Empezá en 3 pasos
            </h2>
            <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
              {/* Dotted connector line (desktop only) */}
              <div className="absolute left-[16.67%] right-[16.67%] top-10 hidden border-t-2 border-dashed border-brand-lavender/50 sm:block" />

              <StepCard
                index={0}
                number={1}
                icon={<UserPlus className="h-6 w-6" />}
                title="Creá tu hogar"
                description="Registrate gratis con Google e invitá a los que viven con vos."
                bg="bg-brand-lavender-light"
              />
              <StepCard
                index={1}
                number={2}
                icon={<ClipboardList className="h-6 w-6" />}
                title="Configurá lo que necesites"
                description="Agregá tareas, registrá gastos, armá tu lista de compras. Usá lo que te sirva."
                bg="bg-brand-lime"
              />
              <StepCard
                index={2}
                number={3}
                icon={<Sparkles className="h-6 w-6" />}
                title="Habita coordina todo"
                description="Planes semanales, comparación de precios, recetas y sugerencias de salidas. Habita se encarga."
                bg="bg-brand-cream"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Automation Section */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-lavender-light px-4 py-2 text-sm font-semibold text-brand-purple-dark">
                  <Sparkles className="h-4 w-4" />
                  Coordinación automática
                </div>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                  Tu casa se organiza sola
                </h2>
                <p className="mb-6 text-muted-foreground sm:text-lg">
                  Habita te ahorra tiempo y decisiones: planifica la
                  semana, sugiere recetas, encuentra ofertas y te recomienda
                  planes para salir.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Planes semanales con tareas distribuidas en segundos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Foto de la heladera → recetas listas para cocinar</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Comparación de precios entre supermercados con un clic</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Eventos y actividades actualizados para tu ciudad</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-brand-lavender-light/40 p-6 sm:p-8">
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream">
                        <span className="text-xl">📸</span>
                      </div>
                      <div>
                        <p className="font-medium">&ldquo;Tengo pollo, arroz y pimientos&rdquo;</p>
                        <p className="text-sm text-muted-foreground">
                          3 recetas listas en segundos
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lime">
                        <span className="text-xl">🛒</span>
                      </div>
                      <div>
                        <p className="font-medium">&ldquo;Lista del super para 4 personas&rdquo;</p>
                        <p className="text-sm text-muted-foreground">
                          Comparamos 6 supermercados, ahorrás hasta 30%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lavender">
                        <span className="text-xl">📋</span>
                      </div>
                      <div>
                        <p className="font-medium">Plan semanal generado</p>
                        <p className="text-sm text-muted-foreground">
                          12 tareas distribuidas entre 4 miembros
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Testimonials */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <h2 className="mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
              Por qué les encanta
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <TestimonialCard
                index={0}
                quote="Desde que usamos Habita dejamos de discutir por plata. Los gastos se registran y cada uno sabe cuánto debe. Cero drama."
                name="Martín"
                role="Papá de 2"
                emoji="🧔"
                bg="bg-brand-lavender-light/30"
              />
              <TestimonialCard
                index={1}
                quote="La primera vez que armé el carrito y comparé precios me ahorré casi 15 lucas. Ahora no compro sin Habita."
                name="Caro"
                role="Mamá de 3"
                emoji="👩"
                bg="bg-brand-lime/30"
              />
              <TestimonialCard
                index={2}
                quote="Tareas, compras, gastos: todo en un lugar. Con mis roommates funciona bárbaro, cada uno sabe qué le toca."
                name="Nico"
                role="26 años"
                emoji="😎"
                bg="bg-brand-cream/40"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <h2 className="mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
              Preguntas frecuentes
            </h2>
            <div className="mx-auto max-w-2xl">
              <FAQAccordion />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA */}
      <section className="rounded-t-[32px] bg-primary py-12 text-primary-foreground sm:py-20">
        <div className="container px-4 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl">
            Empezá a coordinar tu hogar hoy
          </h2>
          <p className="mb-6 text-base opacity-90 sm:mb-8 sm:text-lg">
            Gratis, en un minuto, y con toda la familia.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="w-full max-w-xs sm:w-auto"
          >
            <Link href="/login">
              Crear mi hogar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-6 text-primary-foreground/70 sm:py-8">
        <div className="container px-4 text-center text-sm">
          <p>Habita — Coordinación integral del hogar</p>
        </div>
      </footer>
    </main>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function FeatureCard({
  index,
  icon,
  title,
  description,
  bg,
  iconBg,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  bg: string;
  iconBg: string;
}) {
  return (
    <div
      className={`animate-stagger-fade-in rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${bg}`}
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="mb-1.5 text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  index,
  number,
  icon,
  title,
  description,
  bg,
}: {
  index: number;
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  bg: string;
}) {
  return (
    <div
      className="animate-stagger-fade-in text-center"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${bg}`}
        >
          {icon}
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </div>
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TestimonialCard({
  index,
  quote,
  name,
  role,
  emoji,
  bg,
}: {
  index: number;
  quote: string;
  name: string;
  role: string;
  emoji: string;
  bg: string;
}) {
  return (
    <div
      className={`animate-stagger-fade-in rounded-2xl p-6 ${bg}`}
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <span className="mb-3 block text-3xl text-muted-foreground/30">
        &ldquo;
      </span>
      <p className="-mt-4 mb-5 text-sm leading-relaxed sm:text-base">
        {quote}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-xl">
          {emoji}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "¿Habita es gratis?",
    answer:
      "Sí, Habita es completamente gratis. No tiene planes pagos ni funciones bloqueadas.",
  },
  {
    question: "¿Qué puedo hacer con Habita?",
    answer:
      "Coordinar tareas del hogar con planes semanales, registrar y dividir gastos compartidos, comparar precios entre supermercados, encontrar recetas con lo que tenés y descubrir actividades para salir. Todo desde una sola app.",
  },
  {
    question: "¿Cómo funciona la asignación automática de tareas?",
    answer:
      "Habita considera la carga de cada miembro, sus preferencias, disponibilidad y rotaciones previas. Genera un plan semanal que podés revisar y ajustar antes de aplicar.",
  },
  {
    question: "¿Cómo funciona el comparador de precios?",
    answer:
      "Armás tu lista de compras, Habita busca cada producto en varios supermercados y te muestra el mejor precio por ítem y por carrito total. También te muestra ofertas y promos bancarias vigentes.",
  },
  {
    question: "¿Cuántos miembros puedo agregar?",
    answer:
      "No hay límite. Podés agregar a toda tu familia o grupo de convivencia.",
  },
  {
    question: "¿Funciona para roommates o solo familias?",
    answer:
      "Funciona para cualquier grupo que comparta un hogar: familias, parejas, roommates, etc.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Tus datos solo los ven los miembros de tu hogar. Usamos encriptación y no compartimos información con terceros.",
  },
];

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={index} className="rounded-2xl bg-brand-lavender-light/20">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold sm:text-base">
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
