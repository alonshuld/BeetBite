import { Corporation } from 'src/generated/client';
import { CorporationResponseDto } from '../dto/corporation-response.dto';

export class CorporationMapper {
  static toResponse(corporation: Corporation): CorporationResponseDto {
    return {
      id: corporation.id,
      name: corporation.name,
    };
  }

  static toResponseList(corporations: Corporation[]): CorporationResponseDto[] {
    return corporations.map((corp) => CorporationMapper.toResponse(corp));
  }
}
