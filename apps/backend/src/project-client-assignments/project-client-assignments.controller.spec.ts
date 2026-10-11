import { Test, TestingModule } from '@nestjs/testing';
import { ProjectClientAssignmentsController } from './project-client-assignments.controller';
import { ProjectClientAssignmentsService } from './project-client-assignments.service';

describe('ProjectClientAssignmentsController', () => {
  let controller: ProjectClientAssignmentsController;

  const timeline = [
    {
      id: 'a1',
      projectId: 'project-1',
      clientId: 'client-a',
      clientName: 'Client A',
      effectiveFrom: '1970-01-01T00:00:00.000Z',
    },
    {
      id: 'a2',
      projectId: 'project-1',
      clientId: 'client-b',
      clientName: 'Client B',
      effectiveFrom: '2026-03-01T00:00:00.000Z',
    },
  ];

  const mockService = {
    findAllForProject: vi.fn(),
    transfer: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectClientAssignmentsController],
      providers: [
        { provide: ProjectClientAssignmentsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ProjectClientAssignmentsController>(
      ProjectClientAssignmentsController,
    );
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it("returns a project's ownership timeline", async () => {
    mockService.findAllForProject.mockResolvedValue(timeline);

    await expect(controller.findAllForProject('project-1')).resolves.toEqual(
      timeline,
    );
    expect(mockService.findAllForProject).toHaveBeenCalledWith('project-1');
  });

  it('transfers a project and returns the updated timeline', async () => {
    mockService.transfer.mockResolvedValue(timeline);
    const dto = { clientId: 'client-b', effectiveFrom: '2026-03-01' };

    await expect(controller.transfer('project-1', dto)).resolves.toEqual(
      timeline,
    );
    expect(mockService.transfer).toHaveBeenCalledWith('project-1', dto);
  });

  it('corrects an assignment', async () => {
    mockService.update.mockResolvedValue(timeline);
    const dto = { effectiveFrom: '2026-04-01' };

    await expect(controller.update('a2', dto)).resolves.toEqual(timeline);
    expect(mockService.update).toHaveBeenCalledWith('a2', dto);
  });

  it('removes an assignment', async () => {
    mockService.remove.mockResolvedValue([timeline[0]]);

    await expect(controller.remove('a2')).resolves.toEqual([timeline[0]]);
    expect(mockService.remove).toHaveBeenCalledWith('a2');
  });

  it('propagates service errors without swallowing them', async () => {
    mockService.transfer.mockRejectedValue(new Error('month taken'));

    await expect(
      controller.transfer('project-1', {
        clientId: 'client-b',
        effectiveFrom: '2026-03-01',
      }),
    ).rejects.toThrow('month taken');
  });
});
