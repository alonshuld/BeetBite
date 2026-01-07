import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CorporationsService } from './corporations.service';
import { Prisma } from 'src/generated/client';

@Controller('corporations')
export class CorporationsController {
  constructor(private readonly corporationsService: CorporationsService) {}

  @Post()
  create(@Body() createCorporationDto: Prisma.CorporationCreateInput) {
    return this.corporationsService.create(createCorporationDto);
  }

  @Get()
  findAll() {
    return this.corporationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.corporationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCorporationDto: Prisma.CorporationUpdateInput,
  ) {
    return this.corporationsService.update(id, updateCorporationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.corporationsService.remove(id);
  }
}
