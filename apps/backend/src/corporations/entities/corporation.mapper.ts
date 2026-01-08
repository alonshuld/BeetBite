import { Corporation } from 'src/generated/client';
import { Corporation as CorporationEntity } from './corporation.entity';

export class CorporationMapper {
  static toResponse(corporation: Corporation): CorporationEntity {
    return {
      id: corporation.id,
      name: corporation.name,
    };
  }

  static toResponseList(corporations: Corporation[]): CorporationEntity[] {
    return corporations.map((corp) => CorporationMapper.toResponse(corp));
  }
}
