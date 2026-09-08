import {
  Award,
  Building2,
  Calendar,
  Home,
  LayoutDashboard,
  ScrollText,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";

export const PUBLIC_NAV_LINKS = [
  { href: "/events", label: "Eventos" },
  { href: "/how-it-works", label: "Cómo funciona" },
  { href: "/prizes", label: "Premios" },
] as const;

export const PARTICIPANT_TAB_LINKS = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
  { href: "/profile", label: "Perfil", icon: User },
] as const;

export type AdminNavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
};

export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/companies", label: "Empresas", icon: Building2, roles: ["SUPER_ADMIN"] },
  { href: "/admin/users", label: "Usuarios", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/admin/audit-log", label: "Auditoría", icon: ScrollText },
];
