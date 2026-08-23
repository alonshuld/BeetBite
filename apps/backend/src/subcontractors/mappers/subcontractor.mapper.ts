import { Subcontractor } from 'src/generated/client';
import { SubcontractorResponseDto } from '../dto/subcontractor-response.dto';

/**
 * Covert the given subcontractor entity to a subcontractor response DTO.
 * @param subcontractor The subcontractor entity to convert.
 * @returns The subcontractor response DTO.
 */
export const toSubcontractorResponse = (
  subcontractor: Subcontractor,
): SubcontractorResponseDto => ({
  ...subcontractor,
});

/**
 * Convert an array of subcontractor entities to a array of subcontractor response DTOs.
 * @param subcontractors The array of subcontractors entities to convert.
 * @returns A array of subcontractors response DTOs.
 */
export const toSubcontractorResponseList = (
  subcontractors: Subcontractor[],
): SubcontractorResponseDto[] => subcontractors.map(toSubcontractorResponse);
