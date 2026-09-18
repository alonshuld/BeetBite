import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExportClientSimulatedPdfDto } from './export-client-simulated-pdf.dto';

describe('ExportClientSimulatedPdfDto', () => {
  const valid = {
    clientId: 'client-1',
    month: '2026-03-01',
    overrides: [{ projectId: 'project-1', margin: 15 }],
  };

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(ExportClientSimulatedPdfDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts an empty overrides array — every project then renders at its stored margin', async () => {
    const dto = plainToInstance(ExportClientSimulatedPdfDto, {
      ...valid,
      overrides: [],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a margin below 0', async () => {
    const dto = plainToInstance(ExportClientSimulatedPdfDto, {
      ...valid,
      overrides: [{ projectId: 'project-1', margin: -1 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a margin above 100', async () => {
    const dto = plainToInstance(ExportClientSimulatedPdfDto, {
      ...valid,
      overrides: [{ projectId: 'project-1', margin: 101 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a missing clientId', async () => {
    const dto = plainToInstance(ExportClientSimulatedPdfDto, {
      ...valid,
      clientId: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clientId')).toBe(true);
  });
});
