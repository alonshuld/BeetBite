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
  type Corporation,
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

const CORPORATION_NAMES = [
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
  /** [amount, incomeDate | null] — null means the client has not paid yet. */
  income: [number, string | null][];
  /** [corporationIndex, amount, description, isFuture] */
  suppliers: [number, number, string, boolean][];
  /** Short trade labels — these fill the PDF's narrow "תיאור" column. */
  tags: string[];
};

const SHOWCASE_FIGURES: ShowcaseFigures[] = [
  {
    profitMargin: 11,
    income: [[520_000, '2026-07-12'], [222_000, '2026-07-28']],
    suppliers: [
      [8, 64_800, 'יציקת גג קומה 7 ורצפות ביניים', false],
      [0, 31_500, 'הזנות חשמל ולוחות קומתיים', false],
    ],
    tags: ['שלד', 'יציקות'],
  },
  {
    profitMargin: 9.5,
    income: [[318_500, '2026-07-09']],
    suppliers: [
      [2, 27_400, 'קונסטרוקציית פלדה לחיזוק', false],
      [1, 12_950, 'החלפת קווי מים ראשיים', false],
    ],
    tags: ['חיזוק', 'תוספת'],
  },
  {
    profitMargin: 12,
    income: [[640_000, '2026-07-06'], [505_000, null]],
    suppliers: [
      [3, 88_600, 'מעטפת אלומיניום קומות 12–18', false],
      [5, 46_200, 'יחידות מיזוג מרכזיות – שלב א׳', false],
      [10, 18_400, 'מערכות מיגון וכיבוי אש', true],
    ],
    tags: ['שלד'],
  },
  {
    profitMargin: 10,
    income: [[486_000, '2026-07-15']],
    suppliers: [
      [4, 39_750, 'ריצוף וחיפוי דירות בניין ב׳', false],
      [6, 21_300, 'צבע וגמר בחדרי מדרגות', false],
    ],
    tags: ['גמר', 'תשתיות'],
  },
  {
    profitMargin: 9,
    income: [[274_300, '2026-07-21']],
    suppliers: [[8, 33_900, 'חיזוק יסודות וקירות מרתף', false]],
    tags: ['יסודות'],
  },
  {
    profitMargin: 11.5,
    income: [[400_000, '2026-07-08'], [238_750, null]],
    suppliers: [
      [2, 57_200, 'שלד פלדה למבנה החניון', false],
      [9, 24_600, 'איטום גגות ומרפסות', false],
      [11, 9_800, 'פיתוח נופי בחזית המסחר', true],
    ],
    tags: ['שלד', 'מעטפת'],
  },
  {
    profitMargin: 10.5,
    income: [[395_200, '2026-07-19']],
    suppliers: [
      [7, 28_450, 'נגרות פנים ומטבחים – שלב א׳', false],
      [0, 16_700, 'תשתיות חשמל ותאורת חוץ', false],
    ],
    tags: ['שלד', 'גמר'],
  },
];

/** Short trade labels — the PDF renders them in a narrow column. */
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
  await prisma.corporationPayment.deleteMany({});
  await prisma.projectReportIncome.deleteMany({});
  await prisma.projectReport.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.subcontractor.deleteMany({});
  await prisma.corporation.deleteMany({});
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

  const corporations: Corporation[] = [];
  for (const name of CORPORATION_NAMES) {
    corporations.push(await prisma.corporation.create({ data: { name } }));
  }

  const createProject = async (seed: ProjectSeed) =>
    prisma.project.create({
      data: {
        clientId: clients[seed.clientIndex].id,
        name: seed.name,
        estimatedAmount: seed.estimatedAmount,
        description: seed.description,
        isDone: seed.isDone ?? false,
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
          create: figures.income.map(([amount, incomeDate]) => ({
            amount,
            incomeDate: incomeDate ? d(incomeDate) : null,
          })),
        },
      },
    });
    showcaseReportCount += 1;

    for (const [corporationIndex, amount, description, isFuture] of figures.suppliers) {
      await prisma.corporationPayment.create({
        data: {
          projectReportId: report.id,
          corporationId: corporations[corporationIndex].id,
          amount,
          date: isFuture ? null : d('2026-07-31'),
          description,
          isFuture,
          vatPercentage: isFuture ? null : 18,
        },
      });
    }

    // Partial payments to the subcontractor. Their tags are what fills the
    // "תיאור" column of the exported PDF, so every showcase project gets some.
    const totalIncome = figures.income.reduce((sum, [amount]) => sum + amount, 0);
    const suppliersTotal = figures.suppliers.reduce((sum, [, amount]) => sum + amount, 0);
    const owed = totalIncome * (1 - figures.profitMargin / 100) - suppliersTotal;
    const perTag = Math.floor((owed * 0.6) / figures.tags.length / 100) * 100;

    for (const tag of figures.tags) {
      await prisma.subcontractorPayment.create({
        data: {
          subcontractorId: subcontractors[0].id,
          projectId: project.id,
          serviceDate: d(SHOWCASE_MONTH),
          amount: perTag,
          isPaid: true,
          tag,
        },
      });
    }
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
                    { amount: Math.round(base * 0.6), incomeDate: d(month) },
                    { amount: Math.round(base * 0.4), incomeDate: paidLate ? null : d(month) },
                  ]
                : [{ amount: base, incomeDate: paidLate ? null : d(month) }],
          },
        },
      });
      historyReportCount += 1;

      const supplierCount = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < supplierCount; i += 1) {
        const isFuture = rand() < 0.12;
        await prisma.corporationPayment.create({
          data: {
            projectReportId: report.id,
            corporationId: oneOf(corporations).id,
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
            tag: oneOf(BACKGROUND_TAGS),
          },
        });
      }
    }
  }

  console.log(
    [
      '✅ Hebrew demo seed complete:',
      `   ${clients.length} clients · ${SUBCONTRACTORS.length} subcontractors · ${CORPORATION_NAMES.length} corporations`,
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
