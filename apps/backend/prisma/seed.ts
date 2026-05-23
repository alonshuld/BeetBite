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

  // ── Clients (30) ──────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.create({ data: { name: 'Tel Aviv Properties Ltd' } }),
    prisma.client.create({ data: { name: 'Haifa Builders Group' } }),
    prisma.client.create({ data: { name: 'Jerusalem Develop Corp' } }),
    prisma.client.create({ data: { name: 'Raanana Real Estate' } }),
    prisma.client.create({ data: { name: 'Beer Sheva Contractors' } }),
    prisma.client.create({ data: { name: 'Herzliya Premium Build' } }),
    prisma.client.create({ data: { name: 'Netanya Coastal Projects' } }),
    prisma.client.create({ data: { name: 'Rehovot Construction Co' } }),
    prisma.client.create({ data: { name: 'Petah Tikva Development' } }),
    prisma.client.create({ data: { name: 'Holon Builders Alliance' } }),
    prisma.client.create({ data: { name: 'Rishon LeZion Holdings' } }),
    prisma.client.create({ data: { name: 'Modiin Modern Structures' } }),
    prisma.client.create({ data: { name: 'Ashdod Maritime Build' } }),
    prisma.client.create({ data: { name: 'Ashkelon Coastal Works' } }),
    prisma.client.create({ data: { name: 'Beersheba Tech Campus Ltd' } }),
    prisma.client.create({ data: { name: 'Afula Regional Projects' } }),
    prisma.client.create({ data: { name: 'Safed Mountain Development' } }),
    prisma.client.create({ data: { name: 'Tiberias Hospitality Group' } }),
    prisma.client.create({ data: { name: 'Eilat Resort Developers' } }),
    prisma.client.create({ data: { name: 'Upper Galilee Consortium' } }),
    prisma.client.create({ data: { name: 'Samaria Industrial Corp' } }),
    prisma.client.create({ data: { name: 'Central Valley Construction' } }),
    prisma.client.create({ data: { name: 'Negev Expansion Partners' } }),
    prisma.client.create({ data: { name: 'Mediterranean Luxury Homes' } }),
    prisma.client.create({ data: { name: 'Green Valley Properties' } }),
    prisma.client.create({ data: { name: 'Urban Renewal Specialists' } }),
    prisma.client.create({ data: { name: 'Heritage Restoration Ltd' } }),
    prisma.client.create({ data: { name: 'Smart City Solutions Inc' } }),
    prisma.client.create({ data: { name: 'Industrial Zone Authority' } }),
    prisma.client.create({ data: { name: 'Suburban Residential Trust' } }),
  ]);

  // ── Subcontractors (15) ───────────────────────────────────────────────────
  const subcontractors = await Promise.all([
    prisma.subcontractor.create({ data: { name: 'Moshe Cohen' } }),
    prisma.subcontractor.create({ data: { name: 'Avi Levi' } }),
    prisma.subcontractor.create({ data: { name: 'Yossi Mizrahi' } }),
    prisma.subcontractor.create({ data: { name: 'David Peretz' } }),
    prisma.subcontractor.create({ data: { name: 'Shlomo Ben-David' } }),
    prisma.subcontractor.create({ data: { name: 'Rami Dahan' } }),
    prisma.subcontractor.create({ data: { name: 'Eli Rosenblum' } }),
    prisma.subcontractor.create({ data: { name: 'Gabriel Schwartz' } }),
    prisma.subcontractor.create({ data: { name: 'Yaniv Goldman' } }),
    prisma.subcontractor.create({ data: { name: 'Noam Shalit' } }),
    prisma.subcontractor.create({ data: { name: 'Arik Barkai' } }),
    prisma.subcontractor.create({ data: { name: 'Itay Nir' } }),
    prisma.subcontractor.create({ data: { name: 'Uri Zuckerman' } }),
    prisma.subcontractor.create({ data: { name: 'Moti Berkman' } }),
    prisma.subcontractor.create({ data: { name: 'Tal Golan' } }),
  ]);

  // ── Corporations (12) ─────────────────────────────────────────────────────
  const corporations = await Promise.all([
    prisma.corporation.create({ data: { name: 'ElectroPro Solutions' } }),
    prisma.corporation.create({ data: { name: 'AquaPlumbing Services' } }),
    prisma.corporation.create({ data: { name: 'IronSteel Structures' } }),
    prisma.corporation.create({ data: { name: 'GlassMaster Windows' } }),
    prisma.corporation.create({ data: { name: 'TileKing Flooring' } }),
    prisma.corporation.create({ data: { name: 'CoolAir HVAC Systems' } }),
    prisma.corporation.create({ data: { name: 'PaintPro Finishing' } }),
    prisma.corporation.create({ data: { name: 'WoodWorks Carpentry' } }),
    prisma.corporation.create({ data: { name: 'ConcreteForce Foundations' } }),
    prisma.corporation.create({ data: { name: 'RoofGuard Specialists' } }),
    prisma.corporation.create({ data: { name: 'SecurityTech Installations' } }),
    prisma.corporation.create({ data: { name: 'LandscapeDesign Pro' } }),
  ]);

  // ── Projects (35) ─────────────────────────────────────────────────────────
  // Closed projects (2024, isDone: true)
  const closedProjects = await Promise.all([
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: 'Tel Aviv Central Renewal',
        estimatedAmount: 300000,
        description: 'Central bus station area renovation',
        isDone: true,
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[1].id,
        name: 'Haifa University Annex',
        estimatedAmount: 250000,
        description: 'New administrative annex for the university',
        isDone: true,
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[3].id,
        name: 'Raanana Shopping Complex Phase 1',
        estimatedAmount: 450000,
        description: 'First phase of mall expansion project',
        isDone: true,
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[7].id,
        name: 'Rehovot Medical Center Wing',
        estimatedAmount: 520000,
        description: 'New pediatric ward construction',
        isDone: true,
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[8].id,
        name: 'Petah Tikva School Complex',
        estimatedAmount: 380000,
        description: 'Primary school with sports facilities',
        isDone: true,
      },
    }),
  ]);

  // Active projects (with ongoing reports)
  const activeProjects = await Promise.all([
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: 'Dizengoff Tower Renovation',
        estimatedAmount: 500000,
        description: 'Full renovation of a 12-story tower on Dizengoff St',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: 'Yarkon Park Residence',
        estimatedAmount: 200000,
        description: 'Residential complex near Yarkon Park',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: 'Florentin Lofts Conversion',
        estimatedAmount: 180000,
        description: 'Industrial loft conversion in Florentin neighborhood',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[1].id,
        name: 'Haifa Harbor Complex',
        estimatedAmount: 800000,
        description: 'Commercial complex at the Haifa harbor area',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[1].id,
        name: 'Carmel Gardens Residences',
        estimatedAmount: 450000,
        description: 'Luxury residential complex on Mount Carmel',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[2].id,
        name: 'Jerusalem Old City Hotel',
        estimatedAmount: 1200000,
        description: 'Boutique hotel construction near the Old City walls',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[2].id,
        name: 'Mamilla Mall Extension',
        estimatedAmount: 400000,
        description: 'Extension of the Mamilla open-air mall',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[3].id,
        name: 'Raanana Villa Complex',
        estimatedAmount: 350000,
        description: 'Upscale villa development in northern Raanana',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[4].id,
        name: 'Beer Sheva Tech Campus',
        estimatedAmount: 600000,
        description: 'Technology campus for the cyber district',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[5].id,
        name: 'Herzliya Marina Towers',
        estimatedAmount: 900000,
        description: 'Twin residential towers overlooking the marina',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[6].id,
        name: 'Netanya Beach Resort',
        estimatedAmount: 750000,
        description: 'Luxury beach resort on the northern coast',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[6].id,
        name: 'Netanya Shopping Center',
        estimatedAmount: 300000,
        description: 'Modern shopping center in the city center',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[7].id,
        name: 'Rehovot Research Park',
        estimatedAmount: 650000,
        description: 'Science and technology park development',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[8].id,
        name: 'Petah Tikva Commercial District',
        estimatedAmount: 480000,
        description: 'Mixed-use commercial and residential complex',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[9].id,
        name: 'Holon Industrial Park',
        estimatedAmount: 720000,
        description: 'Modern logistics and manufacturing facilities',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[10].id,
        name: 'Rishon LeZion Office Tower',
        estimatedAmount: 550000,
        description: 'Class A office building with parking complex',
      },
    }),
  ]);

  // Future projects (no reports yet)
  await Promise.all([
    prisma.project.create({
      data: {
        clientId: clients[2].id,
        name: 'Jerusalem Tech Hub',
        estimatedAmount: 550000,
        description: 'Modern tech campus in Malha area',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[11].id,
        name: 'Modiin Cultural Center',
        estimatedAmount: 420000,
        description: 'Concert hall and arts facility',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[12].id,
        name: 'Ashdod Port Terminal',
        estimatedAmount: 900000,
        description: 'Container terminal expansion',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[13].id,
        name: 'Ashkelon Water Treatment Facility',
        estimatedAmount: 1100000,
        description: 'Advanced desalination plant',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[14].id,
        name: 'Cyber Security HQ Expansion',
        estimatedAmount: 850000,
        description: 'Government cybersecurity operations center',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[15].id,
        name: 'Afula Agricultural Hub',
        estimatedAmount: 380000,
        description: 'Regional agricultural processing center',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[16].id,
        name: 'Safed Tourist Complex',
        estimatedAmount: 620000,
        description: 'Hotel and entertainment complex in Safed',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[17].id,
        name: 'Tiberias Marina Development',
        estimatedAmount: 780000,
        description: 'Waterfront resort and marina project',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[18].id,
        name: 'Eilat International Airport Terminal',
        estimatedAmount: 950000,
        description: 'New passenger terminal and facilities',
      },
    }),
    prisma.project.create({
      data: {
        clientId: clients[19].id,
        name: 'Upper Galilee Forest Lodge',
        estimatedAmount: 380000,
        description: 'Eco-tourism resort with sustainable design',
      },
    }),
  ]);



  // ── Project Reports (selective for closed and active projects) ────────────
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

  // Closed project reports (full 12 months of 2024)
  const reportsClosedTA = await Promise.all([
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-01-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-01-17',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-02-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-02-14',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-03-01',
      profitMargin: 9,
      income: 28000,
      incomeDate: '2024-03-19',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-04-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-04-16',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-05-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-05-20',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-06-01',
      profitMargin: 9,
      income: 30000,
      incomeDate: '2024-06-18',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-07-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-07-22',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-08-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-08-15',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-09-01',
      profitMargin: 9,
      income: 28000,
      incomeDate: '2024-09-17',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-10-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-10-21',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-11-01',
      profitMargin: 9,
      income: 25000,
      incomeDate: '2024-11-19',
    }),
    report({
      projectId: closedProjects[0].id,
      subcontractorId: subcontractors[3].id,
      date: '2024-12-01',
      profitMargin: 9,
      income: 30000,
      incomeDate: '2024-12-23',
    }),
  ]);

  // Haifa University (9 months, Jan-Sep 2024)
  const reportsClosedHaifa = await Promise.all([
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-01-01',
      profitMargin: 11,
      income: 25000,
      incomeDate: '2024-01-24',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-02-01',
      profitMargin: 11,
      income: 25000,
      incomeDate: '2024-02-22',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-03-01',
      profitMargin: 11,
      income: 28000,
      incomeDate: '2024-03-21',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-04-01',
      profitMargin: 11,
      income: 25000,
      incomeDate: '2024-04-18',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-05-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: '2024-05-23',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-06-01',
      profitMargin: 11,
      income: 28000,
      incomeDate: '2024-06-20',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-07-01',
      profitMargin: 11,
      income: 25000,
      incomeDate: '2024-07-25',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-08-01',
      profitMargin: 11,
      income: 25000,
      incomeDate: '2024-08-22',
    }),
    report({
      projectId: closedProjects[1].id,
      subcontractorId: subcontractors[5].id,
      date: '2024-09-01',
      profitMargin: 11,
      income: 28000,
      incomeDate: '2024-09-26',
    }),
  ]);

  // Raanana Shopping Phase 1 (12 months, 2024)
  const reportsClosedRaanana = await Promise.all([
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-01-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2024-01-28',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-02-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2024-02-25',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-03-01',
      profitMargin: 10,
      income: 40000,
      incomeDate: '2024-03-26',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-04-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2024-04-24',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-05-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2024-05-27',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-06-01',
      profitMargin: 10,
      income: 40000,
      incomeDate: '2024-06-25',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-07-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2024-07-28',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-08-01',
      profitMargin: 10,
      income: 40000,
      incomeDate: '2024-08-26',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-09-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2024-09-29',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-10-01',
      profitMargin: 10,
      income: 42000,
      incomeDate: '2024-10-27',
    }),
    report({
      projectId: closedProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2024-11-01',
      profitMargin: 10,
      income: 40000,
      incomeDate: '2024-11-28',
    }),
  ]);

  // Rehovot Medical Center (10 months, Jan-Oct 2024)
  const reportsClosedRehovot = await Promise.all([
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-01-01',
      profitMargin: 8,
      income: 45000,
      incomeDate: '2024-01-20',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-02-01',
      profitMargin: 8,
      income: 45000,
      incomeDate: '2024-02-18',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-03-01',
      profitMargin: 8,
      income: 48000,
      incomeDate: '2024-03-22',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-04-01',
      profitMargin: 8,
      income: 45000,
      incomeDate: '2024-04-19',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-05-01',
      profitMargin: 8,
      income: 50000,
      incomeDate: '2024-05-24',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-06-01',
      profitMargin: 8,
      income: 48000,
      incomeDate: '2024-06-21',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-07-01',
      profitMargin: 8,
      income: 45000,
      incomeDate: '2024-07-26',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-08-01',
      profitMargin: 8,
      income: 50000,
      incomeDate: '2024-08-23',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-09-01',
      profitMargin: 8,
      income: 48000,
      incomeDate: '2024-09-25',
    }),
    report({
      projectId: closedProjects[3].id,
      subcontractorId: subcontractors[6].id,
      date: '2024-10-01',
      profitMargin: 8,
      income: 52000,
      incomeDate: '2024-10-28',
    }),
  ]);

  // Petah Tikva School (8 months, Jan-Aug 2024)
  const reportsClosedPetah = await Promise.all([
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-01-01',
      profitMargin: 9,
      income: 35000,
      incomeDate: '2024-01-25',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-02-01',
      profitMargin: 9,
      income: 35000,
      incomeDate: '2024-02-23',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-03-01',
      profitMargin: 9,
      income: 38000,
      incomeDate: '2024-03-24',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-04-01',
      profitMargin: 9,
      income: 35000,
      incomeDate: '2024-04-21',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-05-01',
      profitMargin: 9,
      income: 35000,
      incomeDate: '2024-05-28',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-06-01',
      profitMargin: 9,
      income: 40000,
      incomeDate: '2024-06-26',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-07-01',
      profitMargin: 9,
      income: 35000,
      incomeDate: '2024-07-27',
    }),
    report({
      projectId: closedProjects[4].id,
      subcontractorId: subcontractors[7].id,
      date: '2024-08-01',
      profitMargin: 9,
      income: 38000,
      incomeDate: '2024-08-29',
    }),
  ]);

  // Active project reports (2025-2026 partial data)
  const reportsDizengoff = await Promise.all(
    Array.from({ length: 21 }, (_, i) => {
      const month = (i % 12) + 1;
      const year = 2024 + Math.floor((8 + i) / 12);
      const income = [50000, 50000, 52000, 48000, 55000, 50000, 50000, 45000, 48000, 50000, 52000, 48000][month - 1];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 17 ? `${year}-${String(month).padStart(2, '0')}-${String(14 + Math.floor(Math.random() * 10)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[0].id,
        subcontractorId: subcontractors[0].id,
        date: dateStr,
        profitMargin: 10,
        income,
        incomeDate,
      });
    })
  );

  // Yarkon Park (5 months, Jan-May 2025)
  const reportsYarkon = await Promise.all([
    report({
      projectId: activeProjects[1].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-01-01',
      profitMargin: 12,
      income: 20000,
      incomeDate: '2025-01-10',
    }),
    report({
      projectId: activeProjects[1].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-02-01',
      profitMargin: 12,
      income: 20000,
      incomeDate: '2025-02-12',
    }),
    report({
      projectId: activeProjects[1].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-03-01',
      profitMargin: 12,
      income: 18000,
      incomeDate: '2025-03-14',
    }),
    report({
      projectId: activeProjects[1].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-04-01',
      profitMargin: 12,
      income: 20000,
      incomeDate: '2025-04-16',
    }),
    report({
      projectId: activeProjects[1].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-05-01',
      profitMargin: 12,
      income: 20000,
      incomeDate: null,
    }),
  ]);

  // Florentin Lofts (6 months, Mar-Aug 2025)
  const reportsFlorentin = await Promise.all([
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-03-01',
      profitMargin: 11,
      income: 18000,
      incomeDate: '2025-03-20',
    }),
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-04-01',
      profitMargin: 11,
      income: 18000,
      incomeDate: '2025-04-22',
    }),
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-05-01',
      profitMargin: 11,
      income: 20000,
      incomeDate: '2025-05-21',
    }),
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-06-01',
      profitMargin: 11,
      income: 18000,
      incomeDate: '2025-06-19',
    }),
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-07-01',
      profitMargin: 11,
      income: 18000,
      incomeDate: null,
    }),
    report({
      projectId: activeProjects[2].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-08-01',
      profitMargin: 11,
      income: 16000,
      incomeDate: null,
    }),
  ]);

  // Haifa Harbor (23 months, Jun 2024 - Apr 2026)
  const reportsHaifa = await Promise.all(
    Array.from({ length: 23 }, (_, i) => {
      const baseMonth = 6 + i;
      const month = ((baseMonth - 1) % 12) + 1;
      const year = 2024 + Math.floor((baseMonth - 1) / 12);
      const incomes = [75000, 80000, 80000, 85000, 80000, 80000, 90000, 80000, 80000, 75000, 80000, 80000, 85000, 80000, 80000, 80000, 85000, 80000, 80000, 80000, 85000, 80000, 80000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 19 ? `${year}-${String(month).padStart(2, '0')}-${String(18 + Math.floor(Math.random() * 10)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[3].id,
        subcontractorId: subcontractors[0].id,
        date: dateStr,
        profitMargin: 8,
        income,
        incomeDate,
      });
    })
  );

  // Carmel Gardens (16 months, Jan 2025 - Apr 2026)
  const reportsCarmel = await Promise.all(
    Array.from({ length: 16 }, (_, i) => {
      const month = (i % 12) + 1;
      const year = 2025 + Math.floor(i / 12);
      const incomes = [40000, 42000, 45000, 45000, 40000, 45000, 42000, 45000, 40000, 45000, 42000, 45000, 40000, 42000, 45000, 40000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 12 ? `${year}-${String(month).padStart(2, '0')}-${String(24 + Math.floor(Math.random() * 5)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[4].id,
        subcontractorId: subcontractors[4].id,
        date: dateStr,
        profitMargin: 10,
        income,
        incomeDate,
      });
    })
  );

  // Jerusalem Hotel (13 months, Apr 2025 - Apr 2026)
  const reportsJerusalem = await Promise.all(
    Array.from({ length: 13 }, (_, i) => {
      const month = (i + 4) % 12 || 12;
      const year = 2025 + Math.floor((i + 3) / 12);
      const incomes = [100000, 100000, 105000, 100000, 100000, 110000, 100000, 100000, 105000, 100000, 100000, 105000, 100000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 9 ? `${year}-${String(month).padStart(2, '0')}-${String(26 + Math.floor(Math.random() * 4)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[5].id,
        subcontractorId: subcontractors[4].id,
        date: dateStr,
        profitMargin: 12,
        income,
        incomeDate,
      });
    })
  );

  // Mamilla (9 months, Jan-Sep 2025)
  const reportsMamilla = await Promise.all([
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-01-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2025-01-22',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-02-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2025-02-19',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-03-01',
      profitMargin: 10,
      income: 40000,
      incomeDate: '2025-03-24',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-04-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2025-04-23',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-05-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: '2025-05-26',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-06-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2025-06-24',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-07-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: '2025-07-25',
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-08-01',
      profitMargin: 10,
      income: 38000,
      incomeDate: null,
    }),
    report({
      projectId: activeProjects[6].id,
      subcontractorId: subcontractors[1].id,
      date: '2025-09-01',
      profitMargin: 10,
      income: 35000,
      incomeDate: null,
    }),
  ]);

  // Raanana Villas (9 months, Feb-Oct 2025)
  const reportsRaanana = await Promise.all([
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-02-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: '2025-02-27',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-03-01',
      profitMargin: 11,
      income: 32000,
      incomeDate: '2025-03-28',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-04-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: '2025-04-29',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-05-01',
      profitMargin: 11,
      income: 35000,
      incomeDate: '2025-05-28',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-06-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: '2025-06-30',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-07-01',
      profitMargin: 11,
      income: 32000,
      incomeDate: '2025-07-29',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-08-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: '2025-08-27',
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-09-01',
      profitMargin: 11,
      income: 30000,
      incomeDate: null,
    }),
    report({
      projectId: activeProjects[7].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-10-01',
      profitMargin: 11,
      income: 28000,
      incomeDate: null,
    }),
  ]);

  // Beer Sheva (12 months, May 2025 - Apr 2026)
  const reportsBeerSheva = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const month = (i + 5) % 12 || 12;
      const year = 2025 + Math.floor((i + 4) / 12);
      const incomes = [50000, 55000, 55000, 50000, 55000, 55000, 50000, 55000, 50000, 55000, 55000, 50000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 8 ? `${year}-${String(month).padStart(2, '0')}-${String(26 + Math.floor(Math.random() * 4)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[8].id,
        subcontractorId: subcontractors[3].id,
        date: dateStr,
        profitMargin: 9,
        income,
        incomeDate,
      });
    })
  );

  // Herzliya Marina (14 months, Mar 2025 - Apr 2026)
  const reportsHerzliya = await Promise.all(
    Array.from({ length: 14 }, (_, i) => {
      const month = (i + 3) % 12 || 12;
      const year = 2025 + Math.floor((i + 2) / 12);
      const incomes = [75000, 80000, 80000, 85000, 80000, 80000, 85000, 80000, 80000, 85000, 80000, 80000, 85000, 80000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 10 ? `${year}-${String(month).padStart(2, '0')}-${String(28 + Math.floor(Math.random() * 3)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[9].id,
        subcontractorId: subcontractors[5].id,
        date: dateStr,
        profitMargin: 13,
        income,
        incomeDate,
      });
    })
  );

  // Netanya Resort (11 months, Jun 2025 - Apr 2026)
  const reportsNetanyaResort = await Promise.all(
    Array.from({ length: 11 }, (_, i) => {
      const month = (i + 6) % 12 || 12;
      const year = 2025 + Math.floor((i + 5) / 12);
      const incomes = [60000, 65000, 65000, 70000, 65000, 65000, 70000, 65000, 65000, 70000, 65000];
      const income = incomes[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 7 ? `${year}-${String(month).padStart(2, '0')}-${String(25 + Math.floor(Math.random() * 5)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[10].id,
        subcontractorId: subcontractors[1].id,
        date: dateStr,
        profitMargin: 10,
        income,
        incomeDate,
      });
    })
  );

  // Netanya Shopping Center (9 months, Apr-Dec 2025)
  const reportsNetanyaMall = await Promise.all([
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-04-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: '2025-04-25',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-05-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: '2025-05-23',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-06-01',
      profitMargin: 10,
      income: 30000,
      incomeDate: '2025-06-26',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-07-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: '2025-07-25',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-08-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: '2025-08-22',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-09-01',
      profitMargin: 10,
      income: 30000,
      incomeDate: '2025-09-24',
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-10-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: null,
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-11-01',
      profitMargin: 10,
      income: 28000,
      incomeDate: null,
    }),
    report({
      projectId: activeProjects[11].id,
      subcontractorId: subcontractors[2].id,
      date: '2025-12-01',
      profitMargin: 10,
      income: 30000,
      incomeDate: null,
    }),
  ]);

  // Additional active projects with reports
  const reportsRehovotPark = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const month = i + 10;
      const year = 2025 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      const incomes = [48000, 50000, 52000, 50000, 48000, 50000, 52000, 50000];
      const income = incomes[i];
      const dateStr = `${year}-${String(m).padStart(2, '0')}-01`;
      const incomeDate = i < 4 ? `${year}-${String(m).padStart(2, '0')}-${String(20 + Math.floor(Math.random() * 8)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[12].id,
        subcontractorId: subcontractors[8].id,
        date: dateStr,
        profitMargin: 10,
        income,
        incomeDate,
      });
    })
  );

  const reportsPetahDistrict = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const month = i + 9;
      const year = 2025 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      const incomes = [40000, 42000, 40000, 42000, 40000, 42000];
      const income = incomes[i];
      const dateStr = `${year}-${String(m).padStart(2, '0')}-01`;
      const incomeDate = i < 3 ? `${year}-${String(m).padStart(2, '0')}-${String(22 + Math.floor(Math.random() * 6)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[13].id,
        subcontractorId: subcontractors[9].id,
        date: dateStr,
        profitMargin: 9,
        income,
        incomeDate,
      });
    })
  );

  const reportsHolonIndustrial = await Promise.all(
    Array.from({ length: 4 }, (_, i) => {
      const month = i + 8;
      const year = 2025 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      const incomes = [60000, 62000, 60000, 62000];
      const income = incomes[i];
      const dateStr = `${year}-${String(m).padStart(2, '0')}-01`;
      const incomeDate = i < 2 ? `${year}-${String(m).padStart(2, '0')}-${String(24 + Math.floor(Math.random() * 5)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[14].id,
        subcontractorId: subcontractors[10].id,
        date: dateStr,
        profitMargin: 11,
        income,
        incomeDate,
      });
    })
  );

  const reportsRishlionOffice = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const month = i + 9;
      const year = 2025 + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      const incomes = [42000, 44000, 42000, 44000, 42000, 44000, 42000];
      const income = incomes[i];
      const dateStr = `${year}-${String(m).padStart(2, '0')}-01`;
      const incomeDate = i < 3 ? `${year}-${String(m).padStart(2, '0')}-${String(23 + Math.floor(Math.random() * 6)).padStart(2, '0')}` : null;
      return report({
        projectId: activeProjects[15].id,
        subcontractorId: subcontractors[11].id,
        date: dateStr,
        profitMargin: 10,
        income,
        incomeDate,
      });
    })
  );

  // Void unused report vars
  void [
    reportsClosedTA,
    reportsClosedHaifa,
    reportsClosedRaanana,
    reportsClosedRehovot,
    reportsClosedPetah,
    reportsDizengoff,
    reportsYarkon,
    reportsFlorentin,
    reportsHaifa,
    reportsCarmel,
    reportsJerusalem,
    reportsMamilla,
    reportsRaanana,
    reportsBeerSheva,
    reportsHerzliya,
    reportsNetanyaResort,
    reportsNetanyaMall,
    reportsRehovotPark,
    reportsPetahDistrict,
    reportsHolonIndustrial,
    reportsRishlionOffice,
  ];

  // ── Corporation Payments ──────────────────────────────────────────────────
  // (Selective examples from active projects)
  await prisma.corporationPayment.createMany({
    data: [
      // Dizengoff Tower
      {
        projectReportId: reportsDizengoff[1].id,
        corporationId: corporations[0].id,
        amount: 5000,
        date: d('2025-01-20'),
      },
      {
        projectReportId: reportsDizengoff[1].id,
        corporationId: corporations[1].id,
        amount: 3000,
        date: d('2025-01-22'),
      },
      {
        projectReportId: reportsDizengoff[2].id,
        corporationId: corporations[0].id,
        amount: 5000,
        date: d('2025-02-18'),
      },
      {
        projectReportId: reportsDizengoff[3].id,
        corporationId: corporations[4].id,
        amount: 4000,
        date: d('2025-03-20'),
      },
      // Haifa Harbor
      {
        projectReportId: reportsHaifa[1].id,
        corporationId: corporations[0].id,
        amount: 8000,
        date: d('2025-01-28'),
      },
      {
        projectReportId: reportsHaifa[2].id,
        corporationId: corporations[0].id,
        amount: 8000,
        date: d('2025-02-25'),
      },
      {
        projectReportId: reportsHaifa[2].id,
        corporationId: corporations[1].id,
        amount: 5000,
        date: d('2025-02-26'),
      },
      {
        projectReportId: reportsHaifa[4].id,
        corporationId: corporations[2].id,
        amount: 10000,
        date: d('2025-03-28'),
      },
      // Jerusalem Hotel
      {
        projectReportId: reportsJerusalem[0].id,
        corporationId: corporations[0].id,
        amount: 10000,
        date: d('2025-04-30'),
      },
      {
        projectReportId: reportsJerusalem[0].id,
        corporationId: corporations[2].id,
        amount: 15000,
        date: d('2025-04-29'),
      },
      {
        projectReportId: reportsJerusalem[1].id,
        corporationId: corporations[0].id,
        amount: 10000,
        date: d('2025-05-30'),
      },
      {
        projectReportId: reportsJerusalem[1].id,
        corporationId: corporations[1].id,
        amount: 8000,
        date: d('2025-05-29'),
      },
      // Carmel Gardens
      {
        projectReportId: reportsCarmel[0].id,
        corporationId: corporations[0].id,
        amount: 4000,
        date: d('2025-01-29'),
      },
      {
        projectReportId: reportsCarmel[1].id,
        corporationId: corporations[0].id,
        amount: 4000,
        date: d('2025-02-26'),
      },
      {
        projectReportId: reportsCarmel[1].id,
        corporationId: corporations[1].id,
        amount: 3000,
        date: d('2025-02-27'),
      },
      // Beer Sheva Tech
      {
        projectReportId: reportsBeerSheva[0].id,
        corporationId: corporations[0].id,
        amount: 5000,
        date: d('2025-05-31'),
      },
      {
        projectReportId: reportsBeerSheva[1].id,
        corporationId: corporations[0].id,
        amount: 5000,
        date: d('2025-06-30'),
      },
      {
        projectReportId: reportsBeerSheva[1].id,
        corporationId: corporations[2].id,
        amount: 8000,
        date: d('2025-06-27'),
      },
      // Herzliya Marina
      {
        projectReportId: reportsHerzliya[0].id,
        corporationId: corporations[0].id,
        amount: 8000,
        date: d('2025-03-28'),
      },
      {
        projectReportId: reportsHerzliya[0].id,
        corporationId: corporations[3].id,
        amount: 10000,
        date: d('2025-03-29'),
      },
    ],
  });

  // ── Subcontractor Payments ────────────────────────────────────────────────
  await prisma.subcontractorPayment.createMany({
    data: [
      // Moshe on Dizengoff (partial)
      {
        subcontractorId: subcontractors[0].id,
        projectId: activeProjects[0].id,
        serviceDate: d('2025-01-01'),
        amount: 37000,
      },
      {
        subcontractorId: subcontractors[0].id,
        projectId: activeProjects[0].id,
        serviceDate: d('2025-02-01'),
        amount: 36000,
      },
      // Moshe on Haifa Harbor (partial)
      {
        subcontractorId: subcontractors[0].id,
        projectId: activeProjects[3].id,
        serviceDate: d('2025-01-01'),
        amount: 65600,
      },
      {
        subcontractorId: subcontractors[0].id,
        projectId: activeProjects[3].id,
        serviceDate: d('2025-02-01'),
        amount: 60600,
      },
      // Avi on Yarkon
      {
        subcontractorId: subcontractors[1].id,
        projectId: activeProjects[1].id,
        serviceDate: d('2025-01-01'),
        amount: 16100,
      },
      {
        subcontractorId: subcontractors[1].id,
        projectId: activeProjects[1].id,
        serviceDate: d('2025-02-01'),
        amount: 15600,
      },
      // Yossi on Florentin
      {
        subcontractorId: subcontractors[2].id,
        projectId: activeProjects[2].id,
        serviceDate: d('2025-03-01'),
        amount: 15840,
      },
      {
        subcontractorId: subcontractors[2].id,
        projectId: activeProjects[2].id,
        serviceDate: d('2025-04-01'),
        amount: 15840,
      },
      // David on Beer Sheva
      {
        subcontractorId: subcontractors[3].id,
        projectId: activeProjects[8].id,
        serviceDate: d('2025-05-01'),
        amount: 41500,
      },
      {
        subcontractorId: subcontractors[3].id,
        projectId: activeProjects[8].id,
        serviceDate: d('2025-06-01'),
        amount: 44550,
      },
      // Shlomo on Carmel
      {
        subcontractorId: subcontractors[4].id,
        projectId: activeProjects[4].id,
        serviceDate: d('2025-01-01'),
        amount: 35600,
      },
      {
        subcontractorId: subcontractors[4].id,
        projectId: activeProjects[4].id,
        serviceDate: d('2025-02-01'),
        amount: 37240,
      },
      // Shlomo on Jerusalem Hotel
      {
        subcontractorId: subcontractors[4].id,
        projectId: activeProjects[5].id,
        serviceDate: d('2025-04-01'),
        amount: 76000,
      },
      // Rami on Herzliya
      {
        subcontractorId: subcontractors[5].id,
        projectId: activeProjects[9].id,
        serviceDate: d('2025-03-01'),
        amount: 50900,
      },
      {
        subcontractorId: subcontractors[5].id,
        projectId: activeProjects[9].id,
        serviceDate: d('2025-04-01'),
        amount: 52400,
      },
    ],
  });

  console.log('✅ Seed complete: 30 clients, 35 projects (5 closed, 16 active, 10 future), comprehensive reports');
}

async function main(): Promise<void> {
  try {
    await seedAdmin();
    await seedMockData();
    console.log('✅ All seeds successful');
  } catch (e) {
    console.error('❌ Seed error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
