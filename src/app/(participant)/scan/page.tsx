import { getSession } from "@/lib/auth";
import { ScanFlow } from "@/components/participant/scan/scan-flow";

export default async function ScanPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pt-8 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mt-2 mb-2">
          Escanear
        </h1>
        <p className="text-muted-foreground">
          Escaneá el QR del badge para reclamarlo.
        </p>
      </div>
      <ScanFlow />
    </div>
  );
}
