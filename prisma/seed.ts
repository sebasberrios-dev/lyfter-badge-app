import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import generateQrToken from "@/lib/qrToken";
import type { BadgeRarity, BadgeType, EventModality, EventStatus } from "@prisma/client";

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

async function participants() {
  const people = [
    { email: "part@example.com", name: "Participant", password: "participant123" },
    { email: "part2@example.com", name: "Participante Dos", password: "participant123" },
    { email: "part3@example.com", name: "Participante Tres", password: "participant123" },
  ];

  for (const person of people) {
    const hashedPassoword = await bcrypt.hash(person.password, 10);
    await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        name: person.name,
        email: person.email,
        password: hashedPassoword,
        role: "PARTICIPANT",
      },
    });
  }

  console.log("Participants created.");
}

type CompanyAdminSeed = {
  companyName: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
};

const COMPANY_ADMINS: CompanyAdminSeed[] = [
  {
    companyName: "Acme Corp",
    adminEmail: "companyadmin@example.com",
    adminName: "Company Admin",
    adminPassword: "companyadmin123",
  },
  {
    companyName: "Neko",
    adminEmail: "nekoadmin@example.com",
    adminName: "Neko Admin",
    adminPassword: "nekoadmin123",
  },
  {
    companyName: "Umbrella Labs",
    adminEmail: "umbrellaadmin@example.com",
    adminName: "Umbrella Admin",
    adminPassword: "umbrellaadmin123",
  },
];

async function companiesWithAdmins() {
  const companies: Record<string, number> = {};

  for (const seed of COMPANY_ADMINS) {
    const company = await prisma.company.upsert({
      where: { name: seed.companyName },
      update: {},
      create: { name: seed.companyName },
    });
    companies[seed.companyName] = company.id;

    const hashedPassoword = await bcrypt.hash(seed.adminPassword, 10);
    await prisma.user.upsert({
      where: { email: seed.adminEmail },
      update: { companyId: company.id, role: "COMPANY_ADMIN" },
      create: {
        name: seed.adminName,
        email: seed.adminEmail,
        password: hashedPassoword,
        role: "COMPANY_ADMIN",
        companyId: company.id,
      },
    });
  }

  console.log("Companies + company admins created.");
  return companies;
}

type EventSeed = {
  name: string;
  description: string;
  location: string;
  country: string;
  modality: EventModality;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  prizeDescription: string | null;
};

const MODALITIES: EventModality[] = ["ONSITE", "VIRTUAL", "HYBRID"];
const STATUSES: EventStatus[] = ["DRAFT", "ACTIVE", "FINISHED"];

function buildFillerEvents(namePrefix: string, count: number, monthOffset: number): EventSeed[] {
  return Array.from({ length: count }, (_, i) => {
    const modality = MODALITIES[i % MODALITIES.length];
    const status = STATUSES[i % STATUSES.length];
    const month = ((monthOffset + i) % 12) + 1;
    const start = new Date(Date.UTC(2026, month - 1, 10, 14, 0, 0));
    const end = new Date(Date.UTC(2026, month - 1, 10, 20, 0, 0));

    return {
      name: `${namePrefix} #${i + 1}`,
      description: `Evento de prueba generado para QA de paginación y filtros (modalidad ${modality.toLowerCase()}, estado ${status.toLowerCase()}).`,
      location: modality === "VIRTUAL" ? "Online" : "San José, Costa Rica",
      country: "Costa Rica",
      modality,
      status,
      startDate: start,
      endDate: end,
      prizeDescription: i % 4 === 0 ? "Un swag pack sorpresa" : null,
    };
  });
}

async function upsertEvent(companyId: number, data: EventSeed) {
  const existing = await prisma.event.findFirst({
    where: { name: data.name, companyId },
  });
  if (existing) {
    return existing;
  }
  return prisma.event.create({ data: { ...data, companyId } });
}

async function sampleEvents(companies: Record<string, number>) {
  const acmeId = companies["Acme Corp"];
  const nekoId = companies["Neko"];
  const umbrellaId = companies["Umbrella Labs"];

  const flagship = await upsertEvent(acmeId, {
    name: "Lyfter DevCon 2026",
    description:
      "Conferencia anual de Lyfter sobre desarrollo web moderno: charlas, stands de empresas aliadas y networking.",
    location: "San José, Costa Rica",
    country: "Costa Rica",
    modality: "ONSITE",
    status: "ACTIVE",
    startDate: new Date("2026-09-15T13:00:00Z"),
    endDate: new Date("2026-09-15T21:00:00Z"),
    prizeDescription: "Una laptop Lyfter Edition",
  });

  await upsertEvent(acmeId, {
    name: "Lyfter Frontend Summit",
    description:
      "Meetup virtual enfocado en frameworks de frontend, patrones de UI y experiencias de usuario modernas.",
    location: "Online",
    country: "Costa Rica",
    modality: "VIRTUAL",
    status: "FINISHED",
    startDate: new Date("2026-06-10T18:00:00Z"),
    endDate: new Date("2026-06-10T21:00:00Z"),
    prizeDescription: null,
  });

  const nekoFlagship = await upsertEvent(nekoId, {
    name: "Neko DevCon",
    description:
      "Evento insignia de Neko para su comunidad de desarrolladores, con charlas técnicas y demos en vivo.",
    location: "Heredia, Costa Rica",
    country: "Costa Rica",
    modality: "HYBRID",
    status: "ACTIVE",
    startDate: new Date("2026-10-01T14:00:00Z"),
    endDate: new Date("2026-10-01T20:00:00Z"),
    prizeDescription: "Suscripción anual a Neko Pro",
  });

  // 20 eventos extra en Acme Corp -> junto a los 2 de arriba, suma 22 (alcanza para ver
  // paginación de a 20 tanto en la vista de SUPER_ADMIN como filtrada por COMPANY_ADMIN).
  for (const data of buildFillerEvents("Acme Meetup", 20, 0)) {
    await upsertEvent(acmeId, data);
  }

  // 5 eventos extra en Neko y 6 en Umbrella Labs -> confirma aislamiento multi-tenant
  // (un COMPANY_ADMIN de una empresa no debe ver ni poder entrar a los de otra).
  for (const data of buildFillerEvents("Neko Meetup", 5, 3)) {
    await upsertEvent(nekoId, data);
  }
  for (const data of buildFillerEvents("Umbrella Demo Day", 6, 6)) {
    await upsertEvent(umbrellaId, data);
  }

  console.log("Sample events created (Acme: 22, Neko: 6, Umbrella Labs: 6).");
  return { flagship, nekoFlagship };
}

type BadgeSeed = {
  name: string;
  description: string;
  xpValue: number;
  icon: "welcome" | "talk" | "booth" | "special";
  type: BadgeType;
  rarity: BadgeRarity;
};

async function upsertBadge(eventId: number, data: BadgeSeed) {
  const existing = await prisma.badge.findFirst({
    where: { eventId, name: data.name },
  });
  if (existing) {
    return existing;
  }
  return prisma.badge.create({
    data: { ...data, eventId, qrToken: generateQrToken() },
  });
}

async function sampleBadges(flagshipId: number, nekoFlagshipId: number) {
  const flagshipBadges: BadgeSeed[] = [
    {
      name: "Bienvenida DevCon",
      description: "Canjeado al registrarte en la entrada del evento con el QR de bienvenida.",
      xpValue: 10,
      icon: "welcome",
      type: "WELCOME",
      rarity: "COMMON",
    },
    {
      name: "Charla: Next.js 16 en producción",
      description: "Canjeado al asistir a la charla principal sobre Next.js 16 y Turbopack.",
      xpValue: 20,
      icon: "talk",
      type: "TALK",
      rarity: "RARE",
    },
    {
      name: "Stand de Lyfter",
      description: "Canjeado al visitar el stand oficial de Lyfter y hablar con el equipo.",
      xpValue: 15,
      icon: "booth",
      type: "BOOTH",
      rarity: "COMMON",
    },
    {
      name: "Badge sorpresa",
      description: "Badge de edición limitada, entregado solo a quienes completan una actividad especial.",
      xpValue: 25,
      icon: "special",
      type: "SPECIAL",
      rarity: "LIMITED",
    },
  ];

  const created = [];
  for (const data of flagshipBadges) {
    created.push(await upsertBadge(flagshipId, data));
  }

  const nekoWelcome = await upsertBadge(nekoFlagshipId, {
    name: "Bienvenida Neko DevCon",
    description: "Canjeado al registrarte en la entrada del evento Neko DevCon.",
    xpValue: 10,
    icon: "welcome",
    type: "WELCOME",
    rarity: "COMMON",
  });

  console.log("Sample badges created (flagship Acme: 4, Neko: 1).");
  return { flagshipBadges: created, nekoWelcome };
}

async function upsertRegistration(userId: number, eventId: number, eventXp: number) {
  return prisma.eventRegistration.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { eventXp },
    create: { userId, eventId, eventXp },
  });
}

async function upsertRedemption(userId: number, badgeId: number, flagged = false) {
  return prisma.redemption.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    update: {},
    create: { userId, badgeId, flagged },
  });
}

async function sampleParticipation(
  flagship: { id: number },
  nekoFlagship: { id: number },
  badges: Awaited<ReturnType<typeof sampleBadges>>,
) {
  const part = await prisma.user.findUniqueOrThrow({ where: { email: "part@example.com" } });
  const part2 = await prisma.user.findUniqueOrThrow({ where: { email: "part2@example.com" } });
  const part3 = await prisma.user.findUniqueOrThrow({ where: { email: "part3@example.com" } });

  const [welcome, talk, booth, special] = badges.flagshipBadges;

  // part@example.com: completa el evento 100% (4/4 badges) -> revela el premio,
  // y uno de sus canjes queda flagged para ver el stat card de "Canjes flagged" con datos reales.
  await upsertRegistration(part.id, flagship.id, welcome.xpValue + talk.xpValue + booth.xpValue + special.xpValue);
  await upsertRedemption(part.id, welcome.id);
  await upsertRedemption(part.id, talk.id, true);
  await upsertRedemption(part.id, booth.id);
  await upsertRedemption(part.id, special.id);
  await prisma.user.update({
    where: { id: part.id },
    data: { totalXp: welcome.xpValue + talk.xpValue + booth.xpValue + special.xpValue },
  });

  // part2@example.com: 3/4 badges (75%) -> progreso parcial en /participants.
  await upsertRegistration(part2.id, flagship.id, welcome.xpValue + talk.xpValue + booth.xpValue);
  await upsertRedemption(part2.id, welcome.id);
  await upsertRedemption(part2.id, talk.id);
  await upsertRedemption(part2.id, booth.id);
  await prisma.user.update({
    where: { id: part2.id },
    data: { totalXp: welcome.xpValue + talk.xpValue + booth.xpValue },
  });

  // part3@example.com: solo el badge de bienvenida (25%) -> inscrito pero recién arrancando.
  await upsertRegistration(part3.id, flagship.id, welcome.xpValue);
  await upsertRedemption(part3.id, welcome.id);
  await prisma.user.update({
    where: { id: part3.id },
    data: { totalXp: welcome.xpValue },
  });

  // part@example.com también participa en el evento de Neko (empresa distinta) -> confirma
  // que un mismo participante puede estar inscrito en eventos de varias empresas.
  await upsertRegistration(part.id, nekoFlagship.id, badges.nekoWelcome.xpValue);
  await upsertRedemption(part.id, badges.nekoWelcome.id);

  console.log("Sample participation created (registrations + redemptions).");
}

async function main() {
  await superAdmin();
  await participants();
  const companies = await companiesWithAdmins();
  const { flagship, nekoFlagship } = await sampleEvents(companies);
  const badges = await sampleBadges(flagship.id, nekoFlagship.id);
  await sampleParticipation(flagship, nekoFlagship, badges);

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect);
