import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
import { CorporationNotFoundError } from 'src/corporations/errors/corporation-not-found.error';
import { IncomeEntryResponseDto } from './dto/income-entry-response.dto';
import { UpdateIncomeEntryDto } from './dto/update-income-entry.dto';

const REPORT_INCLUDE = {
  project: {
    select: {
      id: true,
      name: true,
      client: { select: { id: true, name: true } },
    },
  },
  subcontractor: {
    select: { id: true, name: true },
  },
  incomeEntries: {
    select: { id: true, amount: true, incomeDate: true },
  },
  corporationPayments: {
    select: {
      id: true,
      amount: true,
      corporation: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ProjectReportsService {
  private readonly logger = new Logger(ProjectReportsService.name);

  constructor(private readonly prismaService: PrismaService) {}

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

  async create(
    createProjectReportDto: CreateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const enriched = await this.enrichCreateProjectReportDto(
      createProjectReportDto,
    );

    try {
      const created = await this.prismaService.$transaction(async (tx) => {
        const report = await tx.projectReport.create({
          data: {
            date: new Date(enriched.date),
            profitMargin: new Prisma.Decimal(enriched.profitMargin),
            project: { connect: { id: enriched.projectId } },
            subcontractor: { connect: { id: enriched.subcontractorId } },
            incomeEntries: {
              createMany: {
                data: enriched.incomeEntries.map((e) => ({
                  amount: new Prisma.Decimal(e.amount),
                  incomeDate: e.incomeDate ? new Date(e.incomeDate) : null,
                })),
              },
            },
            corporationPayments: {
              createMany: {
                data: enriched.corporationPayments.map((cp) => ({
                  corporationId: cp.corporationId,
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
      return toProjectReportListItem(created);
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) throw error;

      switch (error.code) {
        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
          throw new CorporationNotFoundError();
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
    const page = paginatedMonthQueryDto.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginatedMonthQueryDto.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const projectReports = await this.prismaService.projectReport.findMany({
      where: { date: paginatedMonthQueryDto.month },
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
      include: REPORT_INCLUDE,
    });

    this.logger.log(`Retrieved ${projectReports.length} project reports`);
    return toProjectReportList(projectReports);
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
    return toProjectReportListItem(projectReport);
  }

  async findOne(id: string): Promise<ProjectReportResponseDto> {
    const projectReport = await this.prismaService.projectReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        incomeEntries: { select: { id: true, amount: true, incomeDate: true } },
        corporationPayments: {
          select: {
            id: true,
            amount: true,
            corporation: { select: { id: true, name: true } },
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
          project: { select: { id: true, name: true } },
          incomeEntries: {
            select: { id: true, amount: true, incomeDate: true },
          },
          corporationPayments: {
            select: {
              id: true,
              amount: true,
              corporation: { select: { id: true, name: true } },
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

    this.logger.log(`Project report retrieved: ${id}`);

    const totalIncome = reportWithSubPayments.incomeEntries.reduce(
      (sum, e) => sum + e.amount.toNumber(),
      0,
    );
    const profit =
      totalIncome * (reportWithSubPayments.profitMargin.toNumber() / 100);
    const corpTotal = reportWithSubPayments.corporationPayments.reduce(
      (sum, cp) => sum + cp.amount.toNumber(),
      0,
    );
    const subcontractorPayment = totalIncome - profit - corpTotal;

    this.logger.log(
      `Profit for project ${reportWithSubPayments.projectId} in ${reportWithSubPayments.date.toDateString()}: ${profit}. Subcontractor owed: ${subcontractorPayment}.`,
    );

    return toProjectReportResponse(
      reportWithSubPayments,
      profit,
      subcontractorPayment,
    );
  }

  async update(
    id: string,
    updateProjectReportDto: UpdateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const existing = await this.prismaService.projectReport.findUnique({
      where: { id },
      select: { projectId: true, date: true },
    });

    if (!existing) throw new ProjectReportNotFoundError(id);

    const enriched = await this.enrichCreateProjectReportDto({
      ...updateProjectReportDto,
      projectId: existing.projectId,
      date:
        updateProjectReportDto.date ?? existing.date.toISOString().slice(0, 10),
      incomeEntries: updateProjectReportDto.incomeEntries ?? [],
      corporationPayments: updateProjectReportDto.corporationPayments ?? [],
    });

    try {
      const updated = await this.prismaService.projectReport.update({
        where: { id },
        data: {
          date: new Date(enriched.date),
          profitMargin: new Prisma.Decimal(enriched.profitMargin),
          subcontractor: { connect: { id: enriched.subcontractorId } },
          incomeEntries: updateProjectReportDto.incomeEntries
            ? {
                deleteMany: {},
                createMany: {
                  data: updateProjectReportDto.incomeEntries.map((e) => ({
                    amount: new Prisma.Decimal(e.amount),
                    incomeDate: e.incomeDate ? new Date(e.incomeDate) : null,
                  })),
                },
              }
            : undefined,
          corporationPayments:
            updateProjectReportDto.corporationPayments !== undefined
              ? {
                  deleteMany: {},
                  createMany: {
                    data: updateProjectReportDto.corporationPayments.map(
                      (cp) => ({
                        corporationId: cp.corporationId,
                        amount: cp.amount,
                        date: cp.date ? new Date(cp.date) : null,
                      }),
                    ),
                  },
                }
              : undefined,
        },
        include: REPORT_INCLUDE,
      });
      this.logger.log(`Project report ${id} updated`);
      return toProjectReportListItem(updated);
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) throw error;

      switch (error.code) {
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

  // Income entry CRUD

  async addIncomeEntry(
    reportId: string,
    amount: number,
    incomeDate?: string,
  ): Promise<IncomeEntryResponseDto> {
    // Verify report exists
    const report = await this.prismaService.projectReport.findUnique({
      where: { id: reportId },
      select: { id: true },
    });
    if (!report) throw new ProjectReportNotFoundError(reportId);

    const entry = await this.prismaService.projectReportIncome.create({
      data: {
        projectReportId: reportId,
        amount: new Prisma.Decimal(amount),
        incomeDate: incomeDate ? new Date(incomeDate) : null,
      },
    });

    this.logger.log(`Income entry ${entry.id} added to report ${reportId}`);
    return {
      id: entry.id,
      amount: entry.amount.toNumber(),
      incomeDate: entry.incomeDate?.toISOString() ?? null,
    };
  }

  async updateIncomeEntry(
    entryId: string,
    dto: UpdateIncomeEntryDto,
  ): Promise<IncomeEntryResponseDto> {
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
        },
      });

      this.logger.log(`Income entry ${entryId} updated`);
      return {
        id: entry.id,
        amount: entry.amount.toNumber(),
        incomeDate: entry.incomeDate?.toISOString() ?? null,
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
