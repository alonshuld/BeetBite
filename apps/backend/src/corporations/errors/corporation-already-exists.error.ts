export class CorporationAlreadyExistsError extends Error {
  constructor(corporationName: string) {
    super(`Corporation with name ${corporationName} already exists`);
    this.name = 'CorporationAlreadyExistsError';
  }
}
