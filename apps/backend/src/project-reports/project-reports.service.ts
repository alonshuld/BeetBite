import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectClientAssignmentsService } from 'src/project-client-assignments/project-client-assignments.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { CreateProjectReportDto } from './dto/create-project-report.dto';
import { ProjectReportListItemDto } from './dto/project-report-list-item.dto';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { Prisma } from 'src/generated/client';
import { ProjectNotFoundError } from 'src/projects/errors/project-not-found.exception';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { ProjectReportAlreadyExistsError } from './errors/project-report-already-exists.exception';
import {
  toProjectReportList,
  toProjectReportListItem,
  toProjectReportResponse,
} from './mappers/project-reports.mapper';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';
import { ProjectReportResponseDto } from './dto/project-report-response.dto';
import { ProjectReportNotFoundError } from './errors/project-report-not-found.exception';
import { UpdateProjectReportDto } from './dto/update-project-report.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { SupplierNotFoundError } from 'src/suppliers/errors/supplier-not-found.error';
import { InitiatorIncomeNotAllowedError } from './errors/initiator-income-not-allowed.error';
import { InitiatorIncomeTooLowError } from './errors/initiator-income-too-low.error';
import { IncomeEntryResponseDto } from './dto/income-entry-response.dto';
import { CreateIncomeEntryDto } from './dto/create-income-entry.dto';
import { UpdateIncomeEntryDto } from './dto/update-income-entry.dto';
import { SubcontractorNotInTeamError } from './errors/subcontractor-not-in-team.error';
import { ProjectReportHasSubcontractorPaymentsError } from './errors/project-report-has-subcontractor-payments.error';

const REPORT_INCLUDE = {
  project: {
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      requesterName: true,
      initiator: { select: { name: true } },
      client: { select: { id: true, name: true } },
    },
  },
  subcontractor: {
    select: { id: true, name: true },
  },
  incomeEntries: {
    select: { id: true, amount: true, incomeDate: true, tag: true },
  },
  supplierPayments: {
    select: {
      id: true,
      amount: true,
      includesVat: true,
      supplier: { select: { id: true, name: true } },
    },
  },
} as const;

/**
 * `REPORT_INCLUDE.project` selects `initiator: { name }` (Prisma nests the
 * relation), but every mapper and DTO flattens it to `initiatorName` — the
 * shape the frontend and PDF actually consume. Applied right after fetching,
 * so every downstream step (client resolution, mappers) only ever sees the
 * flattened shape.
 */
type WithFlattenedInitiator<T extends { project: object }> = Omit<
  T,
  'project'
> & {
  project: Omit<T['project'], 'initiator'> & { initiatorName: string | null };
};

function withFlattenedInitiator<
  T extends { project: { initiator: { name: string } | null } },
>(report: T): WithFlattenedInitiator<T> {
  const { initiator, ...restProject } = report.project;
  return {
    ...report,
    project: { ...restProject, initiatorName: initiator?.name ?? null },
  } as WithFlattenedInitiator<T>;
}

@Injectable()
export class ProjectReportsService {
  private readonly logger = new Logger(ProjectReportsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly assignmentsService: ProjectClientAssignmentsService,
    private readonly vatRatesService: VatRatesService,
  ) {}

  private async enrichCreateProjectReportDto(
    createProjectReportDto: CreateProjectReportDto,
  ): Promise<
    CreateProjectReportDto &
      Required<Pick<CreateProjectReportDto, 'subcontractorId' | 'profitMargin'>>
  > {
    if (
      createProjectReportDto.profitMargin !== undefined &&
      createProjectReportDto.subcontractorId !== undefined
    )
      return createProjectReportDto as CreateProjectReportDto &
        Required<
          Pick<CreateProjectReportDto, 'subcontractorId' | 'profitMargin'>
        >;

    const previousMonthDate = new Date(createProjectReportDto.date);
    previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);

    this.logger.debug(
      `Checking project's ${createProjectReportDto.projectId} report from ${previousMonthDate.toDateString()} to find the subcontractor ID and profit margins...`,
    );

    const previousMonthProjectReport =
      await this.prismaService.projectReport.findUnique({
        where: {
          projectId_date: {
            projectId: createProjectReportDto.projectId,
            date: previousMonthDate,
          },
        },
        select: {
          profitMargin: true,
          subcontractorId: true,
        },
      });

    if (!previousMonthProjectReport) {
      throw new ProjectReportNotFoundError(
        createProjectReportDto.projectId,
        previousMonthDate.toISOString(),
      );
    }

    return {
      ...createProjectReportDto,
      profitMargin:
        createProjectReportDto.profitMargin ??
        previousMonthProjectReport.profitMargin.toNumber(),
      subcontractorId:
        createProjectReportDto.subcontractorId ??
        previousMonthProjectReport.subcontractorId,
    };
  }

  /**
   * `initiatorIncome` is only ever meaningful alongside a project that has an
   * initiator, and always has to exceed the report's own income — enforced
   * here rather than via class-validator since both rules need data (the
   * project, the income total) that a DTO alone can't see.
   */
  private async validateInitiatorIncome(
    projectId: string,
    initiatorIncome: number,
    totalIncome: number,
  ): Promise<void> {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
      select: { initiatorId: true },
    });
    if (project && !project.initiatorId) {
      throw new InitiatorIncomeNotAllowedError();
    }
    if (initiatorIncome <= totalIncome) {
      throw new InitiatorIncomeTooLowError();
    }
  }

  /**
   * The per-entry income endpoints change a report's total without going
   * through `update`, so they must hold the same line: whatever initiator
   * income is already stored has to stay above the resulting income total.
   */
  private assertIncomeBelowStoredInitiatorIncome(
    initiatorIncome: Prisma.Decimal | null | undefined,
    newTotalIncome: number,
  ): void {
    if (initiatorIncome && initiatorIncome.toNumber() <= newTotalIncome) {
      throw new InitiatorIncomeTooLowError();
    }
  }

  private async sumIncome(reportId: string): Promise<number> {
    const { _sum } = await this.prismaService.projectReportIncome.aggregate({
      where: { projectReportId: reportId },
      _sum: { amount: true },
    });
    return _sum.amount?.toNumber() ?? 0;
  }

  async create(
    createProjectReportDto: CreateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const enriched = await this.enrichCreateProjectReportDto(
      createProjectReportDto,
    );

    if (enriched.initiatorIncome !== undefined) {
      await this.validateInitiatorIncome(
        enriched.projectId,
        enriched.initiatorIncome,
        enriched.incomeEntries.reduce((sum, e) => sum + e.amount, 0),
      );
    }

    try {
      const created = await this.prismaService.$transaction(async (tx) => {
        const report = await tx.projectReport.create({
          data: {
            date: new Date(enriched.date),
            profitMargin: new Prisma.Decimal(enriched.profitMargin),
            initiatorIncome:
              enriched.initiatorIncome !== undefined
                ? new Prisma.Decimal(enriched.initiatorIncome)
                : undefined,
            project: { connect: { id: enriched.projectId } },
            subcontractor: { connect: { id: enriched.subcontractorId } },
            incomeEntries: {
              createMany: {
                data: enriched.incomeEntries.map((e) => ({
                  amount: new Prisma.Decimal(e.amount),
                  incomeDate: e.incomeDate ? new Date(e.incomeDate) : null,
                  tag: e.tag?.trim() || null,
                })),
              },
            },
            supplierPayments: {
              createMany: {
                data: enriched.supplierPayments.map((cp) => ({
                  supplierId: cp.supplierId,
                  amount: cp.amount,
                  date: cp.date ? new Date(cp.date) : null,
                })),
              },
            },
          },
          include: REPORT_INCLUDE,
        });
        return report;
      });

      this.logger.log(`Project report created: ${created.id}`);
      return toProjectReportListItem(
        withFlattenedInitiator(created),
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) throw error;

      switch (error.code) {
        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
          throw new SupplierNotFoundError();
        case PRISMA_ERROR_CODES.NOT_FOUND: {
          const model = (error.meta?.model as string) ?? '';
          if (model.toLowerCase().includes('project'))
            throw new ProjectNotFoundError(enriched.projectId);
          if (model.toLowerCase().includes('subcontractor'))
            throw new SubcontractorNotFoundError(enriched.subcontractorId);
          throw new EntityNotFoundError(
            'Could not find either the existing project or subcontractor for the given project report',
          );
        }
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
          throw new ProjectReportAlreadyExistsError(
            enriched.projectId,
            enriched.date,
          );
        default:
          throw error;
      }
    }
  }

  async findProjectReportsInMonth(
    paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<ProjectReportListItemDto[]> {
    // Over HTTP the DTO always carries a limit (it defaults to 10 there). A
    // direct caller that passes none — the client-wide PDF export — wants the
    // whole month: paging it would silently drop that client's later projects.
    const { limit } = paginatedMonthQueryDto;
    const page = paginatedMonthQueryDto.page ?? PAGINATION_DEFAULTS.PAGE;

    const projectReports = await this.prismaService.projectReport.findMany({
      where: { date: paginatedMonthQueryDto.month },
      ...(limit === undefined
        ? {}
        : { skip: Math.max(0, (page - 1) * limit), take: Math.max(1, limit) }),
      include: REPORT_INCLUDE,
    });

    this.logger.log(`Retrieved ${projectReports.length} project reports`);
    return toProjectReportList(
      (
        await this.withResolvedClients(
          projectReports,
          paginatedMonthQueryDto.month,
        )
      ).map(withFlattenedInitiator),
      await this.vatRatesService.findAllEntries(),
    );
  }

  /**
   * Replaces each report's client with whichever client owned that project in
   * the report's own month.
   *
   * A project can change hands, and history is frozen — so the client shown
   * against a past month must be the one that owned it *then*, not whoever owns
   * the project now. Keeps the raw shape intact so the mappers are unchanged.
   *
   * @param reports Raw reports carrying `project.client`, all in one month.
   * @param month The month those reports belong to.
   * @returns The same reports with `project.client` resolved.
   */
  private async withResolvedClients<
    T extends {
      projectId: string;
      project: { client: { id: string; name: string } };
    },
  >(reports: T[], month: string | Date): Promise<T[]> {
    if (reports.length === 0) return reports;

    const resolved = await this.assignmentsService.resolveClientsForMonth(
      month,
      reports.map((report) => report.projectId),
    );

    return reports.map((report) => {
      const client = resolved.get(report.projectId);
      if (!client) {
        // Impossible after the backfill, but a missing assignment must never
        // silently drop a report off the screen.
        this.logger.warn(
          `Project ${report.projectId} has no client assignment covering its report month; falling back to its current client`,
        );
        return report;
      }
      return { ...report, project: { ...report.project, client } };
    });
  }

  /**
   * Fetch one report with everything the account-approval PDF renders.
   * @param id Project report to export
   * @returns The report, its project and client, subcontractor, income entries and supplier payments
   * @throws ProjectReportNotFoundError when no report has that id
   */
  async findOneForExport(id: string): Promise<ProjectReportListItemDto> {
    const projectReport = await this.prismaService.projectReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });

    if (!projectReport) throw new ProjectReportNotFoundError(id);

    this.logger.log(`Retrieved project report ${id} for export`);
    // The exported document must name the client that owned this project in
    // the report's own month.
    const [resolved] = await this.withResolvedClients(
      [projectReport],
      projectReport.date,
    );
    return toProjectReportListItem(
      withFlattenedInitiator(resolved),
      await this.vatRatesService.findAllEntries(),
    );
  }

  async findProjectReportForPreviousMonth(
    projectId: string,
    monthQueryDto: MonthQueryDto,
  ): Promise<ProjectReportListItemDto> {
    const previousMonthDate = new Date(monthQueryDto.month);
    previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);

    this.logger.log(
      `Finding the project report for project ${projectId} in the month ${monthQueryDto.month}`,
    );

    const projectReport = await this.prismaService.projectReport.findUnique({
      where: {
        projectId_date: { projectId, date: previousMonthDate },
      },
      include: REPORT_INCLUDE,
    });

    if (!projectReport)
      throw new ProjectReportNotFoundError(
        projectId,
        previousMonthDate.toISOString(),
      );

    this.logger.log(`Project report retrieved: ${projectReport.id}`);
    return toProjectReportListItem(
      withFlattenedInitiator(projectReport),
      await this.vatRatesService.findAllEntries(),
    );
  }

  async findOne(id: string): Promise<ProjectReportResponseDto> {
    const projectReport = await this.prismaService.projectReport.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            requesterName: true,
          },
        },
        incomeEntries: {
          select: { id: true, amount: true, incomeDate: true, tag: true },
        },
        supplierPayments: {
          select: {
            id: true,
            amount: true,
            supplier: { select: { id: true, name: true } },
          },
        },
        subcontractor: {
          select: {
            id: true,
            name: true,
            payments: {
              where: { serviceDate: undefined },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!projectReport) throw new ProjectReportNotFoundError(id);

    // Re-fetch with correct serviceDate filter
    const reportWithSubPayments =
      await this.prismaService.projectReport.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              location: true,
              requesterName: true,
              initiator: { select: { name: true } },
            },
          },
          incomeEntries: {
            select: { id: true, amount: true, incomeDate: true, tag: true },
          },
          supplierPayments: {
            select: {
              id: true,
              amount: true,
              includesVat: true,
              supplier: { select: { id: true, name: true } },
            },
          },
          subcontractor: {
            select: {
              id: true,
              name: true,
              payments: {
                where: { serviceDate: projectReport.date },
                select: { id: true },
              },
            },
          },
        },
      });

    if (!reportWithSubPayments) throw new ProjectReportNotFoundError(id);

    const flattened = withFlattenedInitiator(reportWithSubPayments);

    this.logger.log(`Project report retrieved: ${id}`);

    const totalIncome = flattened.incomeEntries.reduce(
      (sum, e) => sum + e.amount.toNumber(),
      0,
    );
    const profit = totalIncome * (flattened.profitMargin.toNumber() / 100);
    const corpTotal = flattened.supplierPayments.reduce(
      (sum, cp) => sum + cp.amount.toNumber(),
      0,
    );
    const subcontractorPayment = totalIncome - profit - corpTotal;

    this.logger.log(
      `Profit for project ${flattened.projectId} in ${flattened.date.toDateString()}: ${profit}. Subcontractor owed: ${subcontractorPayment}.`,
    );

    return toProjectReportResponse(flattened, profit, subcontractorPayment);
  }

  async update(
    id: string,
    updateProjectReportDto: UpdateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const existing = await this.prismaService.projectReport.findUnique({
      where: { id },
      select: { projectId: true, date: true, initiatorIncome: true },
    });

    if (!existing) throw new ProjectReportNotFoundError(id);

    const storedInitiatorIncome = existing.initiatorIncome?.toNumber() ?? null;
    // null clears the value: nothing left to validate against the income.
    const initiatorIncomeClearing =
      updateProjectReportDto.initiatorIncome === null;
    const initiatorIncomeChanging =
      updateProjectReportDto.initiatorIncome !== undefined &&
      !initiatorIncomeClearing;
    // Changing the income entries alone can also break the invariant against
    // an initiatorIncome saved earlier, so that case is re-checked too.
    if (
      initiatorIncomeChanging ||
      (storedInitiatorIncome !== null &&
        !initiatorIncomeClearing &&
        updateProjectReportDto.incomeEntries)
    ) {
      // incomeEntries may be omitted on an update that only touches other
      // fields — the current total then has to come from what's already
      // stored, not from an empty replacement list.
      const totalIncome = updateProjectReportDto.incomeEntries
        ? updateProjectReportDto.incomeEntries.reduce(
            (sum, e) => sum + e.amount,
            0,
          )
        : ((
            await this.prismaService.projectReportIncome.aggregate({
              where: { projectReportId: id },
              _sum: { amount: true },
            })
          )._sum.amount?.toNumber() ?? 0);

      if (initiatorIncomeChanging) {
        await this.validateInitiatorIncome(
          existing.projectId,
          updateProjectReportDto.initiatorIncome as number,
          totalIncome,
        );
      } else if ((storedInitiatorIncome as number) <= totalIncome) {
        throw new InitiatorIncomeTooLowError();
      }
    }

    const { initiatorIncome, ...updateWithoutInitiatorIncome } =
      updateProjectReportDto;
    const enriched = await this.enrichCreateProjectReportDto({
      ...updateWithoutInitiatorIncome,
      projectId: existing.projectId,
      date:
        updateProjectReportDto.date ?? existing.date.toISOString().slice(0, 10),
      incomeEntries: updateProjectReportDto.incomeEntries ?? [],
      supplierPayments: updateProjectReportDto.supplierPayments ?? [],
    });

    try {
      const updated = await this.prismaService.projectReport.update({
        where: { id },
        data: {
          date: new Date(enriched.date),
          profitMargin: new Prisma.Decimal(enriched.profitMargin),
          initiatorIncome:
            initiatorIncome === undefined || initiatorIncome === null
              ? initiatorIncome
              : new Prisma.Decimal(initiatorIncome),
          subcontractor: { connect: { id: enriched.subcontractorId } },
          incomeEntries: updateProjectReportDto.incomeEntries
            ? {
                deleteMany: {},
                createMany: {
                  data: updateProjectReportDto.incomeEntries.map((e) => ({
                    amount: new Prisma.Decimal(e.amount),
                    incomeDate: e.incomeDate ? new Date(e.incomeDate) : null,
                    tag: e.tag?.trim() || null,
                  })),
                },
              }
            : undefined,
          supplierPayments:
            updateProjectReportDto.supplierPayments !== undefined
              ? {
                  deleteMany: {},
                  createMany: {
                    data: updateProjectReportDto.supplierPayments.map((cp) => ({
                      supplierId: cp.supplierId,
                      amount: cp.amount,
                      date: cp.date ? new Date(cp.date) : null,
                    })),
                  },
                }
              : undefined,
        },
        include: REPORT_INCLUDE,
      });
      this.logger.log(`Project report ${id} updated`);
      return toProjectReportListItem(
        withFlattenedInitiator(updated),
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) throw error;

      switch (error.code) {
        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
          throw new SupplierNotFoundError();
        case PRISMA_ERROR_CODES.NOT_FOUND: {
          const model = (error.meta?.model as string) ?? '';
          if (model.toLowerCase().includes('projectreport'))
            throw new ProjectReportNotFoundError(id);
          if (model.toLowerCase().includes('project'))
            throw new ProjectNotFoundError(enriched.projectId);
          if (model.toLowerCase().includes('subcontractor'))
            throw new SubcontractorNotFoundError(enriched.subcontractorId);
          throw new EntityNotFoundError(
            'Could not find either the existing project or subcontractor for the given project report',
          );
        }
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
          throw new ProjectReportAlreadyExistsError(
            enriched.projectId,
            enriched.date,
          );
        default:
          throw error;
      }
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.projectReport.delete({ where: { id } });
      this.logger.log(`Project report deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ProjectReportNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Hands a team project to another member of the same team for the report's
   * month. Next month's report inherits the choice like any subcontractor.
   * Refused once payments are recorded against the current member, since
   * they would then settle an amount nobody owes.
   */
  async changeSubcontractor(
    id: string,
    subcontractorId: string,
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      const report = await tx.projectReport.findUnique({
        where: { id },
        select: {
          projectId: true,
          date: true,
          subcontractor: { select: { id: true, teamId: true } },
        },
      });
      if (!report) throw new ProjectReportNotFoundError(id);
      if (report.subcontractor.id === subcontractorId) return;

      const next = await tx.subcontractor.findUnique({
        where: { id: subcontractorId },
        select: { teamId: true },
      });
      if (!next) throw new SubcontractorNotFoundError(subcontractorId);
      if (!next.teamId || next.teamId !== report.subcontractor.teamId) {
        throw new SubcontractorNotInTeamError(subcontractorId);
      }

      const payments = await tx.subcontractorPayment.count({
        where: {
          subcontractorId: report.subcontractor.id,
          projectId: report.projectId,
          serviceDate: report.date,
        },
      });
      if (payments > 0) {
        throw new ProjectReportHasSubcontractorPaymentsError(id);
      }

      await tx.projectReport.update({
        where: { id },
        data: { subcontractorId },
      });
    });

    this.logger.log(
      `Project report ${id} handed to subcontractor ${subcontractorId}`,
    );
  }

  // Income entry CRUD

  async addIncomeEntry(
    reportId: string,
    dto: CreateIncomeEntryDto,
  ): Promise<IncomeEntryResponseDto> {
    // Verify report exists
    const report = await this.prismaService.projectReport.findUnique({
      where: { id: reportId },
      select: { id: true, initiatorIncome: true },
    });
    if (!report) throw new ProjectReportNotFoundError(reportId);

    if (report.initiatorIncome) {
      this.assertIncomeBelowStoredInitiatorIncome(
        report.initiatorIncome,
        (await this.sumIncome(reportId)) + dto.amount,
      );
    }

    const entry = await this.prismaService.projectReportIncome.create({
      data: {
        projectReportId: reportId,
        amount: new Prisma.Decimal(dto.amount),
        incomeDate: dto.incomeDate ? new Date(dto.incomeDate) : null,
        tag: dto.tag?.trim() || null,
      },
    });

    this.logger.log(`Income entry ${entry.id} added to report ${reportId}`);
    return {
      id: entry.id,
      amount: entry.amount.toNumber(),
      incomeDate: entry.incomeDate?.toISOString() ?? null,
      tag: entry.tag,
    };
  }

  async updateIncomeEntry(
    entryId: string,
    dto: UpdateIncomeEntryDto,
  ): Promise<IncomeEntryResponseDto> {
    if (dto.amount !== undefined) {
      const current = await this.prismaService.projectReportIncome.findUnique({
        where: { id: entryId },
        select: {
          amount: true,
          projectReportId: true,
          projectReport: { select: { initiatorIncome: true } },
        },
      });
      // A missing entry falls through to the update, which raises the 404.
      if (current?.projectReport.initiatorIncome) {
        this.assertIncomeBelowStoredInitiatorIncome(
          current.projectReport.initiatorIncome,
          (await this.sumIncome(current.projectReportId)) -
            current.amount.toNumber() +
            dto.amount,
        );
      }
    }

    try {
      const entry = await this.prismaService.projectReportIncome.update({
        where: { id: entryId },
        data: {
          ...(dto.amount !== undefined && {
            amount: new Prisma.Decimal(dto.amount),
          }),
          ...(dto.incomeDate !== undefined && {
            incomeDate: dto.incomeDate ? new Date(dto.incomeDate) : null,
          }),
          // Only touch the tag when the caller actually sent one, so an
          // amount-only update cannot silently wipe an existing label.
          ...(dto.tag !== undefined && { tag: dto.tag?.trim() || null }),
        },
      });

      this.logger.log(`Income entry ${entryId} updated`);
      return {
        id: entry.id,
        amount: entry.amount.toNumber(),
        incomeDate: entry.incomeDate?.toISOString() ?? null,
        tag: entry.tag,
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new EntityNotFoundError(`Income entry ${entryId} not found`);
      }
      throw error;
    }
  }

  async removeIncomeEntry(entryId: string): Promise<void> {
    try {
      await this.prismaService.projectReportIncome.delete({
        where: { id: entryId },
      });
      this.logger.log(`Income entry ${entryId} deleted`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new EntityNotFoundError(`Income entry ${entryId} not found`);
      }
      throw error;
    }
  }
}
