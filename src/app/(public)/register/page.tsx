import Link from "next/link";
import { AuthCard } from "@/components/shared/auth-card";
import { RegisterForm } from "@/components/shared/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Creá tu cuenta"
      description="Registrate para empezar a coleccionar badges."
      footer={
        <span className="text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Iniciar sesión
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
