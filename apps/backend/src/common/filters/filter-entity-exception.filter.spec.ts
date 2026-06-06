import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { EntityExceptionFilter } from './filter-entity-exception.filter';
import { EntityAlreadyExistsError } from '../errors/entity-already-exists.error';
import { EntityError } from '../errors/entity.error';
import { EntityHasRelatedRecordsError } from '../errors/entity-has-related-records.error';
import { EntityNotFoundError } from '../errors/entity-not-found.error';

describe('EntityExceptionFilter', () => {
  let filter: EntityExceptionFilter;

  let mockJson: jest.Mock<void, [Record<string, unknown>]>;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new EntityExceptionFilter();

    mockJson = jest.fn<void, [Record<string, unknown>]>();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: '/api/v1/test', method: 'DELETE' }),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('EntityNotFoundError', () => {
    it('should respond with HTTP 404', () => {
      filter.catch(new EntityNotFoundError('Client not found'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should include the error message in the response body', () => {
      filter.catch(new EntityNotFoundError('Client not found'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Client not found',
        }),
      );
    });
  });

  describe('EntityAlreadyExistsError', () => {
    it('should respond with HTTP 409', () => {
      filter.catch(
        new EntityAlreadyExistsError('Client already exists'),
        mockHost,
      );

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('should include the error message in the response body', () => {
      filter.catch(
        new EntityAlreadyExistsError('Client already exists'),
        mockHost,
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Client already exists',
        }),
      );
    });
  });

  describe('EntityHasRelatedRecordsError', () => {
    it('should respond with HTTP 409 (extends EntityAlreadyExistsError)', () => {
      filter.catch(
        new EntityHasRelatedRecordsError('project', 'reports'),
        mockHost,
      );

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });
  });

  describe('unrecognised EntityError subclass', () => {
    it('should respond with HTTP 500 and include the error message', () => {
      class CustomEntityError extends EntityError {}
      filter.catch(new CustomEntityError('Something broke'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something broke',
        }),
      );
    });
  });

  describe('HttpException', () => {
    it('should pass the HTTP status through unchanged', () => {
      filter.catch(
        new HttpException('Forbidden', HttpStatus.FORBIDDEN),
        mockHost,
      );

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it('should extract the message from the exception response', () => {
      filter.catch(
        new HttpException('Bad Request', HttpStatus.BAD_REQUEST),
        mockHost,
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.BAD_REQUEST }),
      );
    });
  });

  describe('unknown errors', () => {
    it('should respond with HTTP 500 and a generic message', () => {
      filter.catch(new Error('unexpected runtime error'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should respond with HTTP 500 for non-Error throwables', () => {
      filter.catch('plain string thrown', mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('response envelope', () => {
    it('should always include timestamp, path, and method', () => {
      filter.catch(new EntityNotFoundError('Not found'), mockHost);

      const responseBody = mockJson.mock.calls[0][0];
      expect(typeof responseBody['timestamp']).toBe('string');
      expect(responseBody['path']).toBe('/api/v1/test');
      expect(responseBody['method']).toBe('DELETE');
    });
  });
});
