import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectClientAssignmentsService } from './project-client-assignments.service';
import { TransferProjectDto } from './dto/transfer-project.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { ProjectClientAssignmentResponseDto } from './dto/project-client-assignment-response.dto';

/**
 * Controller for a project's ownership timeline — which client owns it, from
 * which month.
 * @param assignmentsService Service providing transfer business logic
 */
@ApiBearerAuth()
@ApiTags('projects')
@Controller()
export class ProjectClientAssignmentsController {
  constructor(
    private readonly assignmentsService: ProjectClientAssignmentsService,
  ) {}

  /**
   * Returns a project's full ownership timeline, oldest first.
   * @param projectId Project to describe
   */
  @Get('/projects/:projectId/client-assignments')
  @ApiOperation({ summary: "Get a project's client ownership timeline" })
  @ApiOkResponse({ type: [ProjectClientAssignmentResponseDto] })
  async findAllForProject(
    @Param('projectId') projectId: string,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    return await this.assignmentsService.findAllForProject(projectId);
  }

  /**
   * Transfers a project to another client from a given month onward.
   * Months before that month keep whichever client owned them.
   * @param projectId Project to transfer
   * @param dto New client and the first month they own it
   */
  @Post('/projects/:projectId/transfer')
  @ApiOperation({
    summary: 'Transfer a project to another client from a given month',
  })
  @ApiOkResponse({ type: [ProjectClientAssignmentResponseDto] })
  @ApiNotFoundResponse({ description: 'Project or client not found' })
  @ApiConflictResponse({
    description: 'The project already changes client in that month',
  })
  async transfer(
    @Param('projectId') projectId: string,
    @Body() dto: TransferProjectDto,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    return await this.assignmentsService.transfer(projectId, dto);
  }

  /**
   * Corrects an assignment — typically a mistyped transfer month.
   * @param id Assignment to correct
   * @param dto Fields to change
   */
  @Patch('/projects/client-assignments/:id')
  @ApiOperation({ summary: 'Correct a project-client assignment' })
  @ApiOkResponse({ type: [ProjectClientAssignmentResponseDto] })
  @ApiNotFoundResponse({ description: 'Assignment not found' })
  @ApiConflictResponse({
    description: 'The project already changes client in that month',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    return await this.assignmentsService.update(id, dto);
  }

  /**
   * Removes an assignment, undoing a transfer. A project's earliest assignment
   * cannot be removed — every project must always have one.
   * @param id Assignment to remove
   */
  @Delete('/projects/client-assignments/:id')
  @ApiOperation({ summary: 'Remove a project-client assignment' })
  @ApiOkResponse({ type: [ProjectClientAssignmentResponseDto] })
  @ApiNotFoundResponse({ description: 'Assignment not found' })
  @ApiConflictResponse({
    description: "Cannot remove a project's earliest assignment",
  })
  async remove(
    @Param('id') id: string,
  ): Promise<ProjectClientAssignmentResponseDto[]> {
    return await this.assignmentsService.remove(id);
  }
}
