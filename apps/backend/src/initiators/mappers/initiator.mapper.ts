import { Initiator } from 'src/generated/client';
import { InitiatorResponseDto } from '../dto/initiator-response.dto';

/**
 * Converts the given initiator entity to an initiator response DTO.
 * @param initiator The initiator entity to convert
 * @returns The initiator response DTO.
 */
export const toInitiatorResponse = (
  initiator: Initiator,
): InitiatorResponseDto => ({
  id: initiator.id,
  name: initiator.name,
});

/**
 * Converts the given array of initiator entities to an array of initiator response DTOs.
 * @param initiators The array of initiator entities to convert.
 * @returns An array of initiator response DTOs.
 */
export const toInitiatorResponseList = (
  initiators: Initiator[],
): InitiatorResponseDto[] => initiators.map(toInitiatorResponse);
