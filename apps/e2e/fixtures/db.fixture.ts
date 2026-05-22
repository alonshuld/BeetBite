import { test as base } from '@playwright/test';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require(
  path.resolve(__dirname, '../../backend/src/generated/client'),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require('@prisma/adapter-pg');

export type DbFixture = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
};

export const test = base.extend<DbFixture>({
  db: async ({}, use) => {
    const databaseUrl = process.env.E2E_DATABASE_URL;
    if (!databaseUrl) throw new Error('E2E_DATABASE_URL not set');

    const adapter = new PrismaPg({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter });

    await use(prisma);

    // Truncate in FK-safe order after each test
    await prisma.subcontractorPayment.deleteMany();
    await prisma.corporationPayment.deleteMany();
    await prisma.projectReport.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.subcontractor.deleteMany();
    await prisma.corporation.deleteMany();

    await prisma.$disconnect();
  },
});

export { expect } from '@playwright/test';
