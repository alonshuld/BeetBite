import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import type { Server } from 'http';
import * as path from 'path';
import request from 'supertest';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { EntityExceptionFilter } from 'src/common/filters/filter-entity-exception.filter';
import { ProjectsModule } from 'src/projects/projects.module';
import { ProjectReportsModule } from 'src/project-reports/project-reports.module';

/**
 * Integration coverage for editing a project, against real Postgres and over
 * HTTP through the same pipes and filters as production.
 *
 * A project's client is a history of assignments; `Project.clientId` only
 * caches the latest one. Every month-scoped screen reads the history, so an
 * edit that wrote the cache alone used to leave a project shown under one
 * client on the projects screen and another on its reports. An edit now never
 * writes the client: the current one is accepted (the form always sends it),
 * a different one is refused, and the transfer is the only way to change it.
 */

const JWT_SECRET = 'projects-e2e-secret-at-least-32-characters';
const EPOCH = new Date('1970-01-01T00:00:00.000Z');
const SEPTEMBER = '2026-09-01T00:00:00.000Z';

describe('Projects Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let app: INestApplication<Server>;
  let token: string;

  let clientA: string;
  let clientB: string;
  let subcontractorId: string;

  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  /** A project owned by `ownerId` from the epoch, as `POST /projects` makes it. */
  const createProject = async (name: string, ownerId = clientA) =>
    prisma.project.create({
      data: {
        clientId: ownerId,
        name,
        estimatedAmount: 100000,
        description: `${name} description`,
        requesterName: `${name} requester`,
        location: `${name} location`,
        clientAssignments: {
          create: { clientId: ownerId, effectiveFrom: EPOCH },
        },
      },
    });

  const seedReport = async (projectId: string, date = SEPTEMBER) =>
    prisma.projectReport.create({
      data: {
        projectId,
        subcontractorId,
        date: new Date(date),
        profitMargin: 10,
        incomeEntries: { create: { amount: 1000 } },
      },
    });

  /** The body the projects screen's edit form sends. */
  const editBody = (
    project: { name: string; clientId: string },
    overrides: Record<string, unknown> = {},
  ) => ({
    name: project.name,
    description: 'Edited description',
    estimatedAmount: 250000,
    clientId: project.clientId,
    requesterName: 'Edited requester',
    location: 'Edited location',
    initiatorId: null,
    ...overrides,
  });

  const assignmentsOf = (projectId: string) =>
    prisma.projectClientAssignment.findMany({
      where: { projectId },
      orderBy: { effectiveFrom: 'asc' },
      select: { clientId: true, effectiveFrom: true },
    });

  /** Which client the reports screen shows a project's report under. */
  const reportClientIn = async (projectId: string, month = '2026-09-01') => {
    const res = await http()
      .get('/api/v1/projects/reports')
      .query({ month, limit: 1000 })
      .set(auth())
      .expect(200);
    const report = (
      res.body as Array<{
        project: { id: string; client: { id: string } };
      }>
    ).find((r) => r.project.id === projectId);
    return report?.project.client.id;
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = JWT_SECRET;

    execSync('pnpm prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: databaseUrl,
              jwt: { secret: JWT_SECRET, expiresIn: '1h' },
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
        // Same order as AppModule: `/projects/reports` must be routed before
        // `/projects/:id` would swallow it.
        ProjectReportsModule,
        ProjectsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    prisma = moduleRef.get(PrismaService);

    // Mirror main.ts so validation and error mapping behave as in production.
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new EntityExceptionFilter());
    await app.init();

    token = moduleRef
      .get(JwtService)
      .sign({ sub: 'test-user-id', username: 'tester' });
  });

  beforeEach(async () => {
    clientA = (await prisma.client.create({ data: { name: '17' } })).id;
    clientB = (await prisma.client.create({ data: { name: '19' } })).id;
    subcontractorId = (
      await prisma.subcontractor.create({
        data: { name: 'Dan Builder', companyNumber: '515111222' },
      })
    ).id;
  });

  afterEach(async () => {
    await prisma.projectReportIncome.deleteMany();
    await prisma.projectReport.deleteMany();
    await prisma.project.deleteMany();
    await prisma.initiator.deleteMany();
    await prisma.client.deleteMany();
    await prisma.subcontractor.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
    await container.stop();
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should save an edit that sends the current client, leaving the client history alone', async () => {
      const project = await createProject('Trio 1B');

      const res = await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project))
        .expect(200);

      expect(res.body).toMatchObject({
        id: project.id,
        description: 'Edited description',
        estimatedAmount: 250000,
        requesterName: 'Edited requester',
        location: 'Edited location',
        clientId: clientA,
      });
      const row = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      });
      expect(row.clientId).toBe(clientA);
      expect(row.description).toBe('Edited description');
      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
      ]);
    });

    it('should refuse a different client with 400 and its code, writing nothing', async () => {
      // What a browser tab opened before this fix sends when the client is
      // changed in the edit form.
      const project = await createProject('Trio 1B');
      await seedReport(project.id);

      const res = await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project, { clientId: clientB, name: 'Renamed' }))
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'PROJECT_CLIENT_CHANGE_REQUIRES_TRANSFER',
      });
      const row = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      });
      expect(row.clientId).toBe(clientA);
      expect(row.name).toBe('Trio 1B');
      expect(row.description).toBe('Trio 1B description');
      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
      ]);
      expect(await reportClientIn(project.id)).toBe(clientA);
    });

    it('should keep the projects screen and the reports screen on the same client after an edit', async () => {
      // The reported bug: an edit moved the project to another client on the
      // projects screen while its September report stayed under the old one.
      const project = await createProject('Trio 1B');
      await seedReport(project.id);

      await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project, { clientId: clientB }))
        .expect(400);
      await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project))
        .expect(200);

      const listed = await http()
        .get('/api/v1/projects')
        .query({ active: true, future: true, closed: true })
        .set(auth())
        .expect(200);
      const shown = (
        listed.body as Array<{ id: string; client: { id: string } }>
      ).find((p) => p.id === project.id);
      expect(shown?.client.id).toBe(clientA);
      expect(await reportClientIn(project.id)).toBe(clientA);
    });

    it('should mark a project done with the payload the done toggle sends', async () => {
      // The toggle sends no initiatorId and no opening balance.
      const initiator = await prisma.initiator.create({
        data: { name: 'Yaniv' },
      });
      const project = await createProject('Trio 1B');
      await prisma.project.update({
        where: { id: project.id },
        data: { initiatorId: initiator.id },
      });

      await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send({
          name: project.name,
          description: project.description,
          estimatedAmount: 100000,
          clientId: project.clientId,
          requesterName: project.requesterName,
          location: project.location,
          isDone: true,
        })
        .expect(200);

      const row = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      });
      expect(row.isDone).toBe(true);
      expect(row.initiatorId).toBe(initiator.id);
      expect(row.clientId).toBe(clientA);
    });

    it('should edit a transferred project, which sends its current (latest) client', async () => {
      const project = await createProject('Trio 1B');
      await seedReport(project.id, '2026-06-01T00:00:00.000Z');
      await seedReport(project.id, SEPTEMBER);
      await http()
        .post(`/api/v1/projects/${project.id}/transfer`)
        .set(auth())
        .send({ clientId: clientB, effectiveFrom: '2026-09-01' })
        .expect(201);
      const transferred = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      });
      expect(transferred.clientId).toBe(clientB);

      await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(transferred))
        .expect(200);

      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
        {
          clientId: clientB,
          effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]);
      expect(await reportClientIn(project.id, '2026-06-01')).toBe(clientA);
      expect(await reportClientIn(project.id)).toBe(clientB);
    });

    it('should still edit a project whose cached client had already drifted from its history', async () => {
      // The state the bug left in production: the cache moved, the history
      // did not. The form sends the cached client, so edits keep working
      // until the data is repaired.
      const project = await createProject('Trio 1B');
      await prisma.project.update({
        where: { id: project.id },
        data: { clientId: clientB },
      });

      await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody({ name: project.name, clientId: clientB }))
        .expect(200);

      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
      ]);
    });

    it('should answer 404 for an unknown project', async () => {
      const res = await http()
        .put('/api/v1/projects/does-not-exist')
        .set(auth())
        .send(editBody({ name: 'Ghost', clientId: clientA }))
        .expect(404);

      expect(res.body).toMatchObject({ code: 'PROJECT_NOT_FOUND' });
    });

    it('should answer 404 INITIATOR_NOT_FOUND for an unknown initiator', async () => {
      const project = await createProject('Trio 1B');

      const res = await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project, { initiatorId: 'missing-initiator' }))
        .expect(404);

      expect(res.body).toMatchObject({ code: 'INITIATOR_NOT_FOUND' });
    });

    it('should answer 409 when renaming onto another project', async () => {
      await createProject('Taken Name');
      const project = await createProject('Trio 1B');

      const res = await http()
        .put(`/api/v1/projects/${project.id}`)
        .set(auth())
        .send(editBody(project, { name: 'Taken Name' }))
        .expect(409);

      expect(res.body).toMatchObject({ code: 'PROJECT_ALREADY_EXISTS' });
    });
  });

  describe('DELETE /api/v1/projects/client-assignments/:id', () => {
    const assignmentIdsOf = async (projectId: string) =>
      (
        await prisma.projectClientAssignment.findMany({
          where: { projectId },
          orderBy: { effectiveFrom: 'asc' },
          select: { id: true },
        })
      ).map((a) => a.id);

    it('should refuse to remove the first assignment with 400 and its code', async () => {
      const project = await createProject('Trio 1B');
      const [earliest] = await assignmentIdsOf(project.id);

      const res = await http()
        .delete(`/api/v1/projects/client-assignments/${earliest}`)
        .set(auth())
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'CANNOT_REMOVE_EARLIEST_ASSIGNMENT',
      });
      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
      ]);
    });

    it('should still remove a later transfer and restore the earlier client', async () => {
      const project = await createProject('Trio 1B');
      await http()
        .post(`/api/v1/projects/${project.id}/transfer`)
        .set(auth())
        .send({ clientId: clientB, effectiveFrom: '2026-09-01' })
        .expect(201);
      const [, transfer] = await assignmentIdsOf(project.id);

      await http()
        .delete(`/api/v1/projects/client-assignments/${transfer}`)
        .set(auth())
        .expect(200);

      expect(await assignmentsOf(project.id)).toEqual([
        { clientId: clientA, effectiveFrom: EPOCH },
      ]);
      const row = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      });
      expect(row.clientId).toBe(clientA);
    });
  });

  describe('GET /api/v1/projects/reports', () => {
    it('should keep its default page of 10 and return the whole month when asked', async () => {
      for (let i = 1; i <= 12; i++) {
        await seedReport((await createProject(`Project ${i}`)).id);
      }

      const paged = await http()
        .get('/api/v1/projects/reports')
        .query({ month: '2026-09-01' })
        .set(auth())
        .expect(200);
      const whole = await http()
        .get('/api/v1/projects/reports')
        .query({ month: '2026-09-01', limit: 1000 })
        .set(auth())
        .expect(200);

      expect(paged.body).toHaveLength(10);
      expect(whole.body).toHaveLength(12);
    });
  });
});
