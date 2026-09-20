export class DatabaseURLError extends Error {
  constructor() {
    super('Database URL is not defined or is invalid');
    this.name = 'DatabaseURLError';
  }
}
