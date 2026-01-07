import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma, Corporation } from 'src/generated/client';

@Injectable()
export class CorporationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createCorporationDto: Prisma.CorporationCreateInput) {
    return this.databaseService.corporation.create({
      data: createCorporationDto,
    });
  }

  async findAll(): Promise<Corporation[]> {
    return this.databaseService.corporation.findMany({});
  }

  findOne(id: string) {
    return this.databaseService.corporation.findUnique({
      where: { id },
    });
  }

  update(id: string, updateCorporationDto: Prisma.CorporationUpdateInput) {
    return this.databaseService.corporation.update({
      where: { id },
      data: updateCorporationDto,
    });
  }

  remove(id: string) {
    return this.databaseService.corporation.delete({
      where: { id },
    });
  }
}
