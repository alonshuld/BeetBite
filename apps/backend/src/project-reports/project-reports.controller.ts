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
  ApiBearerAuth,
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
import { IncomeEntryResponseDto } from './dto/income-entry-response.dto';
import { CreateIncomeEntryDto } from './dto/create-income-entry.dto';
import { UpdateIncomeEntryDto } from './dto/update-income-entry.dto';

@ApiBearerAuth()
@ApiTags('projects/reports')
@Controller()
export class ProjectReportsController {
  constructor(private readonly projectReportsService: ProjectReportsService) {}

  @Post('/projects/reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project report' })
  @ApiCreatedResponse({ type: ProjectReportListItemDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project report already exists' })
  async create(
    @Body() createProjectReportDto: CreateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.create(createProjectReportDto);
  }

  @Get('/projects/reports')
  @ApiOperation({ summary: 'Get all project reports in a given month with pagination' })
  @ApiOkResponse({ type: ProjectReportListItemDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid pagination or month query parameters' })
  async findProjectReportsInMonth(
    @Query() paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<ProjectReportListItemDto[]> {
    return await this.projectReportsService.findProjectReportsInMonth(paginatedMonthQueryDto);
  }

  // Income entry routes must come before :id routes to avoid routing conflicts
  @Post('/projects/reports/:reportId/income-entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new income entry to an existing project report' })
  @ApiParam({ name: 'reportId', description: 'Project report ID' })
  @ApiCreatedResponse({ type: IncomeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async addIncomeEntry(
    @Param('reportId') reportId: string,
    @Body() dto: CreateIncomeEntryDto,
  ): Promise<IncomeEntryResponseDto> {
    return await this.projectReportsService.addIncomeEntry(reportId, dto.amount, dto.incomeDate);
  }

  @Put('/projects/reports/income-entries/:id')
  @ApiOperation({ summary: 'Update a single income entry' })
  @ApiParam({ name: 'id', description: 'Income entry ID' })
  @ApiOkResponse({ type: IncomeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Income entry not found' })
  async updateIncomeEntry(
    @Param('id') id: string,
    @Body() dto: UpdateIncomeEntryDto,
  ): Promise<IncomeEntryResponseDto> {
    return await this.projectReportsService.updateIncomeEntry(id, dto);
  }

  @Delete('/projects/reports/income-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a single income entry' })
  @ApiParam({ name: 'id', description: 'Income entry ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Income entry not found' })
  async removeIncomeEntry(@Param('id') id: string): Promise<void> {
    await this.projectReportsService.removeIncomeEntry(id);
  }

  @Get('/projects/reports/:id')
  @ApiOperation({ summary: 'Get a project report by ID' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiOkResponse({ type: ProjectReportResponseDto })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async findOne(@Param('id') id: string): Promise<ProjectReportResponseDto> {
    return await this.projectReportsService.findOne(id);
  }

  @Get('/projects/:id/reports/previous')
  @ApiOperation({ summary: "Get the previous month's project report" })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiQuery({ name: 'month', type: MonthQueryDto })
  @ApiOkResponse({ type: ProjectReportListItemDto })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  @ApiBadRequestResponse({ description: 'Invalid month query' })
  async findProjectReportForPreviousMonth(
    @Param('id') projectId: string,
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.findProjectReportForPreviousMonth(
      projectId,
      monthQueryDto,
    );
  }

  @Put('/projects/reports/:id')
  @ApiOperation({ summary: 'Update a project report' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiOkResponse({ type: ProjectReportListItemDto })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project report already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectReportDto: UpdateProjectReportDto,
  ): Promise<ProjectReportListItemDto> {
    return await this.projectReportsService.update(id, updateProjectReportDto);
  }

  @Delete('/projects/reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project report' })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.projectReportsService.remove(id);
  }
}
