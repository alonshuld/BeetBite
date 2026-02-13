import { Corporation } from 'src/generated/client';
import { CorporationResponseDto } from '../dto/corporation-response.dto';

/**
 * Converts the given corporation entity to a corporation response DTO.
 * @param corporation The corporation entity to convert
 * @returns The corporation response DTO.
 */
export const toCorporationResponse = (
  corporation: Corporation,
): CorporationResponseDto => ({
  ...corporation,
});

/**
 * Converts the given array of corporation entities to an array of corporation response DTOs.
 * @param corporations The array of corporation entities to convert.
 * @returns An array of corporation response DTOs.
 */
export const toCorporationResponseList = (
  corporations: Corporation[],
): CorporationResponseDto[] => corporations.map(toCorporationResponse);
