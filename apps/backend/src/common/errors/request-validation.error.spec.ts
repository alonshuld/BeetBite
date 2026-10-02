import { ValidationPipe } from '@nestjs/common';

import { CreateProjectDto } from '../../projects/dto/create-project.dto';
import { RequestValidationError } from './request-validation.error';

describe('RequestValidationError', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new RequestValidationError(errors),
  });

  async function reject(body: object): Promise<RequestValidationError> {
    try {
      await pipe.transform(body, { type: 'body', metatype: CreateProjectDto });
    } catch (e) {
      return e as RequestValidationError;
    }
    throw new Error('expected validation to fail');
  }

  const valid = {
    clientId: 'c1',
    name: 'Tower',
    estimatedAmount: 1000,
    description: 'Renovation',
    requesterName: 'Dana',
    location: 'Tel Aviv',
  };

  it('names an empty required field as missing', async () => {
    const error = await reject({ ...valid, description: '' });

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.getStatus()).toBe(400);
    expect(error.params).toEqual({ missing: 'description' });
  });

  it('separates missing fields from bad values', async () => {
    const error = await reject({
      ...valid,
      name: undefined,
      estimatedAmount: -5,
    });

    expect(error.params).toEqual({
      missing: 'name',
      invalid: 'estimatedAmount',
    });
  });

  it('reports nested fields by their dotted path', async () => {
    const error = await reject({
      ...valid,
      openingBalance: { amount: 10, month: '2026-05-01', profitMargin: 10 },
    });

    expect(error.params.missing).toBe('openingBalance.subcontractorId');
  });

  it('keeps the English messages unless detail is disabled', async () => {
    const detailed = await reject({ ...valid, description: '' });
    expect(detailed.getResponse()).toMatchObject({
      message: ['description should not be empty'],
    });

    const terse = new RequestValidationError([], false);
    expect(terse.getResponse()).toMatchObject({ message: 'Validation failed' });
  });
});
