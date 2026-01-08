import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { CorporationMapper } from './entities/corporation.mapper';
import { PRISMA_ERROR_CODES } from 'src/constants';

@Injectable()
export class CorporationsService {
  constructor(private readonly db: PrismaService) { }

  async create(createCorporationDto: CreateCorporationDto) {
    try {
      const corporation = await this.db.corporation.create({
        data: { ...createCorporationDto },
      });
      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        throw new ConflictException('Corporation already exists');
      }

      throw error;
    }
  }

  async findAll() {
    const corporations = await this.db.corporation.findMany();
    return CorporationMapper.toResponseList(corporations);
  }

  async findOne(id: string) {
    const corporation = await this.db.corporation.findUnique({
      where: { id },
    });

    if (!corporation) {
      throw new NotFoundException('Corporation not found');
    }

    return CorporationMapper.toResponse(corporation);
  }

  async update(id: string, updateCorporationDto: UpdateCorporationDto) {
    try {
      const corporation = await this.db.corporation.update({
        where: { id },
        data: { ...updateCorporationDto },
      });

      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new NotFoundException('Corporation not found');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        throw new ConflictException(
          'Corporation with this name already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    try {
      const corporation = await this.db.corporation.delete({
        where: { id },
      });

      return CorporationMapper.toResponse(corporation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new NotFoundException('Corporation not found');
      }

      throw error;
    }
  }
}
