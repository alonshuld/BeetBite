import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '../src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// This runs on every container start (see apps/backend/Dockerfile CMD), so it
// must be idempotent and must never overwrite an existing password: a restart
// would otherwise silently reset the operator's credential back to whatever
// ADMIN_PASSWORD happens to hold, undoing any rotation.
async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log(`Admin user exists, password left untouched: ${username}`);
    return;
  }

  if (!password) {
    throw new Error(
      'ADMIN_PASSWORD environment variable is required to create the admin user',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // upsert rather than create so two containers racing on first start cannot
  // collide on the unique username; update stays empty for the reason above.
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash },
  });

  console.log(`Admin user created: ${username}`);
}

function d(iso: string): Date {
  return new Date(iso);
}

// Deterministic PRNG so the income tags picked below are the same on every run.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260701);

const oneOf = <T>(values: readonly T[]): T =>
  values[Math.floor(rand() * values.length)];

/** Short work labels — the chunk of work an income entry covers. */
const WORK_TAGS = [
  'Structure', 'Finishing', 'Infrastructure', 'Concrete',
  'Cladding', 'Landscaping', 'Waterproofing', 'Systems',
] as const;

// CompanySettings stores images as base64 data URLs — there is no upload infra —
// so the demo logo and signature ship as PNGs next to this file and are inlined
// at seed time. The Dockerfile copies the whole prisma/ directory, so the path
// resolves the same in the container as it does locally.
const dataUrl = (file: string): string =>
  `data:image/png;base64,${fs.readFileSync(path.join(__dirname, 'demo-assets', file)).toString('base64')}`;

// An entry without an explicit tag gets a random work label, so no seeded income
// entry is ever untagged.
type IncomeEntryInput = { amount: number; incomeDate: string | null; tag?: string };

type ReportInput = {
  projectId: string;
  subcontractorId: string;
  date: string;
  profitMargin: number;
  incomeEntries: IncomeEntryInput[];
};

/** Single income entry shorthand */
function ie(amount: number, incomeDate: string | null): IncomeEntryInput[] {
  return [{ amount, incomeDate }];
}

async function report(r: ReportInput) {
  return prisma.projectReport.create({
    data: {
      projectId: r.projectId,
      subcontractorId: r.subcontractorId,
      date: d(r.date),
      profitMargin: r.profitMargin,
      incomeEntries: {
        create: r.incomeEntries.map((e) => ({
          amount: e.amount,
          incomeDate: e.incomeDate ? d(e.incomeDate) : null,
          tag: e.tag ?? oneOf(WORK_TAGS),
        })),
      },
    },
  });
}

// DESTRUCTIVE: truncates every business table before inserting demo records.
// Only ever called behind the SEED_MOCK_DATA opt-in in main().
async function seedMockData(): Promise<void> {
  console.log('Seeding mock data (this wipes all existing business data)...');

  await prisma.initiatorPayment.deleteMany({});
  await prisma.subcontractorPayment.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.projectReportIncome.deleteMany({});
  await prisma.projectReport.deleteMany({});
  await prisma.projectClientAssignment.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.subcontractor.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.initiator.deleteMany({});
  await prisma.companySettings.deleteMany({});
  await prisma.vatRate.deleteMany({});

  // ── Clients (30) ──────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.create({ data: { name: 'Tel Aviv Properties Ltd' } }),       // 0
    prisma.client.create({ data: { name: 'Haifa Builders Group' } }),           // 1
    prisma.client.create({ data: { name: 'Jerusalem Develop Corp' } }),         // 2
    prisma.client.create({ data: { name: 'Raanana Real Estate' } }),            // 3
    prisma.client.create({ data: { name: 'Beer Sheva Contractors' } }),         // 4
    prisma.client.create({ data: { name: 'Herzliya Premium Build' } }),         // 5
    prisma.client.create({ data: { name: 'Netanya Coastal Projects' } }),       // 6
    prisma.client.create({ data: { name: 'Rehovot Construction Co' } }),        // 7
    prisma.client.create({ data: { name: 'Petah Tikva Development' } }),        // 8
    prisma.client.create({ data: { name: 'Holon Builders Alliance' } }),        // 9
    prisma.client.create({ data: { name: 'Rishon LeZion Holdings' } }),         // 10
    prisma.client.create({ data: { name: 'Modiin Modern Structures' } }),       // 11
    prisma.client.create({ data: { name: 'Ashdod Maritime Build' } }),          // 12
    prisma.client.create({ data: { name: 'Ashkelon Coastal Works' } }),         // 13
    prisma.client.create({ data: { name: 'Beersheba Tech Campus Ltd' } }),      // 14
    prisma.client.create({ data: { name: 'Afula Regional Projects' } }),        // 15
    prisma.client.create({ data: { name: 'Safed Mountain Development' } }),     // 16
    prisma.client.create({ data: { name: 'Tiberias Hospitality Group' } }),     // 17
    prisma.client.create({ data: { name: 'Eilat Resort Developers' } }),        // 18
    prisma.client.create({ data: { name: 'Upper Galilee Consortium' } }),       // 19
    prisma.client.create({ data: { name: 'Samaria Industrial Corp' } }),        // 20
    prisma.client.create({ data: { name: 'Central Valley Construction' } }),    // 21
    prisma.client.create({ data: { name: 'Negev Expansion Partners' } }),       // 22
    prisma.client.create({ data: { name: 'Mediterranean Luxury Homes' } }),     // 23
    prisma.client.create({ data: { name: 'Green Valley Properties' } }),        // 24
    prisma.client.create({ data: { name: 'Urban Renewal Specialists' } }),      // 25
    prisma.client.create({ data: { name: 'Heritage Restoration Ltd' } }),       // 26
    prisma.client.create({ data: { name: 'Smart City Solutions Inc' } }),       // 27
    prisma.client.create({ data: { name: 'Industrial Zone Authority' } }),      // 28
    prisma.client.create({ data: { name: 'Suburban Residential Trust' } }),     // 29
  ]);

  // ── Subcontractors (15) ───────────────────────────────────────────────────
  const subcontractors = await Promise.all([
    prisma.subcontractor.create({ data: { name: 'Moshe Cohen', companyNumber: '515000001' } }),      // 0
    prisma.subcontractor.create({ data: { name: 'Avi Levi', companyNumber: '515000002' } }),          // 1
    prisma.subcontractor.create({ data: { name: 'Yossi Mizrahi', companyNumber: '515000003' } }),     // 2
    prisma.subcontractor.create({ data: { name: 'David Peretz', companyNumber: '515000004' } }),      // 3
    prisma.subcontractor.create({ data: { name: 'Shlomo Ben-David', companyNumber: '515000005' } }),  // 4
    prisma.subcontractor.create({ data: { name: 'Rami Dahan', companyNumber: '515000006' } }),        // 5
    prisma.subcontractor.create({ data: { name: 'Eli Rosenblum', companyNumber: '515000007' } }),     // 6
    prisma.subcontractor.create({ data: { name: 'Gabriel Schwartz', companyNumber: '515000008' } }), // 7
    prisma.subcontractor.create({ data: { name: 'Yaniv Goldman', companyNumber: '515000009' } }),     // 8
    prisma.subcontractor.create({ data: { name: 'Noam Shalit', companyNumber: '515000010' } }),       // 9
    prisma.subcontractor.create({ data: { name: 'Arik Barkai', companyNumber: '515000011' } }),       // 10
    prisma.subcontractor.create({ data: { name: 'Itay Nir', companyNumber: '515000012' } }),          // 11
    prisma.subcontractor.create({ data: { name: 'Uri Zuckerman', companyNumber: '515000013' } }),     // 12
    prisma.subcontractor.create({ data: { name: 'Moti Berkman', companyNumber: '515000014' } }),      // 13
    prisma.subcontractor.create({ data: { name: 'Tal Golan', companyNumber: '515000015' } }),         // 14
  ]);

  // ── Suppliers (12) ─────────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'ElectroPro Solutions' } }),        // 0
    prisma.supplier.create({ data: { name: 'AquaPlumbing Services' } }),       // 1
    prisma.supplier.create({ data: { name: 'IronSteel Structures' } }),        // 2
    prisma.supplier.create({ data: { name: 'GlassMaster Windows' } }),         // 3
    prisma.supplier.create({ data: { name: 'TileKing Flooring' } }),           // 4
    prisma.supplier.create({ data: { name: 'CoolAir HVAC Systems' } }),        // 5
    prisma.supplier.create({ data: { name: 'PaintPro Finishing' } }),          // 6
    prisma.supplier.create({ data: { name: 'WoodWorks Carpentry' } }),         // 7
    prisma.supplier.create({ data: { name: 'ConcreteForce Foundations' } }),   // 8
    prisma.supplier.create({ data: { name: 'RoofGuard Specialists' } }),       // 9
    prisma.supplier.create({ data: { name: 'SecurityTech Installations' } }), // 10
    prisma.supplier.create({ data: { name: 'LandscapeDesign Pro' } }),         // 11
  ]);

  // ── Initiators (5) ────────────────────────────────────────────────────────
  const initiators = await Promise.all([
    prisma.initiator.create({ data: { name: 'Oren Building Consultants' } }),   // 0
    prisma.initiator.create({ data: { name: 'Amir Real Estate Partners' } }),    // 1
    prisma.initiator.create({ data: { name: 'Nir Development Group' } }),        // 2
    prisma.initiator.create({ data: { name: 'Tali Urban Planning' } }),          // 3
    prisma.initiator.create({ data: { name: 'Gideon Construction Advisory' } }), // 4
  ]);

  // ── Company Settings ──────────────────────────────────────────────────────
  await prisma.companySettings.upsert({
    where: { id: 'company-settings' },
    update: {},
    create: {
      id: 'company-settings',
      name: 'BuildPro Contractors Ltd',
      description: 'Professional construction and project management services',
      companyNumber: '514123456',
      phone: '+972123456789',
      email: 'office@buildpro.co.il',
      addressStreet: '42 Rothschild Blvd',
      addressCity: 'Tel Aviv',
      logo: dataUrl('logo-en.png'),
      signature: dataUrl('signature-en.png'),
    },
  });

  // ── VAT Rates (effective from 2024) ──────────────────────────────────────
  // Only set once per effective period; changed only when rate changes
  await prisma.vatRate.create({ data: { effectiveMonth: d('2024-01-01'), percentage: 18 } });

  // ── Projects ──────────────────────────────────────────────────────────────
  const closedProjects = await Promise.all([
    prisma.project.create({
      data: { clientId: clients[0].id, name: 'Tel Aviv Central Renewal', requesterName: 'Moshe Cohen', location: 'Tel Aviv', estimatedAmount: 300000, description: 'Central bus station area renovation', isDone: true },
    }),
    prisma.project.create({
      data: { clientId: clients[1].id, name: 'Haifa University Annex', requesterName: 'Avi Levi', location: 'Haifa University', estimatedAmount: 250000, description: 'New administrative annex for the university', isDone: true },
    }),
    prisma.project.create({
      data: { clientId: clients[3].id, name: 'Raanana Shopping Complex Phase 1', requesterName: 'Dana Mizrahi', location: 'Raanana Shopping', estimatedAmount: 450000, description: 'First phase of mall expansion project', isDone: true },
    }),
    prisma.project.create({
      data: { clientId: clients[7].id, name: 'Rehovot Medical Center Wing', requesterName: 'Yossi Peretz', location: 'Rehovot Medical', estimatedAmount: 520000, description: 'New pediatric ward construction', isDone: true },
    }),
    prisma.project.create({
      data: { clientId: clients[8].id, name: 'Petah Tikva School Complex', requesterName: 'Ronit Ben-David', location: 'Petah Tikva', estimatedAmount: 380000, description: 'Primary school with sports facilities', isDone: true },
    }),
  ]);

  const activeProjects = await Promise.all([
    prisma.project.create({ data: { clientId: clients[0].id, name: 'Dizengoff Tower Renovation', requesterName: 'Ilan Dahan', location: 'Dizengoff Tower', estimatedAmount: 500000, description: 'Full renovation of a 12-story tower on Dizengoff St', initiatorId: initiators[0].id } }),        // 0
    prisma.project.create({ data: { clientId: clients[0].id, name: 'Yarkon Park Residence', requesterName: 'Michal Rosenblum', location: 'Yarkon Park', estimatedAmount: 200000, description: 'Residential complex near Yarkon Park' } }),                           // 1
    prisma.project.create({ data: { clientId: clients[0].id, name: 'Florentin Lofts Conversion', requesterName: 'Gil Schwartz', location: 'Florentin Lofts', estimatedAmount: 180000, description: 'Industrial loft conversion in Florentin neighborhood', initiatorId: initiators[1].id } }),      // 2
    prisma.project.create({ data: { clientId: clients[1].id, name: 'Haifa Harbor Complex', requesterName: 'Sarit Goldman', location: 'Haifa Harbor', estimatedAmount: 800000, description: 'Commercial complex at the Haifa harbor area' } }),                      // 3
    prisma.project.create({ data: { clientId: clients[1].id, name: 'Carmel Gardens Residences', requesterName: 'Nir Shalit', location: 'Carmel Gardens', estimatedAmount: 450000, description: 'Luxury residential complex on Mount Carmel' } }),                 // 4
    prisma.project.create({ data: { clientId: clients[2].id, name: 'Jerusalem Old City Hotel', requesterName: 'Moshe Cohen', location: 'Jerusalem Old', estimatedAmount: 1200000, description: 'Boutique hotel construction near the Old City walls', initiatorId: initiators[2].id } }),        // 5
    prisma.project.create({ data: { clientId: clients[2].id, name: 'Mamilla Mall Extension', requesterName: 'Avi Levi', location: 'Mamilla Mall', estimatedAmount: 400000, description: 'Extension of the Mamilla open-air mall' } }),                        // 6
    prisma.project.create({ data: { clientId: clients[3].id, name: 'Raanana Villa Complex', requesterName: 'Dana Mizrahi', location: 'Raanana Villa', estimatedAmount: 350000, description: 'Upscale villa development in northern Raanana' } }),                  // 7
    prisma.project.create({ data: { clientId: clients[4].id, name: 'Beer Sheva Tech Campus', requesterName: 'Yossi Peretz', location: 'Beer Sheva', estimatedAmount: 600000, description: 'Technology campus for the cyber district', initiatorId: initiators[3].id } }),                      // 8
    prisma.project.create({ data: { clientId: clients[5].id, name: 'Herzliya Marina Towers', requesterName: 'Ronit Ben-David', location: 'Herzliya Marina', estimatedAmount: 900000, description: 'Twin residential towers overlooking the marina' } }),                // 9
    prisma.project.create({ data: { clientId: clients[6].id, name: 'Netanya Beach Resort', requesterName: 'Ilan Dahan', location: 'Netanya Beach', estimatedAmount: 750000, description: 'Luxury beach resort on the northern coast' } }),                       // 10
    prisma.project.create({ data: { clientId: clients[6].id, name: 'Netanya Shopping Center', requesterName: 'Michal Rosenblum', location: 'Netanya Shopping', estimatedAmount: 300000, description: 'Modern shopping center in the city center' } }),                    // 11
    prisma.project.create({ data: { clientId: clients[7].id, name: 'Rehovot Research Park', requesterName: 'Gil Schwartz', location: 'Rehovot Research', estimatedAmount: 650000, description: 'Science and technology park development' } }),                        // 12
    prisma.project.create({ data: { clientId: clients[8].id, name: 'Petah Tikva Commercial District', requesterName: 'Sarit Goldman', location: 'Petah Tikva', estimatedAmount: 480000, description: 'Mixed-use commercial and residential complex' } }),         // 13
    prisma.project.create({ data: { clientId: clients[9].id, name: 'Holon Industrial Park', requesterName: 'Nir Shalit', location: 'Holon Industrial', estimatedAmount: 720000, description: 'Modern logistics and manufacturing facilities' } }),                   // 14
    prisma.project.create({ data: { clientId: clients[10].id, name: 'Rishon LeZion Office Tower', requesterName: 'Moshe Cohen', location: 'Rishon LeZion', estimatedAmount: 550000, description: 'Class A office building with parking complex' } }),             // 15
  ]);

  await Promise.all([
    prisma.project.create({ data: { clientId: clients[2].id, name: 'Jerusalem Tech Hub', requesterName: 'Avi Levi', location: 'Jerusalem Tech', estimatedAmount: 550000, description: 'Modern tech campus in Malha area' } }),
    prisma.project.create({ data: { clientId: clients[11].id, name: 'Modiin Cultural Center', requesterName: 'Dana Mizrahi', location: 'Modiin Cultural', estimatedAmount: 420000, description: 'Concert hall and arts facility' } }),
    prisma.project.create({ data: { clientId: clients[12].id, name: 'Ashdod Port Terminal', requesterName: 'Yossi Peretz', location: 'Ashdod Port', estimatedAmount: 900000, description: 'Container terminal expansion' } }),
    prisma.project.create({ data: { clientId: clients[13].id, name: 'Ashkelon Water Treatment Facility', requesterName: 'Ronit Ben-David', location: 'Ashkelon Water', estimatedAmount: 1100000, description: 'Advanced desalination plant' } }),
    prisma.project.create({ data: { clientId: clients[14].id, name: 'Cyber Security HQ Expansion', requesterName: 'Ilan Dahan', location: 'Cyber Security', estimatedAmount: 850000, description: 'Government cybersecurity operations center' } }),
    prisma.project.create({ data: { clientId: clients[15].id, name: 'Afula Agricultural Hub', requesterName: 'Michal Rosenblum', location: 'Afula Agricultural', estimatedAmount: 380000, description: 'Regional agricultural processing center' } }),
    prisma.project.create({ data: { clientId: clients[16].id, name: 'Safed Tourist Complex', requesterName: 'Gil Schwartz', location: 'Safed Tourist', estimatedAmount: 620000, description: 'Hotel and entertainment complex in Safed' } }),
    prisma.project.create({ data: { clientId: clients[17].id, name: 'Tiberias Marina Development', requesterName: 'Sarit Goldman', location: 'Tiberias Marina', estimatedAmount: 780000, description: 'Waterfront resort and marina project' } }),
    prisma.project.create({ data: { clientId: clients[18].id, name: 'Eilat International Airport Terminal', requesterName: 'Nir Shalit', location: 'Eilat International', estimatedAmount: 950000, description: 'New passenger terminal and facilities' } }),
    prisma.project.create({ data: { clientId: clients[19].id, name: 'Upper Galilee Forest Lodge', requesterName: 'Moshe Cohen', location: 'Upper Galilee', estimatedAmount: 380000, description: 'Eco-tourism resort with sustainable design' } }),
  ]);

  // ── Reports ───────────────────────────────────────────────────────────────

  // Closed: Tel Aviv Central Renewal (12 months 2024)
  const reportsClosedTA = await Promise.all([
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-01-01', profitMargin: 9, incomeEntries: ie(25000, '2024-01-17') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-02-01', profitMargin: 9, incomeEntries: ie(25000, '2024-02-14') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-03-01', profitMargin: 9, incomeEntries: ie(28000, '2024-03-19') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-04-01', profitMargin: 9, incomeEntries: ie(25000, '2024-04-16') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-05-01', profitMargin: 9, incomeEntries: ie(25000, '2024-05-20') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-06-01', profitMargin: 9, incomeEntries: ie(30000, '2024-06-18') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-07-01', profitMargin: 9, incomeEntries: ie(25000, '2024-07-22') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-08-01', profitMargin: 9, incomeEntries: ie(25000, '2024-08-15') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-09-01', profitMargin: 9, incomeEntries: ie(28000, '2024-09-17') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-10-01', profitMargin: 9, incomeEntries: ie(25000, '2024-10-21') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-11-01', profitMargin: 9, incomeEntries: ie(25000, '2024-11-19') }),
    report({ projectId: closedProjects[0].id, subcontractorId: subcontractors[3].id, date: '2024-12-01', profitMargin: 9, incomeEntries: ie(30000, '2024-12-23') }),
  ]);

  // Closed: Haifa University (9 months Jan-Sep 2024)
  const reportsClosedHaifa = await Promise.all([
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-01-01', profitMargin: 11, incomeEntries: ie(25000, '2024-01-24') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-02-01', profitMargin: 11, incomeEntries: ie(25000, '2024-02-22') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-03-01', profitMargin: 11, incomeEntries: ie(28000, '2024-03-21') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-04-01', profitMargin: 11, incomeEntries: ie(25000, '2024-04-18') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-05-01', profitMargin: 11, incomeEntries: ie(30000, '2024-05-23') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-06-01', profitMargin: 11, incomeEntries: ie(28000, '2024-06-20') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-07-01', profitMargin: 11, incomeEntries: ie(25000, '2024-07-25') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-08-01', profitMargin: 11, incomeEntries: ie(25000, '2024-08-22') }),
    report({ projectId: closedProjects[1].id, subcontractorId: subcontractors[5].id, date: '2024-09-01', profitMargin: 11, incomeEntries: ie(28000, '2024-09-26') }),
  ]);

  // Closed: Raanana Shopping Phase 1 (12 months 2024, missing Dec)
  const reportsClosedRaanana = await Promise.all([
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-01-01', profitMargin: 10, incomeEntries: ie(38000, '2024-01-28') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-02-01', profitMargin: 10, incomeEntries: ie(38000, '2024-02-25') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-03-01', profitMargin: 10, incomeEntries: ie(40000, '2024-03-26') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-04-01', profitMargin: 10, incomeEntries: ie(38000, '2024-04-24') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-05-01', profitMargin: 10, incomeEntries: ie(35000, '2024-05-27') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-06-01', profitMargin: 10, incomeEntries: ie(40000, '2024-06-25') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-07-01', profitMargin: 10, incomeEntries: ie(38000, '2024-07-28') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-08-01', profitMargin: 10, incomeEntries: ie(40000, '2024-08-26') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-09-01', profitMargin: 10, incomeEntries: ie(38000, '2024-09-29') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-10-01', profitMargin: 10, incomeEntries: ie(42000, '2024-10-27') }),
    report({ projectId: closedProjects[2].id, subcontractorId: subcontractors[2].id, date: '2024-11-01', profitMargin: 10, incomeEntries: ie(40000, '2024-11-28') }),
  ]);

  // Closed: Rehovot Medical Center (10 months Jan-Oct 2024)
  const reportsClosedRehovot = await Promise.all([
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-01-01', profitMargin: 8, incomeEntries: ie(45000, '2024-01-20') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-02-01', profitMargin: 8, incomeEntries: ie(45000, '2024-02-18') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-03-01', profitMargin: 8, incomeEntries: ie(48000, '2024-03-22') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-04-01', profitMargin: 8, incomeEntries: ie(45000, '2024-04-19') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-05-01', profitMargin: 8, incomeEntries: ie(50000, '2024-05-24') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-06-01', profitMargin: 8, incomeEntries: ie(48000, '2024-06-21') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-07-01', profitMargin: 8, incomeEntries: ie(45000, '2024-07-26') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-08-01', profitMargin: 8, incomeEntries: ie(50000, '2024-08-23') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-09-01', profitMargin: 8, incomeEntries: ie(48000, '2024-09-25') }),
    report({ projectId: closedProjects[3].id, subcontractorId: subcontractors[6].id, date: '2024-10-01', profitMargin: 8, incomeEntries: ie(52000, '2024-10-28') }),
  ]);

  // Closed: Petah Tikva School (8 months Jan-Aug 2024)
  const reportsClosedPetah = await Promise.all([
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-01-01', profitMargin: 9, incomeEntries: ie(35000, '2024-01-25') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-02-01', profitMargin: 9, incomeEntries: ie(35000, '2024-02-23') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-03-01', profitMargin: 9, incomeEntries: ie(38000, '2024-03-24') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-04-01', profitMargin: 9, incomeEntries: ie(35000, '2024-04-21') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-05-01', profitMargin: 9, incomeEntries: ie(35000, '2024-05-28') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-06-01', profitMargin: 9, incomeEntries: ie(40000, '2024-06-26') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-07-01', profitMargin: 9, incomeEntries: ie(35000, '2024-07-27') }),
    report({ projectId: closedProjects[4].id, subcontractorId: subcontractors[7].id, date: '2024-08-01', profitMargin: 9, incomeEntries: ie(38000, '2024-08-29') }),
  ]);

  // Active: Dizengoff Tower (16 months; May 2026 reserved for showcase)
  const reportsDizengoff = await Promise.all(
    Array.from({ length: 16 }, (_, i) => {
      const month = (i % 12) + 1;
      const year = 2024 + Math.floor((8 + i) / 12);
      const amounts = [50000, 50000, 52000, 48000, 55000, 50000, 50000, 45000, 48000, 50000, 52000, 48000];
      const income = amounts[month - 1];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 17 ? `${year}-${String(month).padStart(2, '0')}-15` : null;
      return report({ projectId: activeProjects[0].id, subcontractorId: subcontractors[0].id, date: dateStr, profitMargin: 10, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Yarkon Park (5 months Jan-May 2025)
  const reportsYarkon = await Promise.all([
    report({ projectId: activeProjects[1].id, subcontractorId: subcontractors[1].id, date: '2025-01-01', profitMargin: 12, incomeEntries: ie(20000, '2025-01-10') }),
    report({ projectId: activeProjects[1].id, subcontractorId: subcontractors[1].id, date: '2025-02-01', profitMargin: 12, incomeEntries: ie(20000, '2025-02-12') }),
    report({ projectId: activeProjects[1].id, subcontractorId: subcontractors[1].id, date: '2025-03-01', profitMargin: 12, incomeEntries: ie(18000, '2025-03-14') }),
    report({ projectId: activeProjects[1].id, subcontractorId: subcontractors[1].id, date: '2025-04-01', profitMargin: 12, incomeEntries: ie(20000, '2025-04-16') }),
    report({ projectId: activeProjects[1].id, subcontractorId: subcontractors[1].id, date: '2025-05-01', profitMargin: 12, incomeEntries: ie(20000, null) }),
  ]);

  // Active: Florentin Lofts (6 months Mar-Aug 2025)
  const reportsFlorentin = await Promise.all([
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-03-01', profitMargin: 11, incomeEntries: ie(18000, '2025-03-20') }),
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-04-01', profitMargin: 11, incomeEntries: ie(18000, '2025-04-22') }),
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-05-01', profitMargin: 11, incomeEntries: ie(20000, '2025-05-21') }),
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-06-01', profitMargin: 11, incomeEntries: ie(18000, '2025-06-19') }),
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-07-01', profitMargin: 11, incomeEntries: ie(18000, null) }),
    report({ projectId: activeProjects[2].id, subcontractorId: subcontractors[2].id, date: '2025-08-01', profitMargin: 11, incomeEntries: ie(16000, null) }),
  ]);

  // Active: Haifa Harbor (23 months Jun 2024 - Apr 2026)
  const reportsHaifa = await Promise.all(
    Array.from({ length: 23 }, (_, i) => {
      const baseMonth = 6 + i;
      const month = ((baseMonth - 1) % 12) + 1;
      const year = 2024 + Math.floor((baseMonth - 1) / 12);
      const amounts = [75000, 80000, 80000, 85000, 80000, 80000, 90000, 80000, 80000, 75000, 80000, 80000, 85000, 80000, 80000, 80000, 85000, 80000, 80000, 80000, 85000, 80000, 80000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 19 ? `${year}-${String(month).padStart(2, '0')}-20` : null;
      return report({ projectId: activeProjects[3].id, subcontractorId: subcontractors[0].id, date: dateStr, profitMargin: 8, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Carmel Gardens (16 months Jan 2025 - Apr 2026)
  const reportsCarmel = await Promise.all(
    Array.from({ length: 16 }, (_, i) => {
      const month = (i % 12) + 1;
      const year = 2025 + Math.floor(i / 12);
      const amounts = [40000, 42000, 45000, 45000, 40000, 45000, 42000, 45000, 40000, 45000, 42000, 45000, 40000, 42000, 45000, 40000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 12 ? `${year}-${String(month).padStart(2, '0')}-26` : null;
      return report({ projectId: activeProjects[4].id, subcontractorId: subcontractors[4].id, date: dateStr, profitMargin: 10, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Jerusalem Hotel (13 months Apr 2025 - Apr 2026)
  const reportsJerusalem = await Promise.all(
    Array.from({ length: 13 }, (_, i) => {
      const month = ((i + 3) % 12) + 1;
      const year = 2025 + Math.floor((i + 3) / 12);
      const amounts = [100000, 100000, 105000, 100000, 100000, 110000, 100000, 100000, 105000, 100000, 100000, 105000, 100000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 9 ? `${year}-${String(month).padStart(2, '0')}-27` : null;
      return report({ projectId: activeProjects[5].id, subcontractorId: subcontractors[4].id, date: dateStr, profitMargin: 12, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Mamilla Mall (9 months Jan-Sep 2025)
  const reportsMamilla = await Promise.all([
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-01-01', profitMargin: 10, incomeEntries: ie(35000, '2025-01-22') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-02-01', profitMargin: 10, incomeEntries: ie(35000, '2025-02-19') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-03-01', profitMargin: 10, incomeEntries: ie(40000, '2025-03-24') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-04-01', profitMargin: 10, incomeEntries: ie(35000, '2025-04-23') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-05-01', profitMargin: 10, incomeEntries: ie(38000, '2025-05-26') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-06-01', profitMargin: 10, incomeEntries: ie(35000, '2025-06-24') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-07-01', profitMargin: 10, incomeEntries: ie(35000, '2025-07-25') }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-08-01', profitMargin: 10, incomeEntries: ie(38000, null) }),
    report({ projectId: activeProjects[6].id, subcontractorId: subcontractors[1].id, date: '2025-09-01', profitMargin: 10, incomeEntries: ie(35000, null) }),
  ]);

  // Active: Raanana Villas (9 months Feb-Oct 2025)
  const reportsRaanana = await Promise.all([
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-02-01', profitMargin: 11, incomeEntries: ie(30000, '2025-02-27') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-03-01', profitMargin: 11, incomeEntries: ie(32000, '2025-03-28') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-04-01', profitMargin: 11, incomeEntries: ie(30000, '2025-04-29') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-05-01', profitMargin: 11, incomeEntries: ie(35000, '2025-05-28') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-06-01', profitMargin: 11, incomeEntries: ie(30000, '2025-06-30') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-07-01', profitMargin: 11, incomeEntries: ie(32000, '2025-07-29') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-08-01', profitMargin: 11, incomeEntries: ie(30000, '2025-08-27') }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-09-01', profitMargin: 11, incomeEntries: ie(30000, null) }),
    report({ projectId: activeProjects[7].id, subcontractorId: subcontractors[2].id, date: '2025-10-01', profitMargin: 11, incomeEntries: ie(28000, null) }),
  ]);

  // Active: Beer Sheva (12 months May 2025 - Apr 2026)
  const reportsBeerSheva = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const month = ((i + 4) % 12) + 1;
      const year = 2025 + Math.floor((i + 4) / 12);
      const amounts = [50000, 55000, 55000, 50000, 55000, 55000, 50000, 55000, 50000, 55000, 55000, 50000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 8 ? `${year}-${String(month).padStart(2, '0')}-28` : null;
      return report({ projectId: activeProjects[8].id, subcontractorId: subcontractors[3].id, date: dateStr, profitMargin: 9, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Herzliya Marina (14 months Mar 2025 - Apr 2026)
  const reportsHerzliya = await Promise.all(
    Array.from({ length: 14 }, (_, i) => {
      const month = ((i + 2) % 12) + 1;
      const year = 2025 + Math.floor((i + 2) / 12);
      const amounts = [75000, 80000, 80000, 85000, 80000, 80000, 85000, 80000, 80000, 85000, 80000, 80000, 85000, 80000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 10 ? `${year}-${String(month).padStart(2, '0')}-29` : null;
      return report({ projectId: activeProjects[9].id, subcontractorId: subcontractors[5].id, date: dateStr, profitMargin: 13, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Netanya Resort (11 months Jun 2025 - Apr 2026)
  const reportsNetanyaResort = await Promise.all(
    Array.from({ length: 11 }, (_, i) => {
      const month = ((i + 5) % 12) + 1;
      const year = 2025 + Math.floor((i + 5) / 12);
      const amounts = [60000, 65000, 65000, 70000, 65000, 65000, 70000, 65000, 65000, 70000, 65000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 7 ? `${year}-${String(month).padStart(2, '0')}-27` : null;
      return report({ projectId: activeProjects[10].id, subcontractorId: subcontractors[1].id, date: dateStr, profitMargin: 10, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // Active: Netanya Shopping Center (9 months Apr-Dec 2025)
  const reportsNetanyaMall = await Promise.all([
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-04-01', profitMargin: 10, incomeEntries: ie(28000, '2025-04-25') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-05-01', profitMargin: 10, incomeEntries: ie(28000, '2025-05-23') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-06-01', profitMargin: 10, incomeEntries: ie(30000, '2025-06-26') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-07-01', profitMargin: 10, incomeEntries: ie(28000, '2025-07-25') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-08-01', profitMargin: 10, incomeEntries: ie(28000, '2025-08-22') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-09-01', profitMargin: 10, incomeEntries: ie(30000, '2025-09-24') }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-10-01', profitMargin: 10, incomeEntries: ie(28000, null) }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-11-01', profitMargin: 10, incomeEntries: ie(28000, null) }),
    report({ projectId: activeProjects[11].id, subcontractorId: subcontractors[2].id, date: '2025-12-01', profitMargin: 10, incomeEntries: ie(30000, null) }),
  ]);

  const reportsRehovotPark = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const month = ((i + 9) % 12) + 1;
      const year = 2025 + Math.floor((i + 9) / 12);
      const amounts = [48000, 50000, 52000, 50000, 48000, 50000, 52000, 50000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 4 ? `${year}-${String(month).padStart(2, '0')}-22` : null;
      return report({ projectId: activeProjects[12].id, subcontractorId: subcontractors[8].id, date: dateStr, profitMargin: 10, incomeEntries: ie(income, incomeDate) });
    }),
  );

  const reportsPetahDistrict = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const month = ((i + 8) % 12) + 1;
      const year = 2025 + Math.floor((i + 8) / 12);
      const amounts = [40000, 42000, 40000, 42000, 40000, 42000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 3 ? `${year}-${String(month).padStart(2, '0')}-24` : null;
      return report({ projectId: activeProjects[13].id, subcontractorId: subcontractors[9].id, date: dateStr, profitMargin: 9, incomeEntries: ie(income, incomeDate) });
    }),
  );

  const reportsHolonIndustrial = await Promise.all(
    Array.from({ length: 4 }, (_, i) => {
      const month = ((i + 7) % 12) + 1;
      const year = 2025 + Math.floor((i + 7) / 12);
      const amounts = [60000, 62000, 60000, 62000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 2 ? `${year}-${String(month).padStart(2, '0')}-26` : null;
      return report({ projectId: activeProjects[14].id, subcontractorId: subcontractors[10].id, date: dateStr, profitMargin: 11, incomeEntries: ie(income, incomeDate) });
    }),
  );

  const reportsRishlionOffice = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const month = ((i + 8) % 12) + 1;
      const year = 2025 + Math.floor((i + 8) / 12);
      const amounts = [42000, 44000, 42000, 44000, 42000, 44000, 42000];
      const income = amounts[i];
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const incomeDate = i < 3 ? `${year}-${String(month).padStart(2, '0')}-25` : null;
      return report({ projectId: activeProjects[15].id, subcontractorId: subcontractors[11].id, date: dateStr, profitMargin: 10, incomeEntries: ie(income, incomeDate) });
    }),
  );

  // ── SHOWCASE MONTH: May 2026 ──────────────────────────────────────────────
  // Multiple income entries + supplier payments — best month to test new UI.
  //
  // Tel Aviv Properties Ltd: 3 projects
  // Jerusalem Develop Corp:  2 projects
  // Herzliya Premium Build:  1 project

  const showDizengoff = await report({
    projectId: activeProjects[0].id,
    subcontractorId: subcontractors[0].id,
    date: '2026-05-01',
    profitMargin: 10,
    incomeEntries: [
      { amount: 30000, incomeDate: '2026-05-12', tag: 'Structure' },  // advance received
      { amount: 22000, incomeDate: null, tag: 'Finishing' },          // balance pending
    ],
  });

  const showYarkon = await report({
    projectId: activeProjects[1].id,
    subcontractorId: subcontractors[1].id,
    date: '2026-05-01',
    profitMargin: 12,
    incomeEntries: [
      { amount: 12000, incomeDate: '2026-05-08', tag: 'Concrete' },
      { amount: 8000,  incomeDate: null, tag: 'Cladding' },
    ],
  });

  const showFlorentin = await report({
    projectId: activeProjects[2].id,
    subcontractorId: subcontractors[2].id,
    date: '2026-05-01',
    profitMargin: 11,
    incomeEntries: [
      { amount: 10000, incomeDate: '2026-05-15', tag: 'Infrastructure' },
      { amount: 6000,  incomeDate: '2026-05-22', tag: 'Systems' },
      { amount: 4000,  incomeDate: null, tag: 'Finishing' },
    ],
  });

  const showJerusalem = await report({
    projectId: activeProjects[5].id,
    subcontractorId: subcontractors[4].id,
    date: '2026-05-01',
    profitMargin: 12,
    incomeEntries: [
      { amount: 50000, incomeDate: '2026-05-05', tag: 'Structure' },  // advance
      { amount: 30000, incomeDate: '2026-05-20', tag: 'Cladding' },   // mid-month
      { amount: 25000, incomeDate: null, tag: 'Systems' },            // final pending
    ],
  });

  const showMamilla = await report({
    projectId: activeProjects[6].id,
    subcontractorId: subcontractors[1].id,
    date: '2026-05-01',
    profitMargin: 10,
    incomeEntries: [
      { amount: 20000, incomeDate: '2026-05-14', tag: 'Waterproofing' },
      { amount: 18000, incomeDate: null, tag: 'Finishing' },
    ],
  });

  const showHerzliya = await report({
    projectId: activeProjects[9].id,
    subcontractorId: subcontractors[5].id,
    date: '2026-05-01',
    profitMargin: 13,
    incomeEntries: [
      { amount: 45000, incomeDate: '2026-05-09', tag: 'Structure' },
      { amount: 38000, incomeDate: null, tag: 'Landscaping' },
    ],
  });

  // ── Supplier Payments ──────────────────────────────────────────────────
  await prisma.supplierPayment.createMany({
    data: [
      // ── Existing months ──────────────────────────────────────────────────
      // Dizengoff Jan/Feb/Mar 2025
      { projectReportId: reportsDizengoff[1].id, supplierId: suppliers[0].id, amount: 5000, date: d('2025-01-20') },
      { projectReportId: reportsDizengoff[1].id, supplierId: suppliers[1].id, amount: 3000, date: d('2025-01-22') },
      { projectReportId: reportsDizengoff[2].id, supplierId: suppliers[0].id, amount: 5000, date: d('2025-02-18') },
      { projectReportId: reportsDizengoff[3].id, supplierId: suppliers[4].id, amount: 4000, date: d('2025-03-20') },
      // Haifa Harbor Aug/Sep 2024
      { projectReportId: reportsHaifa[1].id, supplierId: suppliers[0].id, amount: 8000, date: d('2024-07-28') },
      { projectReportId: reportsHaifa[2].id, supplierId: suppliers[0].id, amount: 8000, date: d('2024-08-25') },
      { projectReportId: reportsHaifa[2].id, supplierId: suppliers[1].id, amount: 5000, date: d('2024-08-26') },
      { projectReportId: reportsHaifa[4].id, supplierId: suppliers[2].id, amount: 10000, date: d('2024-10-28') },
      // Jerusalem Hotel Apr/May 2025
      { projectReportId: reportsJerusalem[0].id, supplierId: suppliers[0].id, amount: 10000, date: d('2025-04-30') },
      { projectReportId: reportsJerusalem[0].id, supplierId: suppliers[2].id, amount: 15000, date: d('2025-04-29') },
      { projectReportId: reportsJerusalem[1].id, supplierId: suppliers[0].id, amount: 10000, date: d('2025-05-30') },
      { projectReportId: reportsJerusalem[1].id, supplierId: suppliers[1].id, amount: 8000,  date: d('2025-05-29') },
      // Carmel Gardens Jan/Feb 2025
      { projectReportId: reportsCarmel[0].id, supplierId: suppliers[0].id, amount: 4000, date: d('2025-01-29') },
      { projectReportId: reportsCarmel[1].id, supplierId: suppliers[0].id, amount: 4000, date: d('2025-02-26') },
      { projectReportId: reportsCarmel[1].id, supplierId: suppliers[1].id, amount: 3000, date: d('2025-02-27') },
      // Beer Sheva May/Jun 2025
      { projectReportId: reportsBeerSheva[0].id, supplierId: suppliers[0].id, amount: 5000, date: d('2025-05-31') },
      { projectReportId: reportsBeerSheva[1].id, supplierId: suppliers[0].id, amount: 5000, date: d('2025-06-30') },
      { projectReportId: reportsBeerSheva[1].id, supplierId: suppliers[2].id, amount: 8000, date: d('2025-06-27') },
      // Herzliya Mar/Apr 2025
      { projectReportId: reportsHerzliya[0].id, supplierId: suppliers[0].id, amount: 8000,  date: d('2025-03-28') },
      { projectReportId: reportsHerzliya[0].id, supplierId: suppliers[3].id, amount: 10000, date: d('2025-03-29') },

      // ── Showcase: May 2026 ────────────────────────────────────────────────
      // Dizengoff — ElectroPro + AquaPlumbing
      { projectReportId: showDizengoff.id, supplierId: suppliers[0].id, amount: 5500, date: d('2026-05-18') },
      { projectReportId: showDizengoff.id, supplierId: suppliers[1].id, amount: 3200, date: d('2026-05-19') },
      // Yarkon — PaintPro
      { projectReportId: showYarkon.id, supplierId: suppliers[6].id, amount: 2000, date: d('2026-05-16') },
      // Florentin — TileKing + WoodWorks
      { projectReportId: showFlorentin.id, supplierId: suppliers[4].id, amount: 2500, date: d('2026-05-20') },
      { projectReportId: showFlorentin.id, supplierId: suppliers[7].id, amount: 1800, date: d('2026-05-21') },
      // Jerusalem — IronSteel + CoolAir + SecurityTech
      { projectReportId: showJerusalem.id, supplierId: suppliers[2].id,  amount: 15000, date: d('2026-05-10') },
      { projectReportId: showJerusalem.id, supplierId: suppliers[5].id,  amount: 8000,  date: d('2026-05-11') },
      { projectReportId: showJerusalem.id, supplierId: suppliers[10].id, amount: 5000,  date: d('2026-05-12') },
      // Mamilla — WoodWorks
      { projectReportId: showMamilla.id, supplierId: suppliers[7].id, amount: 4000, date: d('2026-05-17') },
      // Herzliya — GlassMaster + SecurityTech
      { projectReportId: showHerzliya.id, supplierId: suppliers[3].id,  amount: 7000, date: d('2026-05-13') },
      { projectReportId: showHerzliya.id, supplierId: suppliers[10].id, amount: 6000, date: d('2026-05-14') },
    ],
  });

  // ── Subcontractor Payments ────────────────────────────────────────────────
  await prisma.subcontractorPayment.createMany({
    data: [
      // Moshe on Dizengoff (partial)
      { subcontractorId: subcontractors[0].id, projectId: activeProjects[0].id, serviceDate: d('2025-01-01'), amount: 37000 },
      { subcontractorId: subcontractors[0].id, projectId: activeProjects[0].id, serviceDate: d('2025-02-01'), amount: 36000 },
      // Moshe on Haifa Harbor (partial)
      { subcontractorId: subcontractors[0].id, projectId: activeProjects[3].id, serviceDate: d('2025-01-01'), amount: 65600 },
      { subcontractorId: subcontractors[0].id, projectId: activeProjects[3].id, serviceDate: d('2025-02-01'), amount: 60600 },
      // Avi on Yarkon
      { subcontractorId: subcontractors[1].id, projectId: activeProjects[1].id, serviceDate: d('2025-01-01'), amount: 16100 },
      { subcontractorId: subcontractors[1].id, projectId: activeProjects[1].id, serviceDate: d('2025-02-01'), amount: 15600 },
      // Yossi on Florentin
      { subcontractorId: subcontractors[2].id, projectId: activeProjects[2].id, serviceDate: d('2025-03-01'), amount: 15840 },
      { subcontractorId: subcontractors[2].id, projectId: activeProjects[2].id, serviceDate: d('2025-04-01'), amount: 15840 },
      // David on Beer Sheva
      { subcontractorId: subcontractors[3].id, projectId: activeProjects[8].id, serviceDate: d('2025-05-01'), amount: 41500 },
      { subcontractorId: subcontractors[3].id, projectId: activeProjects[8].id, serviceDate: d('2025-06-01'), amount: 44550 },
      // Shlomo on Carmel
      { subcontractorId: subcontractors[4].id, projectId: activeProjects[4].id, serviceDate: d('2025-01-01'), amount: 35600 },
      { subcontractorId: subcontractors[4].id, projectId: activeProjects[4].id, serviceDate: d('2025-02-01'), amount: 37240 },
      // Shlomo on Jerusalem Hotel
      { subcontractorId: subcontractors[4].id, projectId: activeProjects[5].id, serviceDate: d('2025-04-01'), amount: 76000 },
      // Rami on Herzliya
      { subcontractorId: subcontractors[5].id, projectId: activeProjects[9].id, serviceDate: d('2025-03-01'), amount: 50900 },
      { subcontractorId: subcontractors[5].id, projectId: activeProjects[9].id, serviceDate: d('2025-04-01'), amount: 52400 },
    ],
  });

  // ── ProjectClientAssignments (one per project) ────────────────────────────
  const allProjects = [...closedProjects, ...activeProjects];
  await Promise.all(
    allProjects.map((project) =>
      prisma.projectClientAssignment.create({
        data: {
          projectId: project.id,
          clientId: project.clientId,
          effectiveFrom: d('2024-01-01'),
        },
      }),
    ),
  );

  void [
    reportsClosedTA, reportsClosedHaifa, reportsClosedRaanana,
    reportsClosedRehovot, reportsClosedPetah,
    reportsDizengoff, reportsYarkon, reportsFlorentin,
    reportsHaifa, reportsCarmel, reportsJerusalem, reportsMamilla,
    reportsRaanana, reportsBeerSheva, reportsHerzliya,
    reportsNetanyaResort, reportsNetanyaMall,
    reportsRehovotPark, reportsPetahDistrict, reportsHolonIndustrial,
    reportsRishlionOffice,
    showDizengoff, showYarkon, showFlorentin,
    showJerusalem, showMamilla, showHerzliya,
  ];

  console.log('✅ Seed complete: 30 clients, 5 initiators, 35 projects with client assignments, May 2026 showcase month with multiple tagged income entries & corp payments');
}

async function main(): Promise<void> {
  try {
    await seedAdmin();

    // Opt-in only. seedMockData() deletes every client, project, report and
    // payment before inserting fixtures, and this file runs on every container
    // start — defaulting it on would destroy real data on the first restart.
    if (process.env.SEED_MOCK_DATA === 'true') {
      await seedMockData();
    } else {
      console.log('Skipping mock data (set SEED_MOCK_DATA=true to load it)');
    }

    console.log('✅ All seeds successful');
  } catch (e) {
    console.error('❌ Seed error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
