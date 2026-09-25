import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateProjectReportDto } from './update-project-report.dto';

async function initiatorIncomeErrors(value: unknown) {
  const dto = plainToInstance(UpdateProjectReportDto, {
    projectId: 'p1',
    date: '2024-05-01',
    initiatorIncome: value,
  });
  const errors = await validate(dto);
  return errors.filter((e) => e.property === 'initiatorIncome');
}

describe('UpdateProjectReportDto initiatorIncome', () => {
  it('accepts null, which clears it', async () => {
    expect(await initiatorIncomeErrors(null)).toHaveLength(0);
  });

  it('accepts omission', async () => {
    expect(await initiatorIncomeErrors(undefined)).toHaveLength(0);
  });

  it('accepts a number', async () => {
    expect(await initiatorIncomeErrors(120000)).toHaveLength(0);
  });

  it('rejects a negative number', async () => {
    expect(await initiatorIncomeErrors(-1)).toHaveLength(1);
  });

  it('rejects a non-number', async () => {
    expect(await initiatorIncomeErrors('abc')).toHaveLength(1);
  });
});
