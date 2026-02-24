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

/**
 * Service that provides project report related business logic.
 * @param prismaService PrismaService for database interactions.
 */
@Injectable()
export class ProjectReportsService {
  private readonly logger = new Logger(ProjectReportsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Enriches the given CreateProjectReportDto object with fields from the previous month's report if
   * it exists and the fields were not provided.
   * @param createProjectReportDto The DTO to enrich with the previous month report's fields.
   * @returns An enriched DTO that contains all the necessary values.
   */
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
      `Checking project's ${createProjectReportDto.projectId} report from
${previousMonthDate.toDateString()} to find the subcontractor ID and profit margins...`,
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

    this.logger
      .debug(`Got the following fields from the project ${createProjectReportDto.projectId} report
made in ${previousMonthDate.toDateString()}: Subcontractor ID - ${previousMonthProjectReport.subcontractorId},
Profit margin - ${previousMonthProjectReport.profitMargin.toNumber()}`);

    return {
      ...createProjectReportDto,
      profitMargin:
        createProjectReportDto.profitMargin ||
        previousMonthProjectReport.profitMargin.toNumber(),
      subcontractorId:
        createProjectReportDto.subcontractorId ||
        previousMonthProjectReport.subcontractorId,
    };
  }

  /**
   * Creates a new project report.
   * @param createProjectReportDto The DTO containing the project report details.
   * @returns The created project.
   */
  async create(
    createProjectReportDto: CreateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const enrichedCreateProjectReportDto =
      await this.enrichCreateProjectReportDto(createProjectReportDto);

    try {
      const createdProjectReport = await this.prismaService.$transaction(
        async (tx) => {
          const createdProjectReport = await tx.projectReport.create({
            data: {
              date: new Date(enrichedCreateProjectReportDto.date),
              income: new Prisma.Decimal(enrichedCreateProjectReportDto.income),
              incomeDate:
                enrichedCreateProjectReportDto.incomeDate &&
                new Date(enrichedCreateProjectReportDto.incomeDate),
              profitMargin: new Prisma.Decimal(
                enrichedCreateProjectReportDto.profitMargin,
              ),
              project: {
                connect: {
                  id: enrichedCreateProjectReportDto.projectId,
                },
              },
              subcontractor: {
                connect: {
                  id: enrichedCreateProjectReportDto.subcontractorId,
                },
              },
              corporationPayments: {
                createMany: {
                  data: enrichedCreateProjectReportDto.corporationPayments.map(
                    (corporationPay) => ({
                      corporationId: corporationPay.corporationId,
                      amount: corporationPay.amount,
                      date: corporationPay.date,
                    }),
                  ),
                },
              },
            },
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
              subcontractor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          await tx.subcontractorPayment.upsert({
            where: {
              subcontractorId_serviceDate: {
                subcontractorId: createdProjectReport.subcontractorId,
                serviceDate: createdProjectReport.date,
              },
            },
            update: {},
            create: {
              subcontractor: {
                connect: {
                  id: createdProjectReport.subcontractorId,
                },
              },
              serviceDate: createdProjectReport.date,
            },
          });

          return createdProjectReport;
        },
      );
      this.logger.log(`Project report created: ${createdProjectReport.id}`);

      return toProjectReportListItem(createdProjectReport);
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) {
        throw error;
      }

      switch (error.code) {
        case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
          throw new CorporationNotFoundError();
        case PRISMA_ERROR_CODES.NOT_FOUND: {
          const model = error.meta?.model as string;

          if (model.toLowerCase().includes('project'))
            throw new ProjectNotFoundError(
              enrichedCreateProjectReportDto.projectId,
            );
          if (model.toLowerCase().includes('subcontractor'))
            throw new SubcontractorNotFoundError(
              enrichedCreateProjectReportDto.subcontractorId,
            );

          throw new EntityNotFoundError(
            'Could not find either the existing project or subcontractor for the given project report',
          );
        }
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
          throw new ProjectReportAlreadyExistsError(
            enrichedCreateProjectReportDto.projectId,
            enrichedCreateProjectReportDto.date,
          );
        default:
          throw error;
      }
    }
  }

  /**
   * Finds all project reports in the given month with pagination.
   * @param paginatedMonthQueryDto The pagination and month query parameters.
   * @returns A list of projects reports.
   */
  async findProjectReportsInMonth(
    paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<ProjectReportListItemDto[]> {
    const page = paginatedMonthQueryDto.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginatedMonthQueryDto.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const projectReports = await this.prismaService.projectReport.findMany({
      where: {
        date: new Date(paginatedMonthQueryDto.month),
      },
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        subcontractor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Retrieved ${projectReports.length} project reports`);

    return toProjectReportList(projectReports);
  }

  /**
   * Retrieves the project report of the previous given month for the given project.
   * @param projectId The ID of the project whose previous report is to be retrieved.
   * @param monthQueryDto The month whose previous month's project report is to be retrieved.
   * @returns The project report of the given project in the previous month.
   */
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
        projectId_date: {
          projectId,
          date: previousMonthDate,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        subcontractor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!projectReport)
      throw new ProjectReportNotFoundError(projectId, monthQueryDto.month);

    this.logger.log(`Project report retrieved: ${projectReport.id}`);

    return toProjectReportListItem(projectReport);
  }

  /**
   * Finds the project report with the given ID.
   * @param id The ID of the project report to retrieve.
   * @returns An enriched project report with the given ID.
   */
  async findOne(id: string): Promise<ProjectReportResponseDto> {
    const projectReportDate = await this.prismaService.projectReport.findUnique(
      {
        where: {
          id,
        },
        select: {
          date: true,
        },
      },
    );

    if (!projectReportDate) throw new ProjectReportNotFoundError(id);

    const projectReport = await this.prismaService.projectReport.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        corporationPayments: {
          select: {
            id: true,
            amount: true,
            corporation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subcontractor: {
          select: {
            id: true,
            name: true,
            payments: {
              where: {
                serviceDate: projectReportDate.date,
              },
              select: {
                paymentDate: true,
              },
            },
          },
        },
      },
    });

    if (!projectReport) throw new ProjectReportNotFoundError(id);

    this.logger.log(`Project report retrieved: ${id}`);

    const profit =
      projectReport.income.toNumber() *
      (projectReport.profitMargin.toNumber() / 100);
    const corporationPaymentsTotal = projectReport.corporationPayments.reduce(
      (sum, corporationPay) => sum + corporationPay.amount.toNumber(),
      0,
    );

    const subcontractorPayment =
      projectReport.income.toNumber() - profit - corporationPaymentsTotal;

    this.logger.log(
      `The profit for project ${projectReport.projectId} in ${projectReport.date.toDateString()}
 is ${profit}. The subcontractor ${projectReport.subcontractorId} is owed ${subcontractorPayment}.`,
    );

    return toProjectReportResponse(projectReport, profit, subcontractorPayment);
  }

  /**
   * Updates the project report with the given ID.
   * @param id The ID of an existing project report to update.
   * @param updateProjectReportDto The DTO containing updated project report parameters.
   * @returns The updated project report.
   */
  async update(
    id: string,
    updateProjectReportDto: UpdateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    const enrichedCreateProjectReportDto =
      await this.enrichCreateProjectReportDto(updateProjectReportDto);

    try {
      const updatedProjectReport =
        await this.prismaService.projectReport.update({
          where: {
            id: id,
          },
          data: {
            date: new Date(enrichedCreateProjectReportDto.date),
            income: new Prisma.Decimal(enrichedCreateProjectReportDto.income),
            incomeDate:
              enrichedCreateProjectReportDto.incomeDate &&
              new Date(enrichedCreateProjectReportDto.incomeDate),
            profitMargin: new Prisma.Decimal(
              enrichedCreateProjectReportDto.profitMargin,
            ),
            project: {
              connect: {
                id: enrichedCreateProjectReportDto.projectId,
              },
            },
            subcontractor: {
              connect: {
                id: enrichedCreateProjectReportDto.subcontractorId,
              },
            },
            corporationPayments: {
              createMany: {
                data: enrichedCreateProjectReportDto.corporationPayments.map(
                  (corporationPay) => ({
                    corporationId: corporationPay.corporationId,
                    amount: corporationPay.amount,
                    date: corporationPay.date,
                  }),
                ),
              },
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            subcontractor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      this.logger.log(`Project report ${id} updated`);

      return toProjectReportListItem(updatedProjectReport);
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError)) {
        throw error;
      }

      switch (error.code) {
        case PRISMA_ERROR_CODES.NOT_FOUND: {
          const model = error.meta?.model as string;

          if (model.toLowerCase().includes('projectreport'))
            throw new ProjectReportNotFoundError(id);

          if (model.toLowerCase().includes('project'))
            throw new ProjectNotFoundError(
              enrichedCreateProjectReportDto.projectId,
            );
          if (model.toLowerCase().includes('subcontractor'))
            throw new SubcontractorNotFoundError(
              enrichedCreateProjectReportDto.subcontractorId,
            );

          throw new EntityNotFoundError(
            'Could not find either the existing project or subcontractor for the given project report',
          );
        }
        case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
          throw new ProjectReportAlreadyExistsError(
            enrichedCreateProjectReportDto.projectId,
            enrichedCreateProjectReportDto.date,
          );
        default:
          throw error;
      }
    }
  }

  /**
   * Removes a project report by its ID.
   * @param id The ID of the project report to remove.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.projectReport.delete({
        where: { id },
      });

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
}
