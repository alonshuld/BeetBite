import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const validPayload = {
    clientId: 'client-1',
    name: 'Test Project',
    estimatedAmount: 100000,
    description: 'Test project description',
    requesterName: 'Jane Doe',
    location: '123 Main St, Tel Aviv',
  };

  it('passes validation with a requesterName and location', async () => {
    const dto = plainToInstance(CreateProjectDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a project without a requesterName', async () => {
    const payload: Partial<typeof validPayload> = { ...validPayload };
    delete payload.requesterName;
    const dto = plainToInstance(CreateProjectDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'requesterName')).toBe(true);
  });

  it('rejects a project with a blank requesterName', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      requesterName: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'requesterName')).toBe(true);
  });

  it('rejects a project without a location', async () => {
    const payload: Partial<typeof validPayload> = { ...validPayload };
    delete payload.location;
    const dto = plainToInstance(CreateProjectDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'location')).toBe(true);
  });

  it('rejects a project with a blank location', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      location: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'location')).toBe(true);
  });
});
