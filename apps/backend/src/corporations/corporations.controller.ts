import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';

@ApiTags('corporations')
@Controller('corporations')
export class CorporationsController {
  constructor(private readonly corporationsService: CorporationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new corporation' })
  @ApiCreatedResponse({
    description: 'The corporation has been successfully created.',
    type: CorporationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Corporation already exists' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The corporation has been successfully created.',
    type: CorporationResponseDto,
  })
  create(
    @Body() createCorporationDto: CreateCorporationDto,
  ): Promise<CorporationResponseDto> {
    return this.corporationsService.create(createCorporationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all corporations with pagination' })
  @ApiOkResponse({
    description: 'List of corporations',
    type: CorporationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of corporations',
    type: CorporationResponseDto,
  })
  findAll(): Promise<CorporationResponseDto[]> {
    return this.corporationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a corporation by ID' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiOkResponse({
    description: 'The corporation has been found.',
    type: CorporationResponseDto,
  })
  findOne(@Param('id') id: string): Promise<CorporationResponseDto> {
    return this.corporationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a corporation' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiOkResponse({
    description: 'The corporation has been successfully updated.',
    type: CorporationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Corporation not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Corporation name already exists' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The corporation has been successfully updated.',
    type: CorporationResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateCorporationDto: UpdateCorporationDto,
  ): Promise<CorporationResponseDto> {
    return this.corporationsService.update(id, updateCorporationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a corporation' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiOkResponse({
    description: 'The corporation has been successfully deleted.',
    type: CorporationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The corporation has been successfully deleted.',
    type: CorporationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Corporation not found' })
  remove(@Param('id') id: string): Promise<CorporationResponseDto> {
    return this.corporationsService.remove(id);
  }
}
