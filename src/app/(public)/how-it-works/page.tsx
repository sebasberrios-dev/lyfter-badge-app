import Link from "next/link";
import {
  QrCode,
  Award,
  TrendingUp,
  Trophy,
  Share2,
  Gift,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Step {
  number: number;
  icon: typeof QrCode;
  color: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: QrCode,
    color: "bg-sky",
    title: "Escaneá el QR de bienvenida",
    description:
      "Al llegar al evento, escaneá el QR de bienvenida — eso te inscribe oficialmente en ese evento.",
  },
  {
    number: 2,
    icon: Award,
    color: "bg-lilac",
    title: "Escaneá cada charla y stand",
    description:
      "Cada charla y cada stand tiene su propio QR único. Escanealo y sumá un badge coleccionable más XP.",
  },
  {
    number: 3,
    icon: TrendingUp,
    color: "bg-peach",
    title: "Subí de nivel",
    description:
      "Tu XP se acumula en toda la plataforma — a medida que sumás, subís de nivel.",
  },
  {
    number: 4,
    icon: Trophy,
    color: "bg-coral",
    title: "Mirate en el leaderboard",
    description:
      "Compará tu progreso contra el resto de los participantes, en general y por evento.",
  },
  {
    number: 5,
    icon: Share2,
    color: "bg-sky",
    title: "Compartí tus badges",
    description:
      "Mostrá lo que fuiste ganando en LinkedIn, Instagram o Facebook.",
  },
  {
    number: 6,
    icon: Gift,
    color: "bg-lilac",
    title: "Completá el evento y ganá el premio",
    description:
      "Al conseguir el 100% de los badges disponibles de un evento, se revela el premio de ese evento.",
  },
];

function StepCard({ number, icon: Icon, color, title, description }: Step) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${color} text-sm font-bold text-white`}
          >
            {number}
          </div>
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
          Cómo funciona
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          De QR en QR, convertí tu paso por el evento en badges, XP y un
          premio final.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <StepCard key={step.number} {...step} />
        ))}
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-4">
        <Link href="/events" className={buttonVariants({ size: "lg" })}>
          Ver eventos
        </Link>
        <Link
          href="/register"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
