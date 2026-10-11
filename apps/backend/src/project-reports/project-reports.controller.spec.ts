import { Test, TestingModule } from '@nestjs/testing';
import { ProjectReportsController } from './project-reports.controller';
import { ProjectReportsService } from './project-reports.service';
import { CreateProjectReportDto } from './dto/create-project-report.dto';
import { UpdateProjectReportDto } from './dto/update-project-report.dto';
import { CreateIncomeEntryDto } from './dto/create-income-entry.dto';
import { UpdateIncomeEntryDto } from './dto/update-income-entry.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

describe('ProjectReportsController', () => {
  let controller: ProjectReportsController;

  const mockProjectReportsService = {
    create: vi.fn(),
    findProjectReportsInMonth: vi.fn(),
    findOne: vi.fn(),
    findProjectReportForPreviousMonth: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addIncomeEntry: vi.fn(),
    updateIncomeEntry: vi.fn(),
    removeIncomeEntry: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectReportsController],
      providers: [
        { provide: ProjectReportsService, useValue: mockProjectReportsService },
      ],
    }).compile();

    controller = module.get<ProjectReportsController>(ProjectReportsController);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service', async () => {
      const dto: CreateProjectReportDto = {
        projectId: 'project-1',
        subcontractorId: 'sub-1',
        date: '2024-05-01',
        incomeEntries: [{ amount: 1000 }],
        profitMargin: 20,
        supplierPayments: [],
      };
      const expected = { id: 'report-1' };
      mockProjectReportsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(result).toEqual(expected);
      expect(mockProjectReportsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findProjectReportsInMonth', () => {
    it('delegates to the service', async () => {
      const query: PaginatedMonthQueryDto = { month: '2024-05-01' };
      const expected = [{ id: 'report-1' }];
      mockProjectReportsService.findProjectReportsInMonth.mockResolvedValue(
        expected,
      );

      const result = await controller.findProjectReportsInMonth(query);

      expect(result).toEqual(expected);
      expect(
        mockProjectReportsService.findProjectReportsInMonth,
      ).toHaveBeenCalledWith(query);
    });
  });

  describe('addIncomeEntry', () => {
    it('delegates to the service with the report id and dto', async () => {
      const dto: CreateIncomeEntryDto = { amount: 5000, tag: 'שלד' };
      const expected = {
        id: 'entry-1',
        amount: 5000,
        incomeDate: null,
        tag: 'שלד',
      };
      mockProjectReportsService.addIncomeEntry.mockResolvedValue(expected);

      const result = await controller.addIncomeEntry('report-1', dto);

      expect(result).toEqual(expected);
      expect(mockProjectReportsService.addIncomeEntry).toHaveBeenCalledWith(
        'report-1',
        dto,
      );
    });
  });

  describe('updateIncomeEntry', () => {
    it('delegates to the service with the entry id and dto, and does not touch report update', async () => {
      const dto: UpdateIncomeEntryDto = { tag: 'גמר' };
      const expected = {
        id: 'entry-1',
        amount: 12000,
        incomeDate: null,
        tag: 'גמר',
      };
      mockProjectReportsService.updateIncomeEntry.mockResolvedValue(expected);

      const result = await controller.updateIncomeEntry('entry-1', dto);

      expect(result).toEqual(expected);
      expect(mockProjectReportsService.updateIncomeEntry).toHaveBeenCalledWith(
        'entry-1',
        dto,
      );
      // 🔴 The route this task exists to protect: patching a tag must never
      // fall through to the full report update path.
      expect(mockProjectReportsService.update).not.toHaveBeenCalled();
    });

    it('propagates errors from the service', async () => {
      mockProjectReportsService.updateIncomeEntry.mockRejectedValue(
        new Error('not found'),
      );

      await expect(
        controller.updateIncomeEntry('missing', { tag: 'x' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('removeIncomeEntry', () => {
    it('delegates to the service with the entry id', async () => {
      mockProjectReportsService.removeIncomeEntry.mockResolvedValue(undefined);

      await expect(
        controller.removeIncomeEntry('entry-1'),
      ).resolves.toBeUndefined();
      expect(mockProjectReportsService.removeIncomeEntry).toHaveBeenCalledWith(
        'entry-1',
      );
    });
  });

  describe('findOne', () => {
    it('delegates to the service', async () => {
      const expected = { id: 'report-1' };
      mockProjectReportsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('report-1');

      expect(result).toEqual(expected);
      expect(mockProjectReportsService.findOne).toHaveBeenCalledWith(
        'report-1',
      );
    });
  });

  describe('findProjectReportForPreviousMonth', () => {
    it('delegates to the service', async () => {
      const query: MonthQueryDto = { month: '2024-05-01' };
      const expected = { id: 'report-1' };
      mockProjectReportsService.findProjectReportForPreviousMonth.mockResolvedValue(
        expected,
      );

      const result = await controller.findProjectReportForPreviousMonth(
        'project-1',
        query,
      );

      expect(result).toEqual(expected);
      expect(
        mockProjectReportsService.findProjectReportForPreviousMonth,
      ).toHaveBeenCalledWith('project-1', query);
    });
  });

  describe('update', () => {
    it('delegates to the service', async () => {
      const dto: UpdateProjectReportDto = {
        projectId: 'project-1',
        date: '2024-05-01',
        incomeEntries: [],
        supplierPayments: [],
        profitMargin: 25,
      };
      const expected = { id: 'report-1' };
      mockProjectReportsService.update.mockResolvedValue(expected);

      const result = await controller.update('report-1', dto);

      expect(result).toEqual(expected);
      expect(mockProjectReportsService.update).toHaveBeenCalledWith(
        'report-1',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('delegates to the service', async () => {
      mockProjectReportsService.remove.mockResolvedValue(undefined);

      await expect(controller.remove('report-1')).resolves.toBeUndefined();
      expect(mockProjectReportsService.remove).toHaveBeenCalledWith('report-1');
    });
  });
});
