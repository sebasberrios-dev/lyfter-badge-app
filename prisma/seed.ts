import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

async function superAdmin() {
  const hashedPassoword = await bcrypt.hash("superadmin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassoword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super Admin created.");
}

async function participant() {
  const hashedPassoword = await bcrypt.hash("participant123", 10);

  await prisma.user.upsert({
    where: { email: "part@example.com" },
    update: {},
    create: {
      name: "Participant",
      email: "part@example.com",
      password: hashedPassoword,
      role: "PARTICIPANT",
    },
  });

  console.log("Participant created.");
}

async function companyAdmin() {
  await prisma.company.upsert({
    where: { name: "Acme Corp" },
    update: {},
    create: { name: "Acme Corp" },
  });

  const hashedPassoword = await bcrypt.hash("companyadmin123", 10);

  await prisma.user.upsert({
    where: { email: "companyadmin@example.com" },
    update: {},
    create: {
      name: "Company Admin",
      email: "companyadmin@example.com",
      password: hashedPassoword,
      role: "COMPANY_ADMIN",
    },
  });

  console.log("Company + Company Admin created.");
}

async function sampleEvents() {
  const company = await prisma.company.findUniqueOrThrow({
    where: { name: "Acme Corp" },
  });

  const events = [
    {
      name: "Lyfter DevCon 2026",
      description:
        "Conferencia anual de Lyfter sobre desarrollo web moderno: charlas, stands de empresas aliadas y networking.",
      location: "San José, Costa Rica",
      country: "Costa Rica",
      modality: "ONSITE" as const,
      status: "ACTIVE" as const,
      startDate: new Date("2026-09-15T13:00:00Z"),
      endDate: new Date("2026-09-15T21:00:00Z"),
      prizeDescription: "Una laptop Lyfter Edition",
    },
    {
      name: "Lyfter Frontend Summit",
      description:
        "Meetup virtual enfocado en frameworks de frontend, patrones de UI y experiencias de usuario modernas.",
      location: "Online",
      country: "Costa Rica",
      modality: "VIRTUAL" as const,
      status: "FINISHED" as const,
      startDate: new Date("2026-06-10T18:00:00Z"),
      endDate: new Date("2026-06-10T21:00:00Z"),
      prizeDescription: null,
    },
  ];

  for (const data of events) {
    const existing = await prisma.event.findFirst({
      where: { name: data.name, companyId: company.id },
    });
    if (!existing) {
      await prisma.event.create({ data: { ...data, companyId: company.id } });
    }
  }

  console.log("Sample events created.");
}

async function main() {
  await participant();
  await superAdmin();
  await companyAdmin();
  await sampleEvents();

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect);
