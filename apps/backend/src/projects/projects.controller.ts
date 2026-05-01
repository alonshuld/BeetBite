import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { ProjectBasicResponseDto } from './dto/project-basic-response.dto';

/**
 * Controller for project-related endpoints.
 * Handles create, read, update (PUT), and delete operations.
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Create a new project.
   * @param createProjectDto Payload with project properties
   * @returns The created ProjectResponseDto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({
    description: 'The project has been successfully created.',
    type: ProjectBasicResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project already exists' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectBasicResponseDto> {
    return await this.projectsService.create(createProjectDto);
  }

  /**
   * Retrieve all projects.
   * @param pagination Optional pagination query parameters (page and limit)
   * @returns An array of ProjectResponseDto
   */
  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination' })
  @ApiOkResponse({
    description: 'List of projects',
    type: ProjectResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<ProjectResponseDto[]> {
    return await this.projectsService.findAll(pagination);
  }

  /**
   * Retrieve a project by its ID.
   * @param id The project identifier
   * @returns The found ProjectResponseDto
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({
    description: 'The project has been found.',
    type: ProjectResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    return await this.projectsService.findOne(id);
  }

  /**
   * Replace an existing project (PUT semantics).
   * Expects a full UpdateProjectDto payload.
   * @param id The project identifier
   * @param updateProjectDto Full project DTO for replacement
   * @returns The updated ProjectResponseDto
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({
    description: 'The project has been successfully updated.',
    type: ProjectBasicResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Project already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectBasicResponseDto> {
    return await this.projectsService.update(id, updateProjectDto);
  }

  /**
   * Delete a project by ID.
   * @param id The project identifier
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiNoContentResponse({
    description: 'The project has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.projectsService.remove(id);
  }
}
