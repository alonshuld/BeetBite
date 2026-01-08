import { PartialType } from '@nestjs/swagger';
import { CreateCorporationDto } from './create-corporation.dto';

export class UpdateCorporationDto extends PartialType(CreateCorporationDto) {}
