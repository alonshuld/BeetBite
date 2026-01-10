import { Client } from 'src/generated/client';
import { ClientResponseDto } from '../dto/client-response.dto';

// Converts the given client entity to a client response DTO.
export const toClientResponse = (client: Client): ClientResponseDto => ({
  id: client.id,
  name: client.name,
});

// Converts the given list of client entities to a list of client response DTOs.
export const toClientResponseList = (client: Client[]): ClientResponseDto[] =>
  client.map(toClientResponse);
