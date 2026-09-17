/**
 * Hebrew demo dataset — a customer-facing showcase of the account-approval PDF.
 *
 * `seed.ts` carries the English fixtures the README GIFs were recorded against.
 * This file is its Hebrew sibling: the same shapes, but with Israeli names,
 * project titles and supplier names, plus the two records the English seed does
 * not create and the PDF export refuses to render without — a populated
 * `CompanySettings` singleton (logo and signature included) and a `VatRate`
 * table covering the demo months.
 *
 * DESTRUCTIVE: truncates every business table before inserting. Run it with
 *   pnpm --filter backend seed:demo:he
 *
 * The dataset is deterministic — background figures come from a seeded PRNG, so
 * re-running it reproduces byte-identical numbers and the same PDF.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type Client,
  type Supplier,
  type Project,
  type Subcontractor,
} from '../src/generated/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (process.env.NODE_ENV === 'production' && process.env.FORCE_DEMO_SEED !== 'true') {
  throw new Error(
    'Refusing to wipe a production database. Set FORCE_DEMO_SEED=true to override.',
  );
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Helpers ─────────────────────────────────────────────────────────────────

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Deterministic PRNG — background figures must not drift between runs. */
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

/** Random multiple of `step` in [min, max] — keeps demo money round. */
const money = (min: number, max: number, step = 250): number =>
  Math.round((min + rand() * (max - min)) / step) * step;

const oneOf = <T>(values: readonly T[]): T =>
  values[Math.floor(rand() * values.length)];

const dataUrl = (file: string): string =>
  `data:image/png;base64,${fs
    .readFileSync(path.join(__dirname, 'demo-assets', file))
    .toString('base64')}`;

// ── Calendar ────────────────────────────────────────────────────────────────

/** The month the account-approval PDF is exported for. */
const SHOWCASE_MONTH = '2026-07-01';

/** Months that carry reports, oldest first. */
const MONTHS = [
  '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
  '2026-05-01', '2026-06-01', SHOWCASE_MONTH,
] as const;

const HISTORY_MONTHS = MONTHS.filter((m) => m !== SHOWCASE_MONTH);

// ── Directory ───────────────────────────────────────────────────────────────

/** Index 0 is the showcase client — the PDF is exported for its July reports. */
const CLIENT_NAMES = [
  'אורבן טאואר התחדשות עירונית בע״מ',
  'כרמל ייזום ונדל״ן בע״מ',
  'רום נכסים והשקעות בע״מ',
  'מרינה בלו ייזום מגורים בע״מ',
  'אבן דרך תשתיות ופיתוח בע״מ',
  'שער העיר מגורים בע״מ',
  'נאות הכרמל בנייה למגורים בע״מ',
  'תמר גרין ייזום בר־קיימא בע״מ',
] as const;

/** Index 0 is the showcase subcontractor. */
const SUBCONTRACTORS = [
  { name: 'יוסי אברהמי עבודות בנייה בע״מ', companyNumber: '514902317' },
  { name: 'אחים דהן שלד ובטון בע״מ', companyNumber: '515338421' },
  { name: 'מ.ג. גמר ובנייה בע״מ', companyNumber: '514771208' },
  { name: 'שמעון בן־חמו קבלנות בניין בע״מ', companyNumber: '515604093' },
  { name: 'רם־בנה ביצוע פרויקטים בע״מ', companyNumber: '514386552' },
  { name: 'טל אדריכלות ביצוע בע״מ', companyNumber: '515127760' },
  { name: 'אלמוג עבודות עפר ופיתוח בע״מ', companyNumber: '514550834' },
  { name: 'כפיר חדד שלד בע״מ', companyNumber: '515883217' },
  { name: 'נאמן ביצוע ובקרה בע״מ', companyNumber: '514019476' },
  { name: 'ארז מלכה עבודות גמר בע״מ', companyNumber: '515246108' },
] as const;

const SUPPLIER_NAMES = [
  'אור־רם מערכות חשמל בע״מ',
  'מי־טל אינסטלציה וביוב בע״מ',
  'פלדות הצפון קונסטרוקציה בע״מ',
  'אלומיניום גל־אור בע״מ',
  'שיש וקרמיקה הבית בע״מ',
  'קור־טק מיזוג אוויר בע״מ',
  'צבע וגמר א.ב. בע״מ',
  'נגריית עץ הזית בע״מ',
  'יסודות איתן עבודות בטון בע״מ',
  'גגות ואיטום שחר בע״מ',
  'ביטחון־טק מערכות מיגון בע״מ',
  'נוף ירוק גינון ופיתוח בע״מ',
] as const;

// ── Projects ────────────────────────────────────────────────────────────────

type ProjectSeed = {
  clientIndex: number;
  name: string;
  estimatedAmount: number;
  description: string;
  isDone?: boolean;
};

/** Cycled by client index to give demo projects a plausible requester name. */
const DEMO_REQUESTER_NAMES = [
  'משה כהן',
  'דנה לוי',
  'אבי מזרחי',
  'רונית פרץ',
  'יוסי בן־דוד',
  'מיכל שוורץ',
  'גיל גולדמן',
  'שרית דהן',
];

/** The seven projects that make up the exported account approval. */
const SHOWCASE_PROJECTS: ProjectSeed[] = [
  {
    clientIndex: 0,
    name: 'פינוי־בינוי רמת הטייסים, מגרש 204 – ראשון לציון',
    estimatedAmount: 24_500_000,
    description: 'שני מגדלי מגורים בני 22 קומות, 148 יח״ד, חניון תת־קרקעי דו־מפלסי.',
  },
  {
    clientIndex: 0,
    name: 'תמ״א 38/2 ז׳בוטינסקי 47 – רמת גן',
    estimatedAmount: 9_800_000,
    description: 'הריסה ובנייה מחדש, 34 יח״ד, כולל ממ״דים ומעלית שבת.',
  },
  {
    clientIndex: 0,
    name: 'מגדל אורבן טאואר צפון – בני ברק',
    estimatedAmount: 41_200_000,
    description: 'מגדל משרדים בן 26 קומות עם 4 מפלסי חניה ולובי כפול גובה.',
  },
  {
    clientIndex: 0,
    name: 'התחדשות עירונית נווה שרת – תל אביב',
    estimatedAmount: 17_650_000,
    description: 'שיקום שלושה בנייני מגורים ותוספת 42 יח״ד בשלב ב׳.',
  },
  {
    clientIndex: 0,
    name: 'תמ״א 38/1 הרצל 118 – חולון',
    estimatedAmount: 6_300_000,
    description: 'חיזוק מבנה קיים, תוספת 12 יח״ד ומעטפת אלומיניום חדשה.',
  },
  {
    clientIndex: 0,
    name: 'מתחם דיור להשכרה קריית אריה – פתח תקווה',
    estimatedAmount: 28_900_000,
    description: 'שלושה בנייני דיור להשכרה ארוכת טווח, 210 יח״ד ומסחר בקומת הקרקע.',
  },
  {
    clientIndex: 0,
    name: 'עיר היין, מגרש 309 – אשקלון (שלב ב׳)',
    estimatedAmount: 15_400_000,
    description: 'שלב ב׳ של מתחם המגורים: שלד, גמר ופיתוח סביבתי ל־96 יח״ד.',
  },
];

/** Background portfolio — fills the app's other screens for the demo. */
const BACKGROUND_PROJECTS: ProjectSeed[] = [
  { clientIndex: 1, name: 'מרומי הכרמל, מגרש 17 – חיפה', estimatedAmount: 13_200_000, description: 'בניין בוטיק בן 9 קומות עם נוף לים, 28 יח״ד.' },
  { clientIndex: 1, name: 'שדרות הנשיא 88 – חיפה', estimatedAmount: 7_450_000, description: 'שימור חזית היסטורית ותוספת שתי קומות מגורים.' },
  { clientIndex: 1, name: 'קריית הטכנולוגיה, בניין D – חיפה', estimatedAmount: 22_800_000, description: 'מבנה מעבדות ומשרדים להייטק, כולל חדרי נקי.', isDone: true },
  { clientIndex: 2, name: 'מגדלי רום סיטי, מגרש 41 – פתח תקווה', estimatedAmount: 33_700_000, description: 'שני מגדלי מגורים בני 30 קומות מעל מרכז מסחרי.' },
  { clientIndex: 2, name: 'רום פארק לוגיסטי – ראש העין', estimatedAmount: 19_400_000, description: 'מרכז לוגיסטי בן 24,000 מ״ר עם 18 רציפי פריקה.' },
  { clientIndex: 2, name: 'שיפוץ מתחם המשרדים כנפי נשרים – ירושלים', estimatedAmount: 5_900_000, description: 'שיפוץ פנים מלא ל־4 קומות משרדים ומערכות מיזוג חדשות.', isDone: true },
  { clientIndex: 3, name: 'מרינה בלו, בניין A – הרצליה פיתוח', estimatedAmount: 38_500_000, description: 'מגורי יוקרה מול המרינה, 44 יח״ד, בריכה ומועדון דיירים.' },
  { clientIndex: 3, name: 'מרינה בלו, בניין B – הרצליה פיתוח', estimatedAmount: 36_100_000, description: 'שלב ההמשך של המתחם, 40 יח״ד ופנטהאוזים.' },
  { clientIndex: 3, name: 'טיילת הצדף – נתניה', estimatedAmount: 11_750_000, description: 'מלונית 62 חדרים ופיתוח טיילת ציבורית.' },
  { clientIndex: 4, name: 'מחלף עמק שרה, שלב א׳ – באר שבע', estimatedAmount: 46_800_000, description: 'עבודות עפר, גשר עילי ותשתיות ניקוז.' },
  { clientIndex: 4, name: 'קו ביוב אזורי, מקטע 3 – עומר', estimatedAmount: 8_900_000, description: 'הנחת קו ביוב באורך 4.2 ק״מ ותחנת שאיבה.' },
  { clientIndex: 4, name: 'הרחבת אזור תעשייה עידן הנגב', estimatedAmount: 27_300_000, description: 'פיתוח תשתיות ל־11 מגרשי תעשייה, כבישים ותאורה.' },
  { clientIndex: 5, name: 'שער העיר, מתחם המסילה – לוד', estimatedAmount: 21_600_000, description: 'התחדשות עירונית סביב תחנת הרכבת, 128 יח״ד.' },
  { clientIndex: 5, name: 'בית ספר יסודי אלונים – רמלה', estimatedAmount: 14_200_000, description: '24 כיתות לימוד, אולם ספורט וחצר פעילות.' },
  { clientIndex: 6, name: 'נאות הכרמל, שלב ג׳ – טירת כרמל', estimatedAmount: 16_900_000, description: 'ארבעה בנייני מגורים, 72 יח״ד ופיתוח נופי.' },
  { clientIndex: 6, name: 'מרכז קהילתי הדסים – קריית ביאליק', estimatedAmount: 6_750_000, description: 'מבנה ציבור דו־קומתי, אולם רב־תכליתי וספרייה.' },
  { clientIndex: 7, name: 'שכונת תמר גרין, מגרשים 12–18 – מודיעין', estimatedAmount: 25_400_000, description: 'שכונה ירוקה בתקן LEED, 96 יח״ד ומערכות סולאריות.' },
  { clientIndex: 7, name: 'מתחם קמעונאות ירוק – שוהם', estimatedAmount: 9_300_000, description: 'מרכז מסחרי שכונתי עם גג סולארי וניהול אנרגיה.' },
];

/** Projects with no reports yet — the app's "future projects" filter. */
const FUTURE_PROJECTS: ProjectSeed[] = [
  { clientIndex: 0, name: 'פינוי־בינוי שכונת יד אליהו – תל אביב', estimatedAmount: 52_000_000, description: 'תכנון מאושר, תחילת ביצוע צפויה ברבעון הראשון של 2027.' },
  { clientIndex: 2, name: 'רום טאואר, מגרש 55 – רמת גן', estimatedAmount: 44_300_000, description: 'מגדל משולב מגורים ומשרדים, בהמתנה להיתר בנייה.' },
  { clientIndex: 4, name: 'גשר להולכי רגל, כביש 40 – נתיבות', estimatedAmount: 7_100_000, description: 'טרם התקבל צו התחלת עבודה.' },
];

// ── Showcase month figures ──────────────────────────────────────────────────

/**
 * Hand-tuned so the exported PDF reads like a real monthly account: a mix of
 * received and still-pending income, margins that vary per project, and
 * supplier deductions drawn from different trades.
 */
type ShowcaseFigures = {
  profitMargin: number;
  /**
   * [amount, incomeDate | null, tag] — one row of the approval table. The tag
   * is the chunk of work the amount covers and rides on the income entry
   * itself, which is what the rendered document labels.
   */
  income: [number, string | null, string][];
  /** [supplierIndex, amount, description, isFuture] */
  suppliers: [number, number, string, boolean][];
};

const SHOWCASE_FIGURES: ShowcaseFigures[] = [
  {
    profitMargin: 11,
    income: [
      [520_000, '2026-07-12', 'שלד'],
      [222_000, '2026-07-28', 'יציקות'],
    ],
    suppliers: [
      [8, 64_800, 'יציקת גג קומה 7 ורצפות ביניים', false],
      [0, 31_500, 'הזנות חשמל ולוחות קומתיים', false],
    ],
  },
  {
    profitMargin: 9.5,
    income: [[318_500, '2026-07-09', 'חיזוק']],
    suppliers: [
      [2, 27_400, 'קונסטרוקציית פלדה לחיזוק', false],
      [1, 12_950, 'החלפת קווי מים ראשיים', false],
    ],
  },
  {
    profitMargin: 12,
    income: [
      [640_000, '2026-07-06', 'שלד'],
      [505_000, null, 'מעטפת'],
    ],
    suppliers: [
      [3, 88_600, 'מעטפת אלומיניום קומות 12–18', false],
      [5, 46_200, 'יחידות מיזוג מרכזיות – שלב א׳', false],
      [10, 18_400, 'מערכות מיגון וכיבוי אש', true],
    ],
  },
  {
    profitMargin: 10,
    income: [
      [486_000, '2026-07-15', 'גמר'],
      [164_500, null, 'תשתיות'],
    ],
    suppliers: [
      [4, 39_750, 'ריצוף וחיפוי דירות בניין ב׳', false],
      [6, 21_300, 'צבע וגמר בחדרי מדרגות', false],
    ],
  },
  {
    profitMargin: 9,
    income: [[274_300, '2026-07-21', 'יסודות']],
    suppliers: [[8, 33_900, 'חיזוק יסודות וקירות מרתף', false]],
  },
  {
    profitMargin: 11.5,
    income: [
      [400_000, '2026-07-08', 'שלד'],
      [238_750, null, 'מעטפת'],
    ],
    suppliers: [
      [2, 57_200, 'שלד פלדה למבנה החניון', false],
      [9, 24_600, 'איטום גגות ומרפסות', false],
      [11, 9_800, 'פיתוח נופי בחזית המסחר', true],
    ],
  },
  // The exported showcase: two tagged income entries against three supplier
  // deductions, so the rendered table has a ragged edge — income runs out
  // before the supplier list does, exactly as on a real approval.
  {
    profitMargin: 6,
    income: [
      [912_400, '2026-07-14', 'שלד'],
      [648_250, null, 'גמר'],
    ],
    suppliers: [
      [7, 231_480, 'נגרות פנים ומטבחים – שלב א׳', false],
      [0, 184_360, 'תשתיות חשמל ותאורת חוץ', false],
      [11, 12_940, 'פיתוח נופי והשלמות חוץ', false],
    ],
  },
];

/** Short trade labels — each income entry carries one as a badge on the PDF. */
const BACKGROUND_TAGS = [
  'שלד', 'גמר', 'תשתיות', 'יציקות',
  'חיפוי', 'פיתוח', 'איטום', 'מערכות',
] as const;

const SUPPLIER_DESCRIPTIONS = [
  'חשבון חלקי לחודש', 'אספקה והתקנה', 'עבודות קבלן משנה מאושרות',
  'חשבון מצטבר – שלב ביצוע', 'השלמות ותיקונים',
] as const;

// ── Seeding ─────────────────────────────────────────────────────────────────

async function wipe(): Promise<void> {
  await prisma.subcontractorPayment.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.projectReportIncome.deleteMany({});
  await prisma.projectReport.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.subcontractor.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.vatRate.deleteMany({});
}

/**
 * The PDF export throws `CompanySettingsIncompleteError` without a name and a
 * company number, and renders the logo/signature blocks only when those are set.
 */
async function seedCompanySettings(): Promise<void> {
  const settings = {
    name: 'ש. אלוני בנייה והנדסה בע״מ',
    description: 'קבלן ראשי לבנייה למגורים, התחדשות עירונית ותשתיות. קבלן רשום 5-1147, סיווג ג/5.',
    companyNumber: '514783920',
    phone: '+972-3-6547821',
    email: 'office@aloni-engineering.co.il',
    addressStreet: 'דרך מנחם בגין 132',
    addressCity: 'תל אביב־יפו',
    logo: dataUrl('logo.png'),
    signature: dataUrl('signature.png'),
  };

  await prisma.companySettings.upsert({
    where: { id: 'company-settings' },
    update: settings,
    create: { id: 'company-settings', ...settings },
  });
}

/** Israel raised VAT from 17% to 18% on 1 January 2025. */
async function seedVatRates(): Promise<void> {
  await prisma.vatRate.createMany({
    data: [
      { effectiveMonth: d('2024-01-01'), percentage: 17 },
      { effectiveMonth: d('2025-01-01'), percentage: 18 },
    ],
  });
}

async function main(): Promise<void> {
  console.log('Seeding Hebrew demo dataset (this wipes all existing business data)...');
  await wipe();
  await seedCompanySettings();
  await seedVatRates();

  const clients: Client[] = [];
  for (const name of CLIENT_NAMES) {
    clients.push(await prisma.client.create({ data: { name } }));
  }

  const subcontractors: Subcontractor[] = [];
  for (const data of SUBCONTRACTORS) {
    subcontractors.push(await prisma.subcontractor.create({ data }));
  }

  const suppliers: Supplier[] = [];
  for (const name of SUPPLIER_NAMES) {
    suppliers.push(await prisma.supplier.create({ data: { name } }));
  }

  // Project names already end in "– <city>"; reuse that as the demo location
  // rather than hand-writing a location for every seed entry.
  const locationFromName = (name: string): string =>
    name.includes('–') ? name.split('–').pop()!.trim() : name;

  const createProject = async (seed: ProjectSeed) =>
    prisma.project.create({
      data: {
        clientId: clients[seed.clientIndex].id,
        name: seed.name,
        estimatedAmount: seed.estimatedAmount,
        description: seed.description,
        isDone: seed.isDone ?? false,
        requesterName: DEMO_REQUESTER_NAMES[seed.clientIndex % DEMO_REQUESTER_NAMES.length],
        location: locationFromName(seed.name),
      },
    });

  const showcaseProjects: Project[] = [];
  for (const seed of SHOWCASE_PROJECTS) showcaseProjects.push(await createProject(seed));

  const backgroundProjects: Project[] = [];
  for (const seed of BACKGROUND_PROJECTS) backgroundProjects.push(await createProject(seed));

  for (const seed of FUTURE_PROJECTS) await createProject(seed);

  // ── The exported month ────────────────────────────────────────────────────
  let showcaseReportCount = 0;
  for (const [index, project] of showcaseProjects.entries()) {
    const figures = SHOWCASE_FIGURES[index];

    const report = await prisma.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractors[0].id,
        date: d(SHOWCASE_MONTH),
        profitMargin: figures.profitMargin,
        incomeEntries: {
          create: figures.income.map(([amount, incomeDate, tag]) => ({
            amount,
            incomeDate: incomeDate ? d(incomeDate) : null,
            tag,
          })),
        },
      },
    });
    showcaseReportCount += 1;

    for (const [supplierIndex, amount, description, isFuture] of figures.suppliers) {
      await prisma.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: suppliers[supplierIndex].id,
          amount,
          date: isFuture ? null : d('2026-07-31'),
          description,
          isFuture,
          vatPercentage: isFuture ? null : 18,
        },
      });
    }

    // A partial payout against what the month's work leaves the subcontractor.
    // The approval's labels come from the income entries above, not from here.
    const totalIncome = figures.income.reduce((sum, [amount]) => sum + amount, 0);
    const suppliersTotal = figures.suppliers.reduce(
      (sum, [, amount]) => sum + amount,
      0,
    );
    const owed = totalIncome * (1 - figures.profitMargin / 100) - suppliersTotal;

    await prisma.subcontractorPayment.create({
      data: {
        subcontractorId: subcontractors[0].id,
        projectId: project.id,
        serviceDate: d(SHOWCASE_MONTH),
        amount: Math.floor((owed * 0.6) / 100) * 100,
        isPaid: true,
      },
    });
  }

  // ── History: earlier months across the whole portfolio ────────────────────
  let historyReportCount = 0;
  const withHistory = [
    ...showcaseProjects.map((project) => ({ project, subcontractor: subcontractors[0] })),
    ...backgroundProjects.map((project, index) => ({
      project,
      subcontractor: subcontractors[(index % (subcontractors.length - 1)) + 1],
    })),
  ];

  for (const { project, subcontractor } of withHistory) {
    const estimated = Number(project.estimatedAmount);
    const profitMargin = Math.round((8 + rand() * 6) * 2) / 2;

    for (const month of HISTORY_MONTHS) {
      const base = money(estimated * 0.012, estimated * 0.035);
      const paidLate = rand() < 0.18;

      const report = await prisma.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: d(month),
          profitMargin,
          incomeEntries: {
            create:
              rand() < 0.35
                ? [
                    {
                      amount: Math.round(base * 0.6),
                      incomeDate: d(month),
                      tag: oneOf(BACKGROUND_TAGS),
                    },
                    {
                      amount: Math.round(base * 0.4),
                      incomeDate: paidLate ? null : d(month),
                      tag: oneOf(BACKGROUND_TAGS),
                    },
                  ]
                : [
                    {
                      amount: base,
                      incomeDate: paidLate ? null : d(month),
                      tag: oneOf(BACKGROUND_TAGS),
                    },
                  ],
          },
        },
      });
      historyReportCount += 1;

      const supplierCount = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < supplierCount; i += 1) {
        const isFuture = rand() < 0.12;
        await prisma.supplierPayment.create({
          data: {
            projectReportId: report.id,
            supplierId: oneOf(suppliers).id,
            amount: money(base * 0.03, base * 0.11, 50),
            date: isFuture ? null : d(month),
            description: oneOf(SUPPLIER_DESCRIPTIONS),
            isFuture,
            vatPercentage: isFuture ? null : 18,
          },
        });
      }

      if (rand() < 0.7) {
        await prisma.subcontractorPayment.create({
          data: {
            subcontractorId: subcontractor.id,
            projectId: project.id,
            serviceDate: d(month),
            amount: Math.round(base * (0.45 + rand() * 0.25)),
            isPaid: true,
          },
        });
      }
    }
  }

  console.log(
    [
      '✅ Hebrew demo seed complete:',
      `   ${clients.length} clients · ${SUBCONTRACTORS.length} subcontractors · ${SUPPLIER_NAMES.length} suppliers`,
      `   ${showcaseProjects.length + backgroundProjects.length + FUTURE_PROJECTS.length} projects`,
      `   ${showcaseReportCount + historyReportCount} project reports across ${MONTHS.length} months`,
      `   showcase month ${SHOWCASE_MONTH}: "${CLIENT_NAMES[0]}" × "${SUBCONTRACTORS[0].name}"`,
    ].join('\n'),
  );
}

main()
  .catch((error) => {
    console.error('❌ Hebrew demo seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
