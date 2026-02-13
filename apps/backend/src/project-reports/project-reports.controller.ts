import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectReportsService } from './project-reports.service';
import { ProjectReportListItemDto } from './dto/project-report-list-item.dto';
import { CreateProjectReportDto } from './dto/create-project-report.dto';
import { UpdateProjectReportDto } from './dto/update-project-report.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';
import { ProjectReportResponseDto } from './dto/project-report-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

/**
 * Controller for project report related endpoints.
 */
@ApiTags('project-reports')
@Controller()
export class ProjectReportsController {
  constructor(private readonly projectReportsService: ProjectReportsService) {}

  /**
   * Create a new project report.
   * @param createProjectReportDto Payoad with project report properties
   * @returns The created ProjectResponseDto
   */
  @Post('/projects/reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project report' })
  @ApiCreatedResponse({
    description: 'The project report has been successfully created.',
    type: ProjectReportListItemDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project report already exists' })
  async create(
    @Body() createProjectReportDto: CreateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.create(createProjectReportDto);
  }

  /**
   * Retrieve all project reports in the given month.
   * @param paginatedMonthQueryDto Optional pagination and month query parameters (page, limit, month)
   * @returns An array of ProjectReportListItemDto
   */
  @Get('/projects/reports')
  @ApiOperation({
    summary: 'Get all project reports in a given month with pagination',
  })
  @ApiOkResponse({
    description: 'List of project reports in the given month',
    type: ProjectReportListItemDto,
    isArray: true,
  })
  async findProjectReportsInMonth(
    @Query() paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<ProjectReportListItemDto[]> {
    return await this.projectReportsService.findProjectReportsInMonth(
      paginatedMonthQueryDto,
    );
  }

  /**
   * Retrieve a project report by its ID.
   * @param id The project report identifier
   * @returns The found ProjectResponseDto
   */
  @Get('/projects/reports/:id')
  @ApiOperation({ summary: 'Get a project report by ID' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiOkResponse({
    description: 'The project report has been found.',
    type: ProjectReportResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async findOne(@Param('id') id: string): Promise<ProjectReportResponseDto> {
    return await this.projectReportsService.findOne(id);
  }

  /**
   * Retrieve the project report for the project with the given ID in the previous month
   * @param projectId The project identifier
   * @param monthQueryDto Query parameters to specify the month for which to retrieve the
   * report of the previous month
   * @returns The found ProjectResponseDto
   */
  @Get('/projects/:id/reports/previous')
  @ApiOperation({ summary: "Get the previous month's project report" })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiQuery({
    name: 'month',
    description: 'The month for which to retrieve the previous report',
    type: MonthQueryDto,
  })
  @ApiOkResponse({
    description: 'The project report has been found.',
    type: ProjectReportListItemDto,
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async findProjectReportForPreviousMonth(
    @Param('id') projectId: string,
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.findProjectReportForPreviousMonth(
      projectId,
      monthQueryDto,
    );
  }

  /**

   * Replace an existing project report (PUT semantics).
   * Expects a full UpdateProjectReportDto payload.
   * @param id The project report identifier
   * @param updateProjectReportDto Full project report DTO for replacement
   * @returns The updated ProjectResponseDto
   */
  @Put('/projects/reports/:id')
  @ApiOperation({ summary: 'Update a project report' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiOkResponse({
    description: 'The project report has been successfully updated.',
    type: ProjectReportListItemDto,
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project report already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectReportDto: UpdateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.update(id, updateProjectReportDto);
  }

  /**
   * Delete a project report by ID.
   * @param id The project report identifier
   */
  @Delete('/projects/reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project report' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse({
    description: 'The project report has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.projectReportsService.remove(id);
  }
}
