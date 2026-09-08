import { Logo } from "@/components/shared/logo";

const FOOTER_LINKS = [
  { label: "Términos" },
  { label: "Privacidad" },
  { label: "Contacto" },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav className="flex gap-4 text-sm text-muted-foreground">
          {FOOTER_LINKS.map(({ label }) => (
            <a key={label} href="#" className="hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Sebastián Berríos Aguilera
        </p>
      </div>
    </footer>
  );
}
