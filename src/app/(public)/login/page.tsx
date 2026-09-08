import Link from "next/link";
import { AuthCard } from "@/components/shared/auth-card";
import { LoginForm } from "@/components/shared/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Iniciar sesión"
      description="Bienvenido de nuevo. Por favor ingresa tus detalles."
      footer={
        <span className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Regístrate
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
