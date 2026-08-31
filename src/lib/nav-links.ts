import { Award, Home, Trophy } from "lucide-react";

export const PUBLIC_NAV_LINKS = [
  { href: "/events", label: "Eventos" },
  { href: "/how-it-works", label: "Cómo funciona" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/prizes", label: "Premios" },
] as const;

export const PARTICIPANT_TAB_LINKS = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
] as const;
