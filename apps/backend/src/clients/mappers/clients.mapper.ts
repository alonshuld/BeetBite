import { Client } from 'src/generated/client';
import { ClientResponseDto } from '../dto/client-response.dto';

/**
 * Converts the given client entity to a client response DTO.
 * @param client The client entity to convert.
 * @returns The client response DTO.
 */
export const toClientResponse = (client: Client): ClientResponseDto => ({
  ...client,
});

/**
 * Converts the given list of client entities to a list of client response DTOs.
 * @param clients The array of client entities to convert.
 * @returns An array of client response DTOs.
 */
export const toClientResponseList = (clients: Client[]): ClientResponseDto[] =>
  clients.map(toClientResponse);
