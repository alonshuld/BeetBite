import { PrismaClient } from '../src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`Admin user upserted: ${username}`);
}

function d(iso: string): Date {
  return new Date(iso);
}

async function seedMockData(): Promise<void> {
  console.log('Seeding mock data...');

  await prisma.subcontractorPayment.deleteMany({});
  await prisma.corporationPayment.deleteMany({});
  await prisma.projectReport.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.subcontractor.deleteMany({});
  await prisma.corporation.deleteMany({});

  // ── Clients ──────────────────────────────────────────────────────────────
  const [cTA, cHaifa, cJerusalem, cRaanana, cBeerSheva, cHerzliya, cNetanya] =
    await Promise.all([
      prisma.client.create({ data: { name: 'Tel Aviv Properties Ltd' } }),
      prisma.client.create({ data: { name: 'Haifa Builders Group' } }),
      prisma.client.create({ data: { name: 'Jerusalem Develop Corp' } }),
      prisma.client.create({ data: { name: 'Raanana Real Estate' } }),
      prisma.client.create({ data: { name: 'Beer Sheva Contractors' } }),
      prisma.client.create({ data: { name: 'Herzliya Premium Build' } }),
      prisma.client.create({ data: { name: 'Netanya Coastal Projects' } }),
    ]);

  // ── Subcontractors ────────────────────────────────────────────────────────
  const [sMoshe, sAvi, sYossi, sDavid, sShlomo, sRami] = await Promise.all([
    prisma.subcontractor.create({ data: { name: 'Moshe Cohen' } }),
    prisma.subcontractor.create({ data: { name: 'Avi Levi' } }),
    prisma.subcontractor.create({ data: { name: 'Yossi Mizrahi' } }),
    prisma.subcontractor.create({ data: { name: 'David Peretz' } }),
    prisma.subcontractor.create({ data: { name: 'Shlomo Ben-David' } }),
    prisma.subcontractor.create({ data: { name: 'Rami Dahan' } }),
  ]);

  // ── Corporations ──────────────────────────────────────────────────────────
  const [cElectro, cAqua, cIron, cGlass, cTile, cCool] = await Promise.all([
    prisma.corporation.create({ data: { name: 'ElectroPro Solutions' } }),
    prisma.corporation.create({ data: { name: 'AquaPlumbing Services' } }),
    prisma.corporation.create({ data: { name: 'IronSteel Structures' } }),
    prisma.corporation.create({ data: { name: 'GlassMaster Windows' } }),
    prisma.corporation.create({ data: { name: 'TileKing Flooring' } }),
    prisma.corporation.create({ data: { name: 'CoolAir HVAC Systems' } }),
  ]);

  // ── Projects ──────────────────────────────────────────────────────────────
  const [
    pDizengoff,
    pYarkon,
    pFlorentinLofts,
    pTACenter,      // done
    pHaifaHarbor,
    pCarmelGardens,
    pHaifaUni,      // done
    pJerusalemHotel,
    pMamilla,
    , // pJerusalemTech — future project, no reports
    pRaananaVillas,
    pBeerShevaTech,
    pHerzliyaMarina,
    pNetanyaResort,
    pNetanyaMall,
  ] = await Promise.all([
    // Tel Aviv
    prisma.project.create({
      data: {
        clientId: cTA.id,
        name: 'Dizengoff Tower Renovation',
        estimatedAmount: 500000,
        finishDate: d('2025-12-31'),
        description: 'Full renovation of a 12-story tower on Dizengoff St',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cTA.id,
        name: 'Yarkon Park Residence',
        estimatedAmount: 200000,
        finishDate: d('2025-09-30'),
        description: 'Residential complex near Yarkon Park',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cTA.id,
        name: 'Florentin Lofts Conversion',
        estimatedAmount: 180000,
        finishDate: d('2025-08-31'),
        description: 'Industrial loft conversion in Florentin neighborhood',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cTA.id,
        name: 'Tel Aviv Central Renewal',
        estimatedAmount: 300000,
        finishDate: d('2024-12-31'),
        description: 'Central bus station area renovation',
        isDone: true,
      },
    }),
    // Haifa
    prisma.project.create({
      data: {
        clientId: cHaifa.id,
        name: 'Haifa Harbor Complex',
        estimatedAmount: 800000,
        finishDate: d('2026-06-30'),
        description: 'Commercial complex at the Haifa harbor area',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cHaifa.id,
        name: 'Carmel Gardens Residences',
        estimatedAmount: 450000,
        finishDate: d('2026-03-31'),
        description: 'Luxury residential complex on Mount Carmel',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cHaifa.id,
        name: 'Haifa University Annex',
        estimatedAmount: 250000,
        finishDate: d('2024-09-30'),
        description: 'New administrative annex for the university',
        isDone: true,
      },
    }),
    // Jerusalem
    prisma.project.create({
      data: {
        clientId: cJerusalem.id,
        name: 'Jerusalem Old City Hotel',
        estimatedAmount: 1200000,
        finishDate: d('2026-12-31'),
        description: 'Boutique hotel construction near the Old City walls',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cJerusalem.id,
        name: 'Mamilla Mall Extension',
        estimatedAmount: 400000,
        finishDate: d('2025-09-30'),
        description: 'Extension of the Mamilla open-air mall',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cJerusalem.id,
        name: 'Jerusalem Tech Hub',
        estimatedAmount: 550000,
        finishDate: d('2027-03-31'),
        description: 'Modern tech campus in Malha area',
      },
    }),
    // Raanana
    prisma.project.create({
      data: {
        clientId: cRaanana.id,
        name: 'Raanana Villa Complex',
        estimatedAmount: 350000,
        finishDate: d('2025-10-31'),
        description: 'Upscale villa development in northern Raanana',
      },
    }),
    // Beer Sheva
    prisma.project.create({
      data: {
        clientId: cBeerSheva.id,
        name: 'Beer Sheva Tech Campus',
        estimatedAmount: 600000,
        finishDate: d('2026-06-30'),
        description: 'Technology campus for the cyber district',
      },
    }),
    // Herzliya
    prisma.project.create({
      data: {
        clientId: cHerzliya.id,
        name: 'Herzliya Marina Towers',
        estimatedAmount: 900000,
        finishDate: d('2026-09-30'),
        description: 'Twin residential towers overlooking the marina',
      },
    }),
    // Netanya
    prisma.project.create({
      data: {
        clientId: cNetanya.id,
        name: 'Netanya Beach Resort',
        estimatedAmount: 750000,
        finishDate: d('2026-06-30'),
        description: 'Luxury beach resort on the northern coast',
      },
    }),
    prisma.project.create({
      data: {
        clientId: cNetanya.id,
        name: 'Netanya Shopping Center',
        estimatedAmount: 300000,
        finishDate: d('2025-12-31'),
        description: 'Modern shopping center in the city center',
      },
    }),
  ]);

  // ── Project Reports ───────────────────────────────────────────────────────
  // Helper: create report
  type ReportInput = {
    projectId: string;
    subcontractorId: string;
    date: string;
    profitMargin: number;
    income: number;
    incomeDate: string | null;
  };

  async function report(r: ReportInput) {
    return prisma.projectReport.create({
      data: {
        projectId: r.projectId,
        subcontractorId: r.subcontractorId,
        date: d(r.date),
        profitMargin: r.profitMargin,
        income: r.income,
        incomeDate: r.incomeDate ? d(r.incomeDate) : null,
      },
    });
  }

  // Dizengoff Tower — Moshe Cohen, 10% margin, income ~48-55k/mo (Aug 2024 – Apr 2026)
  const [diz0824, diz0924, diz1024, diz1124, diz1224, diz0125, diz0225, diz0325, diz0425, diz0525, diz0625, diz0725, diz0825, diz0925, diz1025, diz1125, diz1225, diz0126, diz0226, diz0326, diz0426] =
    await Promise.all([
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2024-08-01', profitMargin: 10, income: 50000, incomeDate: '2024-08-14' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2024-09-01', profitMargin: 10, income: 50000, incomeDate: '2024-09-16' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2024-10-01', profitMargin: 10, income: 52000, incomeDate: '2024-10-12' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2024-11-01', profitMargin: 10, income: 48000, incomeDate: '2024-11-18' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2024-12-01', profitMargin: 10, income: 55000, incomeDate: '2024-12-20' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-01-01', profitMargin: 10, income: 50000, incomeDate: '2025-01-15' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-02-01', profitMargin: 10, income: 50000, incomeDate: '2025-02-20' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-03-01', profitMargin: 10, income: 45000, incomeDate: '2025-03-18' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-04-01', profitMargin: 10, income: 48000, incomeDate: '2025-04-22' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-05-01', profitMargin: 10, income: 50000, incomeDate: '2025-05-19' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-06-01', profitMargin: 10, income: 52000, incomeDate: '2025-06-17' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-07-01', profitMargin: 10, income: 48000, incomeDate: '2025-07-21' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-08-01', profitMargin: 10, income: 50000, incomeDate: '2025-08-14' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-09-01', profitMargin: 10, income: 45000, incomeDate: '2025-09-18' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-10-01', profitMargin: 10, income: 50000, incomeDate: '2025-10-16' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-11-01', profitMargin: 10, income: 48000, incomeDate: '2025-11-20' }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2025-12-01', profitMargin: 10, income: 52000, incomeDate: null }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2026-01-01', profitMargin: 10, income: 50000, incomeDate: null }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2026-02-01', profitMargin: 10, income: 48000, incomeDate: null }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2026-03-01', profitMargin: 10, income: 50000, incomeDate: null }),
      report({ projectId: pDizengoff.id, subcontractorId: sMoshe.id, date: '2026-04-01', profitMargin: 10, income: 48000, incomeDate: null }),
    ]);

  // Yarkon Park — Avi Levi, 12% margin, ~20k/mo (Jan 2025 – May 2025)
  const [yar0125, yar0225, yar0325, yar0425, yar0525] = await Promise.all([
    report({ projectId: pYarkon.id, subcontractorId: sAvi.id, date: '2025-01-01', profitMargin: 12, income: 20000, incomeDate: '2025-01-10' }),
    report({ projectId: pYarkon.id, subcontractorId: sAvi.id, date: '2025-02-01', profitMargin: 12, income: 20000, incomeDate: '2025-02-12' }),
    report({ projectId: pYarkon.id, subcontractorId: sAvi.id, date: '2025-03-01', profitMargin: 12, income: 18000, incomeDate: '2025-03-14' }),
    report({ projectId: pYarkon.id, subcontractorId: sAvi.id, date: '2025-04-01', profitMargin: 12, income: 20000, incomeDate: '2025-04-16' }),
    report({ projectId: pYarkon.id, subcontractorId: sAvi.id, date: '2025-05-01', profitMargin: 12, income: 20000, incomeDate: null }),
  ]);

  // Florentin Lofts — Yossi Mizrahi, 11%, ~18k/mo (Mar 2025 – Aug 2025)
  const [flo0325, flo0425, flo0525, flo0625, flo0725, flo0825] = await Promise.all([
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-03-01', profitMargin: 11, income: 18000, incomeDate: '2025-03-20' }),
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-04-01', profitMargin: 11, income: 18000, incomeDate: '2025-04-22' }),
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-05-01', profitMargin: 11, income: 20000, incomeDate: '2025-05-21' }),
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-06-01', profitMargin: 11, income: 18000, incomeDate: '2025-06-19' }),
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-07-01', profitMargin: 11, income: 18000, incomeDate: null }),
    report({ projectId: pFlorentinLofts.id, subcontractorId: sYossi.id, date: '2025-08-01', profitMargin: 11, income: 16000, incomeDate: null }),
  ]);

  // Tel Aviv Central (done) — David Peretz, 9%, ~30k/mo (Jan 2024 – Dec 2024)
  const [tac0124, tac0224, tac0324, tac0424, tac0524, tac0624, tac0724, tac0824, tac0924, tac1024, tac1124, tac1224] =
    await Promise.all([
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-01-01', profitMargin: 9, income: 25000, incomeDate: '2024-01-17' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-02-01', profitMargin: 9, income: 25000, incomeDate: '2024-02-14' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-03-01', profitMargin: 9, income: 28000, incomeDate: '2024-03-19' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-04-01', profitMargin: 9, income: 25000, incomeDate: '2024-04-16' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-05-01', profitMargin: 9, income: 25000, incomeDate: '2024-05-20' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-06-01', profitMargin: 9, income: 30000, incomeDate: '2024-06-18' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-07-01', profitMargin: 9, income: 25000, incomeDate: '2024-07-22' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-08-01', profitMargin: 9, income: 25000, incomeDate: '2024-08-15' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-09-01', profitMargin: 9, income: 28000, incomeDate: '2024-09-17' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-10-01', profitMargin: 9, income: 25000, incomeDate: '2024-10-21' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-11-01', profitMargin: 9, income: 25000, incomeDate: '2024-11-19' }),
      report({ projectId: pTACenter.id, subcontractorId: sDavid.id, date: '2024-12-01', profitMargin: 9, income: 30000, incomeDate: '2024-12-23' }),
    ]);

  // Haifa Harbor — Moshe Cohen, 8%, ~80k/mo (Jun 2024 – Apr 2026)
  const [haf0624, haf0724, haf0824, haf0924, haf1024, haf1124, haf1224, haf0125, haf0225, haf0325, haf0425, haf0525, haf0625, haf0725, haf0825, haf0925, haf1025, haf1125, haf1225, haf0126, haf0226, haf0326, haf0426] =
    await Promise.all([
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-06-01', profitMargin: 8, income: 75000, incomeDate: '2024-06-24' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-07-01', profitMargin: 8, income: 80000, incomeDate: '2024-07-23' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-08-01', profitMargin: 8, income: 80000, incomeDate: '2024-08-20' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-09-01', profitMargin: 8, income: 85000, incomeDate: '2024-09-18' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-10-01', profitMargin: 8, income: 80000, incomeDate: '2024-10-22' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-11-01', profitMargin: 8, income: 80000, incomeDate: '2024-11-20' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2024-12-01', profitMargin: 8, income: 90000, incomeDate: '2024-12-19' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-01-01', profitMargin: 8, income: 80000, incomeDate: '2025-01-25' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-02-01', profitMargin: 8, income: 80000, incomeDate: '2025-02-28' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-03-01', profitMargin: 8, income: 75000, incomeDate: '2025-03-27' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-04-01', profitMargin: 8, income: 80000, incomeDate: '2025-04-24' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-05-01', profitMargin: 8, income: 80000, incomeDate: '2025-05-22' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-06-01', profitMargin: 8, income: 85000, incomeDate: '2025-06-26' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-07-01', profitMargin: 8, income: 80000, incomeDate: '2025-07-24' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-08-01', profitMargin: 8, income: 80000, incomeDate: '2025-08-21' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-09-01', profitMargin: 8, income: 80000, incomeDate: '2025-09-25' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-10-01', profitMargin: 8, income: 85000, incomeDate: '2025-10-23' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-11-01', profitMargin: 8, income: 80000, incomeDate: '2025-11-27' }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2025-12-01', profitMargin: 8, income: 80000, incomeDate: null }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2026-01-01', profitMargin: 8, income: 80000, incomeDate: null }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2026-02-01', profitMargin: 8, income: 75000, incomeDate: null }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2026-03-01', profitMargin: 8, income: 80000, incomeDate: null }),
      report({ projectId: pHaifaHarbor.id, subcontractorId: sMoshe.id, date: '2026-04-01', profitMargin: 8, income: 80000, incomeDate: null }),
    ]);

  // Carmel Gardens — Shlomo Ben-David, 10%, ~45k/mo (Jan 2025 – Apr 2026)
  const [car0125, car0225, car0325, car0425, car0525, car0625, car0725, car0825, car0925, car1025, car1125, car1225, car0126, car0226, car0326, car0426] =
    await Promise.all([
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-01-01', profitMargin: 10, income: 40000, incomeDate: '2025-01-28' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-02-01', profitMargin: 10, income: 42000, incomeDate: '2025-02-25' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-03-01', profitMargin: 10, income: 45000, incomeDate: '2025-03-26' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-04-01', profitMargin: 10, income: 45000, incomeDate: '2025-04-24' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-05-01', profitMargin: 10, income: 40000, incomeDate: '2025-05-27' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-06-01', profitMargin: 10, income: 45000, incomeDate: '2025-06-25' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-07-01', profitMargin: 10, income: 42000, incomeDate: '2025-07-28' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-08-01', profitMargin: 10, income: 45000, incomeDate: '2025-08-26' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-09-01', profitMargin: 10, income: 40000, incomeDate: '2025-09-29' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-10-01', profitMargin: 10, income: 45000, incomeDate: '2025-10-27' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-11-01', profitMargin: 10, income: 42000, incomeDate: '2025-11-28' }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2025-12-01', profitMargin: 10, income: 45000, incomeDate: null }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2026-01-01', profitMargin: 10, income: 40000, incomeDate: null }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2026-02-01', profitMargin: 10, income: 42000, incomeDate: null }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2026-03-01', profitMargin: 10, income: 45000, incomeDate: null }),
      report({ projectId: pCarmelGardens.id, subcontractorId: sShlomo.id, date: '2026-04-01', profitMargin: 10, income: 40000, incomeDate: null }),
    ]);

  // Haifa University (done) — Rami Dahan, 11%, ~25k/mo (Jan 2024 – Sep 2024)
  const [uni0124, uni0224, uni0324, uni0424, uni0524, uni0624, uni0724, uni0824, uni0924] =
    await Promise.all([
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-01-01', profitMargin: 11, income: 25000, incomeDate: '2024-01-24' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-02-01', profitMargin: 11, income: 25000, incomeDate: '2024-02-22' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-03-01', profitMargin: 11, income: 28000, incomeDate: '2024-03-21' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-04-01', profitMargin: 11, income: 25000, incomeDate: '2024-04-18' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-05-01', profitMargin: 11, income: 30000, incomeDate: '2024-05-23' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-06-01', profitMargin: 11, income: 28000, incomeDate: '2024-06-20' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-07-01', profitMargin: 11, income: 25000, incomeDate: '2024-07-25' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-08-01', profitMargin: 11, income: 25000, incomeDate: '2024-08-22' }),
      report({ projectId: pHaifaUni.id, subcontractorId: sRami.id, date: '2024-09-01', profitMargin: 11, income: 28000, incomeDate: '2024-09-26' }),
    ]);

  // Jerusalem Hotel — Shlomo Ben-David, 12%, ~100k/mo (Apr 2025 – Apr 2026)
  const [jeh0425, jeh0525, jeh0625, jeh0725, jeh0825, jeh0925, jeh1025, jeh1125, jeh1225, jeh0126, jeh0226, jeh0326, jeh0426] =
    await Promise.all([
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-04-01', profitMargin: 12, income: 100000, incomeDate: '2025-04-28' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-05-01', profitMargin: 12, income: 100000, incomeDate: '2025-05-29' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-06-01', profitMargin: 12, income: 105000, incomeDate: '2025-06-27' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-07-01', profitMargin: 12, income: 100000, incomeDate: '2025-07-30' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-08-01', profitMargin: 12, income: 100000, incomeDate: '2025-08-28' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-09-01', profitMargin: 12, income: 110000, incomeDate: '2025-09-30' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-10-01', profitMargin: 12, income: 100000, incomeDate: '2025-10-30' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-11-01', profitMargin: 12, income: 100000, incomeDate: '2025-11-28' }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2025-12-01', profitMargin: 12, income: 105000, incomeDate: null }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2026-01-01', profitMargin: 12, income: 100000, incomeDate: null }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2026-02-01', profitMargin: 12, income: 100000, incomeDate: null }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2026-03-01', profitMargin: 12, income: 105000, incomeDate: null }),
      report({ projectId: pJerusalemHotel.id, subcontractorId: sShlomo.id, date: '2026-04-01', profitMargin: 12, income: 100000, incomeDate: null }),
    ]);

  // Mamilla Mall — Avi Levi, 10%, ~35k/mo (Jan 2025 – Sep 2025)
  const [mam0125, mam0225, mam0325, mam0425, mam0525, mam0625, mam0725, mam0825, mam0925] =
    await Promise.all([
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-01-01', profitMargin: 10, income: 35000, incomeDate: '2025-01-22' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-02-01', profitMargin: 10, income: 35000, incomeDate: '2025-02-19' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-03-01', profitMargin: 10, income: 40000, incomeDate: '2025-03-24' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-04-01', profitMargin: 10, income: 35000, incomeDate: '2025-04-23' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-05-01', profitMargin: 10, income: 38000, incomeDate: '2025-05-26' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-06-01', profitMargin: 10, income: 35000, incomeDate: '2025-06-24' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-07-01', profitMargin: 10, income: 35000, incomeDate: '2025-07-25' }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-08-01', profitMargin: 10, income: 38000, incomeDate: null }),
      report({ projectId: pMamilla.id, subcontractorId: sAvi.id, date: '2025-09-01', profitMargin: 10, income: 35000, incomeDate: null }),
    ]);

  // Raanana Villas — Yossi Mizrahi, 11%, ~30k/mo (Feb 2025 – Oct 2025)
  const [raan0225, raan0325, raan0425, raan0525, raan0625, raan0725, raan0825, raan0925, raan1025] =
    await Promise.all([
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-02-01', profitMargin: 11, income: 30000, incomeDate: '2025-02-27' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-03-01', profitMargin: 11, income: 32000, incomeDate: '2025-03-28' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-04-01', profitMargin: 11, income: 30000, incomeDate: '2025-04-29' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-05-01', profitMargin: 11, income: 35000, incomeDate: '2025-05-28' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-06-01', profitMargin: 11, income: 30000, incomeDate: '2025-06-30' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-07-01', profitMargin: 11, income: 32000, incomeDate: '2025-07-29' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-08-01', profitMargin: 11, income: 30000, incomeDate: '2025-08-27' }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-09-01', profitMargin: 11, income: 30000, incomeDate: null }),
      report({ projectId: pRaananaVillas.id, subcontractorId: sYossi.id, date: '2025-10-01', profitMargin: 11, income: 28000, incomeDate: null }),
    ]);

  // Beer Sheva Tech — David Peretz, 9%, ~55k/mo (May 2025 – Apr 2026)
  const [bs0525, bs0625, bs0725, bs0825, bs0925, bs1025, bs1125, bs1225, bs0126, bs0226, bs0326, bs0426] =
    await Promise.all([
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-05-01', profitMargin: 9, income: 50000, incomeDate: '2025-05-30' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-06-01', profitMargin: 9, income: 55000, incomeDate: '2025-06-28' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-07-01', profitMargin: 9, income: 55000, incomeDate: '2025-07-31' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-08-01', profitMargin: 9, income: 50000, incomeDate: '2025-08-29' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-09-01', profitMargin: 9, income: 55000, incomeDate: '2025-09-30' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-10-01', profitMargin: 9, income: 55000, incomeDate: '2025-10-29' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-11-01', profitMargin: 9, income: 50000, incomeDate: '2025-11-27' }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2025-12-01', profitMargin: 9, income: 55000, incomeDate: null }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2026-01-01', profitMargin: 9, income: 50000, incomeDate: null }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2026-02-01', profitMargin: 9, income: 55000, incomeDate: null }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2026-03-01', profitMargin: 9, income: 55000, incomeDate: null }),
      report({ projectId: pBeerShevaTech.id, subcontractorId: sDavid.id, date: '2026-04-01', profitMargin: 9, income: 50000, incomeDate: null }),
    ]);

  // Herzliya Marina — Rami Dahan, 13%, ~80k/mo (Mar 2025 – Apr 2026)
  const [her0325, her0425, her0525, her0625, her0725, her0825, her0925, her1025, her1125, her1225, her0126, her0226, her0326, her0426] =
    await Promise.all([
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-03-01', profitMargin: 13, income: 75000, incomeDate: '2025-03-31' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-04-01', profitMargin: 13, income: 80000, incomeDate: '2025-04-30' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-05-01', profitMargin: 13, income: 80000, incomeDate: '2025-05-29' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-06-01', profitMargin: 13, income: 85000, incomeDate: '2025-06-30' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-07-01', profitMargin: 13, income: 80000, incomeDate: '2025-07-31' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-08-01', profitMargin: 13, income: 80000, incomeDate: '2025-08-29' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-09-01', profitMargin: 13, income: 85000, incomeDate: '2025-09-30' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-10-01', profitMargin: 13, income: 80000, incomeDate: '2025-10-31' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-11-01', profitMargin: 13, income: 80000, incomeDate: '2025-11-28' }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2025-12-01', profitMargin: 13, income: 85000, incomeDate: null }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2026-01-01', profitMargin: 13, income: 80000, incomeDate: null }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2026-02-01', profitMargin: 13, income: 80000, incomeDate: null }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2026-03-01', profitMargin: 13, income: 85000, incomeDate: null }),
      report({ projectId: pHerzliyaMarina.id, subcontractorId: sRami.id, date: '2026-04-01', profitMargin: 13, income: 80000, incomeDate: null }),
    ]);

  // Netanya Beach Resort — Avi Levi, 10%, ~65k/mo (Jun 2025 – Apr 2026)
  const [net0625, net0725, net0825, net0925, net1025, net1125, net1225, net0126, net0226, net0326, net0426] =
    await Promise.all([
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-06-01', profitMargin: 10, income: 60000, incomeDate: '2025-06-27' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-07-01', profitMargin: 10, income: 65000, incomeDate: '2025-07-28' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-08-01', profitMargin: 10, income: 65000, incomeDate: '2025-08-26' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-09-01', profitMargin: 10, income: 70000, incomeDate: '2025-09-29' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-10-01', profitMargin: 10, income: 65000, incomeDate: '2025-10-28' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-11-01', profitMargin: 10, income: 65000, incomeDate: '2025-11-27' }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2025-12-01', profitMargin: 10, income: 70000, incomeDate: null }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2026-01-01', profitMargin: 10, income: 65000, incomeDate: null }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2026-02-01', profitMargin: 10, income: 65000, incomeDate: null }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2026-03-01', profitMargin: 10, income: 70000, incomeDate: null }),
      report({ projectId: pNetanyaResort.id, subcontractorId: sAvi.id, date: '2026-04-01', profitMargin: 10, income: 65000, incomeDate: null }),
    ]);

  // Netanya Shopping Center — Yossi Mizrahi, 10%, ~28k/mo (Apr 2025 – Dec 2025)
  const [nsc0425, nsc0525, nsc0625, nsc0725, nsc0825, nsc0925, nsc1025, nsc1125, nsc1225] =
    await Promise.all([
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-04-01', profitMargin: 10, income: 28000, incomeDate: '2025-04-25' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-05-01', profitMargin: 10, income: 28000, incomeDate: '2025-05-23' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-06-01', profitMargin: 10, income: 30000, incomeDate: '2025-06-26' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-07-01', profitMargin: 10, income: 28000, incomeDate: '2025-07-25' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-08-01', profitMargin: 10, income: 28000, incomeDate: '2025-08-22' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-09-01', profitMargin: 10, income: 30000, incomeDate: '2025-09-24' }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-10-01', profitMargin: 10, income: 28000, incomeDate: null }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-11-01', profitMargin: 10, income: 28000, incomeDate: null }),
      report({ projectId: pNetanyaMall.id, subcontractorId: sYossi.id, date: '2025-12-01', profitMargin: 10, income: 30000, incomeDate: null }),
    ]);

  // Void unused vars (satisfy TS — all reports created, some only needed for their side effects)
  void [
    diz0824, diz0924, diz1024, diz1124, diz1224, diz0425, diz0525, diz0625, diz0725, diz0825,
    diz0925, diz1025, diz1125, diz1225, diz0126, diz0226, diz0326, diz0426,
    yar0325, yar0425, yar0525,
    flo0325, flo0425, flo0525, flo0625, flo0725, flo0825,
    tac0124, tac0224, tac0324, tac0424, tac0524, tac0624, tac0724, tac0824, tac0924, tac1024, tac1124, tac1224,
    haf0624, haf0724, haf0824, haf0924, haf1024, haf1124, haf1224, haf0425, haf0525, haf0625, haf0725, haf0825,
    haf0925, haf1025, haf1125, haf1225, haf0126, haf0226, haf0326, haf0426,
    car0525, car0625, car0725, car0825, car0925, car1025, car1125, car1225, car0126, car0226, car0326, car0426,
    uni0124, uni0224, uni0324, uni0424, uni0524, uni0624, uni0724, uni0824, uni0924,
    jeh0525, jeh0625, jeh0725, jeh0825, jeh0925, jeh1025, jeh1125, jeh1225, jeh0126, jeh0226, jeh0326, jeh0426,
    mam0225, mam0325, mam0525, mam0625, mam0725, mam0825, mam0925,
    raan0325, raan0425, raan0625, raan0725, raan0825, raan0925, raan1025,
    bs0625, bs0725, bs0825, bs0925, bs1025, bs1125, bs1225, bs0126, bs0226, bs0326, bs0426,
    her0425, her0525, her0625, her0725, her0825, her0925, her1025, her1125, her1225, her0126, her0226, her0326, her0426,
    net0725, net0825, net0925, net1025, net1125, net1225, net0126, net0226, net0326, net0426,
    nsc0525, nsc0625, nsc0725, nsc0825, nsc0925, nsc1025, nsc1125, nsc1225,
  ];

  // ── Corporation Payments ──────────────────────────────────────────────────
  await prisma.corporationPayment.createMany({
    data: [
      // Dizengoff — recurring electro + aqua
      { projectReportId: diz0125.id, corporationId: cElectro.id, amount: 5000, date: d('2025-01-20') },
      { projectReportId: diz0125.id, corporationId: cAqua.id,   amount: 3000, date: d('2025-01-22') },
      { projectReportId: diz0225.id, corporationId: cElectro.id, amount: 5000, date: d('2025-02-18') },
      { projectReportId: diz0225.id, corporationId: cTile.id,    amount: 4000, date: d('2025-02-19') },
      { projectReportId: diz0325.id, corporationId: cElectro.id, amount: 4500, date: d('2025-03-20') },
      { projectReportId: diz0425.id, corporationId: cElectro.id, amount: 5000, isFuture: true },
      { projectReportId: diz0425.id, corporationId: cGlass.id,   amount: 6000, isFuture: true },

      // Yarkon
      { projectReportId: yar0225.id, corporationId: cAqua.id,   amount: 2000, date: d('2025-02-14') },
      { projectReportId: yar0125.id, corporationId: cTile.id,   amount: 1500, date: d('2025-01-18') },

      // Florentin
      { projectReportId: flo0325.id, corporationId: cElectro.id, amount: 2000, date: d('2025-03-22') },
      { projectReportId: flo0425.id, corporationId: cElectro.id, amount: 2000, date: d('2025-04-24') },
      { projectReportId: flo0525.id, corporationId: cTile.id,    amount: 3000, date: d('2025-05-23') },
      { projectReportId: flo0625.id, corporationId: cElectro.id, amount: 2000, isFuture: true },

      // Haifa Harbor — electro + aqua + iron
      { projectReportId: haf0125.id, corporationId: cElectro.id, amount: 8000, date: d('2025-01-28') },
      { projectReportId: haf0225.id, corporationId: cElectro.id, amount: 8000, date: d('2025-02-25') },
      { projectReportId: haf0225.id, corporationId: cAqua.id,    amount: 5000, date: d('2025-02-26') },
      { projectReportId: haf0325.id, corporationId: cElectro.id, amount: 8000, isFuture: true },
      { projectReportId: haf0325.id, corporationId: cIron.id,    amount: 10000, date: d('2025-03-28') },
      { projectReportId: haf0425.id, corporationId: cElectro.id, amount: 8000, date: d('2025-04-26') },
      { projectReportId: haf0425.id, corporationId: cIron.id,    amount: 10000, date: d('2025-04-28') },
      { projectReportId: haf0525.id, corporationId: cIron.id,    amount: 10000, isFuture: true },

      // Carmel Gardens
      { projectReportId: car0125.id, corporationId: cElectro.id, amount: 4000, date: d('2025-01-29') },
      { projectReportId: car0225.id, corporationId: cElectro.id, amount: 4000, date: d('2025-02-26') },
      { projectReportId: car0225.id, corporationId: cAqua.id,    amount: 3000, date: d('2025-02-27') },
      { projectReportId: car0325.id, corporationId: cElectro.id, amount: 4000, date: d('2025-03-27') },
      { projectReportId: car0425.id, corporationId: cElectro.id, amount: 4000, date: d('2025-04-25') },
      { projectReportId: car0425.id, corporationId: cCool.id,    amount: 5000, date: d('2025-04-26') },
      { projectReportId: car0525.id, corporationId: cCool.id,    amount: 5000, isFuture: true },

      // Jerusalem Hotel — big corps
      { projectReportId: jeh0425.id, corporationId: cElectro.id, amount: 10000, date: d('2025-04-30') },
      { projectReportId: jeh0425.id, corporationId: cIron.id,    amount: 15000, date: d('2025-04-29') },
      { projectReportId: jeh0525.id, corporationId: cElectro.id, amount: 10000, date: d('2025-05-30') },
      { projectReportId: jeh0525.id, corporationId: cAqua.id,    amount: 8000, date: d('2025-05-29') },
      { projectReportId: jeh0625.id, corporationId: cElectro.id, amount: 10000, date: d('2025-06-30') },
      { projectReportId: jeh0625.id, corporationId: cGlass.id,   amount: 12000, date: d('2025-06-28') },
      { projectReportId: jeh0725.id, corporationId: cElectro.id, amount: 10000, isFuture: true },
      { projectReportId: jeh0725.id, corporationId: cCool.id,    amount: 8000, isFuture: true },

      // Mamilla
      { projectReportId: mam0125.id, corporationId: cTile.id,    amount: 4000, date: d('2025-01-24') },
      { projectReportId: mam0225.id, corporationId: cTile.id,    amount: 4000, date: d('2025-02-21') },
      { projectReportId: mam0325.id, corporationId: cGlass.id,   amount: 5000, date: d('2025-03-26') },
      { projectReportId: mam0425.id, corporationId: cElectro.id, amount: 3000, date: d('2025-04-25') },
      { projectReportId: mam0525.id, corporationId: cElectro.id, amount: 3000, isFuture: true },

      // Raanana
      { projectReportId: raan0225.id, corporationId: cElectro.id, amount: 3000, date: d('2025-02-28') },
      { projectReportId: raan0325.id, corporationId: cElectro.id, amount: 3000, date: d('2025-03-29') },
      { projectReportId: raan0425.id, corporationId: cAqua.id,    amount: 2500, date: d('2025-04-30') },
      { projectReportId: raan0525.id, corporationId: cTile.id,    amount: 4000, isFuture: true },

      // Beer Sheva
      { projectReportId: bs0525.id, corporationId: cElectro.id, amount: 5000, date: d('2025-05-31') },
      { projectReportId: bs0625.id, corporationId: cElectro.id, amount: 5000, date: d('2025-06-30') },
      { projectReportId: bs0625.id, corporationId: cIron.id,    amount: 8000, date: d('2025-06-27') },
      { projectReportId: bs0725.id, corporationId: cIron.id,    amount: 8000, date: d('2025-07-30') },
      { projectReportId: bs0825.id, corporationId: cElectro.id, amount: 5000, isFuture: true },

      // Herzliya Marina
      { projectReportId: her0325.id, corporationId: cElectro.id, amount: 8000, date: d('2025-03-28') },
      { projectReportId: her0325.id, corporationId: cGlass.id,   amount: 10000, date: d('2025-03-29') },
      { projectReportId: her0425.id, corporationId: cElectro.id, amount: 8000, date: d('2025-04-30') },
      { projectReportId: her0425.id, corporationId: cGlass.id,   amount: 10000, date: d('2025-04-28') },
      { projectReportId: her0525.id, corporationId: cCool.id,    amount: 7000, date: d('2025-05-30') },
      { projectReportId: her0625.id, corporationId: cCool.id,    amount: 7000, isFuture: true },
      { projectReportId: her0625.id, corporationId: cElectro.id, amount: 8000, isFuture: true },

      // Netanya Resort
      { projectReportId: net0625.id, corporationId: cElectro.id, amount: 6000, date: d('2025-06-28') },
      { projectReportId: net0725.id, corporationId: cElectro.id, amount: 6000, date: d('2025-07-29') },
      { projectReportId: net0725.id, corporationId: cAqua.id,    amount: 5000, date: d('2025-07-30') },
      { projectReportId: net0825.id, corporationId: cTile.id,    amount: 7000, date: d('2025-08-27') },
      { projectReportId: net0925.id, corporationId: cTile.id,    amount: 7000, isFuture: true },

      // Netanya Mall
      { projectReportId: nsc0425.id, corporationId: cElectro.id, amount: 2500, date: d('2025-04-28') },
      { projectReportId: nsc0525.id, corporationId: cElectro.id, amount: 2500, date: d('2025-05-26') },
      { projectReportId: nsc0625.id, corporationId: cTile.id,    amount: 3000, date: d('2025-06-27') },
      { projectReportId: nsc0725.id, corporationId: cElectro.id, amount: 2500, isFuture: true },
    ],
  });

  // ── Subcontractor Payments ────────────────────────────────────────────────
  await prisma.subcontractorPayment.createMany({
    data: [
      // Moshe on Dizengoff (Jan-Apr 2025 partial)
      // Jan: owed = 50000 - 5000 - 5000 - 3000 = 37000
      { subcontractorId: sMoshe.id, projectId: pDizengoff.id, serviceDate: d('2025-01-01'), amount: 30000 },
      // Feb: owed = 50000 - 5000 - 5000 - 4000 = 36000
      { subcontractorId: sMoshe.id, projectId: pDizengoff.id, serviceDate: d('2025-02-01'), amount: 30000 },
      // Mar: owed = 45000 - 4500 - 4500 = 36000
      { subcontractorId: sMoshe.id, projectId: pDizengoff.id, serviceDate: d('2025-03-01'), amount: 30000 },

      // Moshe on Haifa Harbor (Jan-Apr 2025 partial)
      // Jan: owed = 80000 - 6400 - 8000 = 65600
      { subcontractorId: sMoshe.id, projectId: pHaifaHarbor.id, serviceDate: d('2025-01-01'), amount: 50000 },
      // Feb: owed = 80000 - 6400 - 8000 - 5000 = 60600
      { subcontractorId: sMoshe.id, projectId: pHaifaHarbor.id, serviceDate: d('2025-02-01'), amount: 50000 },
      // Mar: owed = 75000 - 6000 - 10000 = 59000
      { subcontractorId: sMoshe.id, projectId: pHaifaHarbor.id, serviceDate: d('2025-03-01'), amount: 45000 },
      // Apr: owed = 80000 - 6400 - 8000 - 10000 = 55600
      { subcontractorId: sMoshe.id, projectId: pHaifaHarbor.id, serviceDate: d('2025-04-01'), amount: 45000 },

      // Avi on Yarkon (Jan-Apr 2025)
      // Jan: owed = 20000 - 2400 - 1500 = 16100
      { subcontractorId: sAvi.id, projectId: pYarkon.id, serviceDate: d('2025-01-01'), amount: 14000 },
      // Feb: owed = 20000 - 2400 - 2000 = 15600
      { subcontractorId: sAvi.id, projectId: pYarkon.id, serviceDate: d('2025-02-01'), amount: 12000 },
      // Mar: owed = 18000 - 2160 = 15840
      { subcontractorId: sAvi.id, projectId: pYarkon.id, serviceDate: d('2025-03-01'), amount: 13000 },

      // Avi on Mamilla (Jan-Apr 2025)
      // Jan: owed = 35000 - 3500 - 4000 = 27500
      { subcontractorId: sAvi.id, projectId: pMamilla.id, serviceDate: d('2025-01-01'), amount: 22000 },
      // Feb: owed = 35000 - 3500 - 4000 = 27500
      { subcontractorId: sAvi.id, projectId: pMamilla.id, serviceDate: d('2025-02-01'), amount: 22000 },
      // Mar: owed = 40000 - 4000 - 5000 = 31000
      { subcontractorId: sAvi.id, projectId: pMamilla.id, serviceDate: d('2025-03-01'), amount: 25000 },
      // Apr: owed = 35000 - 3500 - 3000 = 28500
      { subcontractorId: sAvi.id, projectId: pMamilla.id, serviceDate: d('2025-04-01'), amount: 22000 },

      // Yossi on Florentin (Mar-Jun 2025)
      // Mar: owed = 18000 - 1980 - 2000 = 14020
      { subcontractorId: sYossi.id, projectId: pFlorentinLofts.id, serviceDate: d('2025-03-01'), amount: 12000 },
      // Apr: owed = 18000 - 1980 - 2000 = 14020
      { subcontractorId: sYossi.id, projectId: pFlorentinLofts.id, serviceDate: d('2025-04-01'), amount: 12000 },
      // May: owed = 20000 - 2200 - 3000 = 14800
      { subcontractorId: sYossi.id, projectId: pFlorentinLofts.id, serviceDate: d('2025-05-01'), amount: 12000 },

      // Yossi on Raanana (Feb-May 2025)
      // Feb: owed = 30000 - 3300 - 3000 = 23700
      { subcontractorId: sYossi.id, projectId: pRaananaVillas.id, serviceDate: d('2025-02-01'), amount: 18000 },
      // Mar: owed = 32000 - 3520 - 3000 = 25480
      { subcontractorId: sYossi.id, projectId: pRaananaVillas.id, serviceDate: d('2025-03-01'), amount: 20000 },
      // Apr: owed = 30000 - 3300 - 2500 = 24200
      { subcontractorId: sYossi.id, projectId: pRaananaVillas.id, serviceDate: d('2025-04-01'), amount: 18000 },

      // Yossi on Netanya Mall (Apr-Jun 2025)
      // Apr: owed = 28000 - 2800 - 2500 = 22700
      { subcontractorId: sYossi.id, projectId: pNetanyaMall.id, serviceDate: d('2025-04-01'), amount: 18000 },
      // May: owed = 28000 - 2800 - 2500 = 22700
      { subcontractorId: sYossi.id, projectId: pNetanyaMall.id, serviceDate: d('2025-05-01'), amount: 18000 },
      // Jun: owed = 30000 - 3000 - 3000 = 24000
      { subcontractorId: sYossi.id, projectId: pNetanyaMall.id, serviceDate: d('2025-06-01'), amount: 19000 },

      // David on Beer Sheva (May-Jul 2025)
      // May: owed = 50000 - 4500 - 5000 = 40500
      { subcontractorId: sDavid.id, projectId: pBeerShevaTech.id, serviceDate: d('2025-05-01'), amount: 32000 },
      // Jun: owed = 55000 - 4950 - 5000 - 8000 = 37050
      { subcontractorId: sDavid.id, projectId: pBeerShevaTech.id, serviceDate: d('2025-06-01'), amount: 30000 },
      // Jul: owed = 55000 - 4950 - 8000 = 42050
      { subcontractorId: sDavid.id, projectId: pBeerShevaTech.id, serviceDate: d('2025-07-01'), amount: 35000 },

      // Shlomo on Carmel Gardens (Jan-Apr 2025)
      // Jan: owed = 40000 - 4000 - 4000 = 32000
      { subcontractorId: sShlomo.id, projectId: pCarmelGardens.id, serviceDate: d('2025-01-01'), amount: 26000 },
      // Feb: owed = 42000 - 4200 - 4000 - 3000 = 30800
      { subcontractorId: sShlomo.id, projectId: pCarmelGardens.id, serviceDate: d('2025-02-01'), amount: 25000 },
      // Mar: owed = 45000 - 4500 - 4000 = 36500
      { subcontractorId: sShlomo.id, projectId: pCarmelGardens.id, serviceDate: d('2025-03-01'), amount: 30000 },
      // Apr: owed = 45000 - 4500 - 4000 - 5000 = 31500
      { subcontractorId: sShlomo.id, projectId: pCarmelGardens.id, serviceDate: d('2025-04-01'), amount: 26000 },

      // Shlomo on Jerusalem Hotel (Apr-Jun 2025)
      // Apr: owed = 100000 - 12000 - 10000 - 15000 = 63000
      { subcontractorId: sShlomo.id, projectId: pJerusalemHotel.id, serviceDate: d('2025-04-01'), amount: 50000 },
      // May: owed = 100000 - 12000 - 10000 - 8000 = 70000
      { subcontractorId: sShlomo.id, projectId: pJerusalemHotel.id, serviceDate: d('2025-05-01'), amount: 55000 },
      // Jun: owed = 105000 - 12600 - 10000 - 12000 = 70400
      { subcontractorId: sShlomo.id, projectId: pJerusalemHotel.id, serviceDate: d('2025-06-01'), amount: 55000 },

      // Rami on Herzliya Marina (Mar-May 2025)
      // Mar: owed = 75000 - 9750 - 8000 - 10000 = 47250
      { subcontractorId: sRami.id, projectId: pHerzliyaMarina.id, serviceDate: d('2025-03-01'), amount: 38000 },
      // Apr: owed = 80000 - 10400 - 8000 - 10000 = 51600
      { subcontractorId: sRami.id, projectId: pHerzliyaMarina.id, serviceDate: d('2025-04-01'), amount: 40000 },
      // May: owed = 80000 - 10400 - 7000 = 62600
      { subcontractorId: sRami.id, projectId: pHerzliyaMarina.id, serviceDate: d('2025-05-01'), amount: 50000 },

      // Avi on Netanya Resort (Jun-Aug 2025)
      // Jun: owed = 60000 - 6000 - 6000 = 48000
      { subcontractorId: sAvi.id, projectId: pNetanyaResort.id, serviceDate: d('2025-06-01'), amount: 38000 },
      // Jul: owed = 65000 - 6500 - 6000 - 5000 = 47500
      { subcontractorId: sAvi.id, projectId: pNetanyaResort.id, serviceDate: d('2025-07-01'), amount: 38000 },
      // Aug: owed = 65000 - 6500 - 7000 = 51500
      { subcontractorId: sAvi.id, projectId: pNetanyaResort.id, serviceDate: d('2025-08-01'), amount: 40000 },
    ],
  });

  console.log('Mock data seeded.');
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedMockData();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
