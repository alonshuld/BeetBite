import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateProjectReportDto } from './create-project-report.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateProjectReportDto, {
    projectId: 'p1',
    date: '2024-05-01',
    supplierPayments: [],
    ...plain,
  });
}

describe('CreateProjectReportDto income', () => {
  it('accepts a report with no income entries', async () => {
    expect(await validate(toDto({}))).toHaveLength(0);
  });

  it('accepts an empty income list', async () => {
    expect(await validate(toDto({ incomeEntries: [] }))).toHaveLength(0);
  });

  it.each([
    ['omitted', {}],
    ['null', { amount: null }],
  ])('reads an income entry amount that is %s as 0', async (_, entry) => {
    const dto = toDto({ incomeEntries: [entry] });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.incomeEntries).toEqual([expect.objectContaining({ amount: 0 })]);
  });

  it('keeps a given amount', () => {
    const dto = toDto({ incomeEntries: [{ amount: 1 }] });

    expect(dto.incomeEntries?.[0].amount).toBe(1);
  });

  it('still rejects a negative amount', async () => {
    const errors = await validate(toDto({ incomeEntries: [{ amount: -1 }] }));

    expect(errors.map((e) => e.property)).toEqual(['incomeEntries']);
  });

  it('still rejects a non-numeric amount', async () => {
    const errors = await validate(
      toDto({ incomeEntries: [{ amount: 'abc' }] }),
    );

    expect(errors.map((e) => e.property)).toEqual(['incomeEntries']);
  });
});
