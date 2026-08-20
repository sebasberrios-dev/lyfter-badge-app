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

async function main() {
  await participant();
  await superAdmin();
  await companyAdmin();

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect);
