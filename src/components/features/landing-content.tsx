"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  CheckCircle2,
  Trophy,
  Sparkles,
  ArrowRight,
  Home,
  ClipboardList,
  ChevronDown,
  Scale,
  Brain,
  MessageCircle,
  ChefHat,
  MapPin,
} from "lucide-react";

export function LandingContent() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center sm:min-h-[65vh] sm:py-20">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-lavender-light sm:h-24 sm:w-24">
            <span className="text-5xl sm:text-6xl">🏠</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground sm:mb-4 sm:text-5xl lg:text-6xl">
            Dejá de pelear por quién lava los platos
          </h1>
          <p className="mb-6 max-w-2xl text-base text-muted-foreground sm:mb-8 sm:text-lg lg:text-xl">
            Habita distribuye las tareas del hogar con IA, te sugiere qué cocinar
            con lo que tenés, y te recomienda actividades para disfrutar en familia.
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
                icon={<Scale className="h-7 w-7" />}
                title="Asignación justa"
                description="Un algoritmo distribuye las tareas según disponibilidad, preferencias y carga actual. Nadie elige, todos colaboran."
                bg="bg-brand-lime/50"
                iconBg="bg-brand-lime"
              />
              <FeatureCard
                index={1}
                icon={<Brain className="h-7 w-7" />}
                title="Plan semanal con IA"
                description="Generá el plan de la semana en 2 minutos. La IA distribuye las tareas automáticamente."
                bg="bg-brand-lavender-light/50"
                iconBg="bg-brand-lavender"
              />
              <FeatureCard
                index={2}
                icon={<ChefHat className="h-7 w-7" />}
                title="¿Qué como hoy?"
                description="Sacale una foto a tu heladera o contanos qué tenés. La IA te sugiere recetas concretas para cocinar."
                bg="bg-brand-cream/60"
                iconBg="bg-brand-tan"
              />
              <FeatureCard
                index={3}
                icon={<MapPin className="h-7 w-7" />}
                title="Planes para disfrutar"
                description="¿Terminaron las tareas? Habita te sugiere eventos, restaurantes y actividades cerca tuyo."
                bg="bg-brand-lavender-light/40"
                iconBg="bg-brand-lavender-light"
              />
              <FeatureCard
                index={4}
                icon={<Trophy className="h-7 w-7" />}
                title="XP, niveles y logros"
                description="Cada tarea suma XP. Subí de nivel, desbloqueá logros y competí con tu familia."
                bg="bg-brand-lime/40"
                iconBg="bg-brand-lime"
              />
              <FeatureCard
                index={5}
                icon={<MessageCircle className="h-7 w-7" />}
                title="WhatsApp integrado"
                description="Recibí recordatorios y completá tareas directo desde WhatsApp, sin abrir la app."
                bg="bg-brand-cream/40"
                iconBg="bg-brand-cream"
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
                icon={<Home className="h-6 w-6" />}
                title="Creá tu hogar"
                description="Registrate gratis y creá tu grupo familiar en segundos."
                bg="bg-brand-lavender-light"
              />
              <StepCard
                index={1}
                number={2}
                icon={<ClipboardList className="h-6 w-6" />}
                title="Agregá tareas"
                description="Elegí del catálogo o creá las tuyas. Configurá frecuencia y listo."
                bg="bg-brand-lime"
              />
              <StepCard
                index={2}
                number={3}
                icon={<Trophy className="h-6 w-6" />}
                title="Habita hace el resto"
                description="Asigna tareas con IA, reparte XP y motiva a toda la familia."
                bg="bg-brand-cream"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* AI-Powered Section */}
      <ScrollReveal>
        <section className="py-12 sm:py-20">
          <div className="container px-4">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-lavender-light px-4 py-2 text-sm font-semibold text-brand-purple-dark">
                  <Sparkles className="h-4 w-4" />
                  Potenciado por IA
                </div>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                  Más que un organizador de tareas
                </h2>
                <p className="mb-6 text-muted-foreground sm:text-lg">
                  Habita usa inteligencia artificial para hacerte la vida más
                  fácil: desde planificar la semana hasta decidir qué cocinar
                  o a dónde salir.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Foto de la heladera y te sugiere recetas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Eventos, restaurantes y actividades cerca tuyo</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-success-dark" />
                    <span>Planes semanales generados en segundos</span>
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
                        <span className="text-xl">🎯</span>
                      </div>
                      <div>
                        <p className="font-medium">&ldquo;¿A dónde vamos hoy?&rdquo;</p>
                        <p className="text-sm text-muted-foreground">
                          Eventos y planes para toda la familia
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lavender">
                        <span className="text-xl">🤖</span>
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
                quote="Habita decide quién hace qué y nadie puede quejarse. El algoritmo es justo y se nota."
                name="Martín"
                role="Papá de 2"
                emoji="🧔"
                bg="bg-brand-lavender-light/30"
              />
              <TestimonialCard
                index={1}
                quote="Le saqué una foto a la heladera y me sugirió 3 recetas con lo que tenía. Ya no sé qué haría sin Habita."
                name="Laura"
                role="Mamá de 3"
                emoji="👩"
                bg="bg-brand-lime/30"
              />
              <TestimonialCard
                index={2}
                quote="Completamos tareas desde WhatsApp y los fines de semana Habita nos sugiere a dónde salir. Con mis roommates funciona perfecto."
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
            Comienza a organizar tu hogar hoy
          </h2>
          <p className="mb-6 text-base opacity-90 sm:mb-8 sm:text-lg">
            Es gratis y solo toma un minuto configurarlo.
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
          <p>Habita — Gestión colaborativa de tareas del hogar</p>
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
    question: "¿Cómo funciona la asignación automática?",
    answer:
      "El algoritmo considera la carga actual de cada miembro, sus preferencias, disponibilidad y la última vez que hicieron cada tarea. Así se asegura de que la distribución sea justa para todos.",
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
    question: "¿Qué hace la IA de Habita?",
    answer:
      "La IA genera planes semanales distribuyendo tareas equitativamente, te sugiere recetas con lo que tenés en la heladera (podés mandarle una foto), y te recomienda eventos y actividades cerca tuyo para disfrutar en familia.",
  },
  {
    question: "¿Puedo usarlo desde WhatsApp?",
    answer:
      "Sí. Podés recibir recordatorios, ver tus tareas pendientes y marcarlas como completadas directo desde WhatsApp.",
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
