export class CorporationNotFoundError extends Error {
  constructor(corporationId: string) {
    super(`Corporation with ID ${corporationId} not found`);
    this.name = 'CorporationNotFoundError';
  }
}
