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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InitiatorsService } from './initiators.service';
import { CreateInitiatorDto } from './dto/create-initiator.dto';
import { UpdateInitiatorDto } from './dto/update-initiator.dto';
import { InitiatorResponseDto } from './dto/initiator-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

/**
 * Controller for initiator-related endpoints.
 * Handles create, read, update, and delete operations.
 */
@ApiBearerAuth()
@ApiTags('initiators')
@Controller('initiators')
export class InitiatorsController {
  constructor(private readonly initiatorsService: InitiatorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new initiator' })
  @ApiCreatedResponse({
    description: 'The initiator has been successfully created.',
    type: InitiatorResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Initiator already exists' })
  async create(
    @Body() createInitiatorDto: CreateInitiatorDto,
  ): Promise<InitiatorResponseDto> {
    return await this.initiatorsService.create(createInitiatorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all initiators with pagination' })
  @ApiOkResponse({
    description: 'List of initiators',
    type: InitiatorResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<InitiatorResponseDto[]> {
    return await this.initiatorsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an initiator by ID' })
  @ApiParam({ name: 'id', description: 'Initiator ID' })
  @ApiOkResponse({
    description: 'The initiator has been found.',
    type: InitiatorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Initiator not found' })
  async findOne(@Param('id') id: string): Promise<InitiatorResponseDto> {
    return await this.initiatorsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an initiator' })
  @ApiParam({ name: 'id', description: 'Initiator ID' })
  @ApiOkResponse({
    description: 'The initiator has been successfully updated.',
    type: InitiatorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Initiator not found' })
  @ApiConflictResponse({ description: 'Initiator name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateInitiatorDto: UpdateInitiatorDto,
  ): Promise<InitiatorResponseDto> {
    return this.initiatorsService.update(id, updateInitiatorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an initiator' })
  @ApiParam({ name: 'id', description: 'Initiator ID' })
  @ApiNoContentResponse({
    description: 'The initiator has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Initiator not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.initiatorsService.remove(id);
  }
}
