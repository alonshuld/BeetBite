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
  ApiTags,
} from '@nestjs/swagger';
import { SubcontractorTeamsService } from './subcontractor-teams.service';
import { SubcontractorTeamRequestDto } from './dto/subcontractor-team-request.dto';
import { SubcontractorTeamResponseDto } from './dto/subcontractor-team-response.dto';

@ApiBearerAuth()
@ApiTags('subcontractor-teams')
@Controller('subcontractor-teams')
export class SubcontractorTeamsController {
  constructor(private readonly teamsService: SubcontractorTeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subcontractor teams with their members' })
  @ApiOkResponse({ type: SubcontractorTeamResponseDto, isArray: true })
  async findAll(): Promise<SubcontractorTeamResponseDto[]> {
    return await this.teamsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team from existing subcontractors' })
  @ApiCreatedResponse({ type: SubcontractorTeamResponseDto })
  @ApiBadRequestResponse({ description: 'Fewer than two members' })
  @ApiNotFoundResponse({ description: 'A member does not exist' })
  @ApiConflictResponse({ description: 'A member is already in a team' })
  async create(
    @Body() dto: SubcontractorTeamRequestDto,
  ): Promise<SubcontractorTeamResponseDto> {
    return await this.teamsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Replace a team's members" })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiOkResponse({ type: SubcontractorTeamResponseDto })
  @ApiNotFoundResponse({ description: 'Team or member not found' })
  @ApiConflictResponse({ description: 'A member is already in another team' })
  async update(
    @Param('id') id: string,
    @Body() dto: SubcontractorTeamRequestDto,
  ): Promise<SubcontractorTeamResponseDto> {
    return await this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disband a team; its members stay' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiNoContentResponse({ description: 'Team disbanded' })
  @ApiNotFoundResponse({ description: 'Team not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.teamsService.remove(id);
  }
}
