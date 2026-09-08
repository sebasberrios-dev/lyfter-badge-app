import Link from "next/link";
import { Award, QrCode, Trophy, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Feature {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: QrCode,
    color: "bg-sky",
    title: "Escaneá QRs en cada charla y stand",
    description:
      "Cada punto del evento tiene su propio código — sumá badges a medida que explorás.",
  },
  {
    icon: Award,
    color: "bg-lilac",
    title: "Coleccioná badges únicos",
    description:
      "Cada badge es un logro propio, con su rareza y su historia dentro del evento.",
  },
  {
    icon: Trophy,
    color: "bg-coral",
    title: "Subí de nivel y escalá el leaderboard",
    description:
      "Tu XP acumulado te sube de nivel y te ubica frente a los demás participantes.",
  },
];

function FeatureCard({ icon: Icon, color, title, description }: Feature) {
  return (
    <Card>
      <CardHeader>
        <div
          className={`mb-4 flex size-12 items-center justify-center rounded-xl ${color} text-white`}
        >
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="container mx-auto grid gap-10 px-4 pt-16 pb-8 md:grid-cols-2 md:items-center md:pt-24 md:pb-12">
        <div>
          <span className="inline-block rounded-full bg-peach px-3 py-1 text-sm font-bold text-ink">
            GAMIFICÁ TU EVENTO
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Escaneá, coleccioná badges y subí de nivel en cada charla
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Convertí cada charla y stand de tu evento en una experiencia
            coleccionable. Escaneá códigos QR, ganá badges, acumulá XP y
            competí en el leaderboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/events" className={buttonVariants({ size: "lg" })}>
              Ver Eventos →
            </Link>
            <Link
              href="/how-it-works"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Cómo funciona
            </Link>
          </div>
        </div>
        <div className="aspect-4/3 rounded-2xl border border-border bg-card" />
      </section>

      <section className="container mx-auto px-4 pt-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    </>
  );
}
