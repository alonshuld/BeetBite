import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { SubcontractorTeamsService } from './subcontractor-teams.service';
import { SubcontractorNotFoundError } from './errors/subcontractor-not-found';
import { SubcontractorAlreadyInTeamError } from './errors/subcontractor-already-in-team.error';
import { SubcontractorTeamNotFoundError } from './errors/subcontractor-team-not-found.error';

describe('SubcontractorTeamsService', () => {
  let service: SubcontractorTeamsService;

  const mockPrismaService = {
    subcontractor: { findMany: vi.fn() },
    subcontractorTeam: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const moshe = { id: 'moshe', name: 'משה', companyNumber: '111111111' };
  const david = { id: 'david', name: 'דוד', companyNumber: '222222222' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcontractorTeamsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(SubcontractorTeamsService);
    vi.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrismaService) => Promise<unknown>) =>
        cb(mockPrismaService),
    );
  });

  describe('create', () => {
    it('creates a team from free subcontractors, members sorted by name', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([
        { ...moshe, teamId: null },
        { ...david, teamId: null },
      ]);
      mockPrismaService.subcontractorTeam.create.mockResolvedValue({
        id: 'team-1',
        members: [moshe, david],
      });

      const result = await service.create({ memberIds: ['moshe', 'david'] });

      expect(mockPrismaService.subcontractorTeam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { members: { connect: [{ id: 'moshe' }, { id: 'david' }] } },
        }),
      );
      expect(result).toEqual({ id: 'team-1', members: [david, moshe] });
    });

    it('refuses a subcontractor who does not exist', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([
        { ...moshe, teamId: null },
      ]);

      await expect(
        service.create({ memberIds: ['moshe', 'ghost'] }),
      ).rejects.toThrow(SubcontractorNotFoundError);
      expect(mockPrismaService.subcontractorTeam.create).not.toHaveBeenCalled();
    });

    it('refuses a subcontractor already in a team', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([
        { ...moshe, teamId: null },
        { ...david, teamId: 'team-other' },
      ]);

      await expect(
        service.create({ memberIds: ['moshe', 'david'] }),
      ).rejects.toThrow(SubcontractorAlreadyInTeamError);
    });
  });

  describe('update', () => {
    it('replaces the members, allowing those already in this team', async () => {
      mockPrismaService.subcontractorTeam.findUnique.mockResolvedValue({
        id: 'team-1',
      });
      mockPrismaService.subcontractor.findMany.mockResolvedValue([
        { ...moshe, teamId: 'team-1' },
        { ...david, teamId: null },
      ]);
      mockPrismaService.subcontractorTeam.update.mockResolvedValue({
        id: 'team-1',
        members: [moshe, david],
      });

      await service.update('team-1', { memberIds: ['moshe', 'david'] });

      expect(mockPrismaService.subcontractorTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team-1' },
          data: { members: { set: [{ id: 'moshe' }, { id: 'david' }] } },
        }),
      );
    });

    it('throws when the team does not exist', async () => {
      mockPrismaService.subcontractorTeam.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { memberIds: ['moshe', 'david'] }),
      ).rejects.toThrow(SubcontractorTeamNotFoundError);
    });
  });

  describe('remove', () => {
    it('throws when the team does not exist', async () => {
      mockPrismaService.subcontractorTeam.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'x',
        }),
      );

      await expect(service.remove('missing')).rejects.toThrow(
        SubcontractorTeamNotFoundError,
      );
    });
  });

  describe('findTeamsOf', () => {
    it('gives a team member the whole team and a lone subcontractor itself', async () => {
      const solo = { id: 'solo', name: 'יוסי', companyNumber: '333333333' };
      mockPrismaService.subcontractor.findMany
        .mockResolvedValueOnce([
          { ...moshe, teamId: 'team-1' },
          { ...solo, teamId: null },
        ])
        .mockResolvedValueOnce([
          { ...moshe, teamId: 'team-1' },
          { ...david, teamId: 'team-1' },
        ]);

      const result = await service.findTeamsOf(['moshe', 'solo']);

      expect(result.get('moshe')).toEqual([david, moshe]);
      expect(result.get('solo')).toEqual([solo]);
    });

    it('skips the teammate query when nobody is in a team', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValueOnce([
        { ...moshe, teamId: null },
      ]);

      await service.findTeamsOf(['moshe']);

      expect(mockPrismaService.subcontractor.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findTeamOf', () => {
    it('throws when the subcontractor does not exist', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValueOnce([]);

      await expect(service.findTeamOf('ghost')).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });
});
