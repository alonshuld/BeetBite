import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProjectDto } from './update-project.dto';
import { CreateProjectDto } from './create-project.dto';

const validProject = {
  clientId: 'client-1',
  name: 'Test Project',
  description: 'Test description',
  estimatedAmount: 100000,
  requesterName: 'Jane Doe',
  location: '123 Main St, Tel Aviv',
};

const openingBalance = {
  amount: 45000,
  month: '2026-03-01',
  subcontractorId: 'subcontractor-1',
  profitMargin: 12.5,
};

describe('UpdateProjectDto', () => {
  it('accepts the fields it shares with create', async () => {
    const dto = plainToInstance(UpdateProjectDto, validProject);
    expect(await validate(dto)).toHaveLength(0);
  });

  // 🔴 update() spreads this DTO straight into prisma.project.update, so an
  // inherited openingBalance would reach Prisma as an unknown column. The
  // global ValidationPipe uses forbidNonWhitelisted, which only rejects it if
  // the property is genuinely absent from the class.
  it('does not carry openingBalance over from create', async () => {
    const dto = plainToInstance(UpdateProjectDto, {
      ...validProject,
      openingBalance,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('openingBalance');
  });

  it('still allows openingBalance on create', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validProject,
      openingBalance,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });
});
