import { Subcontractor } from 'src/generated/client';
import { SubcontractorResponseDto } from '../dto/subcontractor-repsonse.dto';

export class SubcontractorMapper {
  static toResponse(subcontractor: Subcontractor): SubcontractorResponseDto {
    return {
      id: subcontractor.id,
      name: subcontractor.name,
    };
  }

  static toResponseList(
    subcontractors: Subcontractor[],
  ): SubcontractorResponseDto[] {
    return subcontractors.map((sc) => SubcontractorMapper.toResponse(sc));
  }
}
