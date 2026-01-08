import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';

describe('CorporationsController', () => {
  let controller: CorporationsController;

  const mockCorporationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporationsController],
      providers: [
        {
          provide: CorporationsService,
          useValue: mockCorporationsService,
        },
      ],
    }).compile();

    controller = module.get<CorporationsController>(CorporationsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a corporation', async () => {
      const createDto: CreateCorporationDto = { name: 'Test Corp' };
      const expectedResult: CorporationResponseDto = {
        id: '1',
        name: 'Test Corp',
      };

      mockCorporationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return a list of corporations', async () => {
      const expectedResult: CorporationResponseDto[] = [
        { id: '1', name: 'Corp 1' },
        { id: '2', name: 'Corp 2' },
      ];

      mockCorporationsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('update', () => {
    it('should update a corporation', async () => {
      const updateDto: UpdateCorporationDto = { name: 'Updated Corp' };
      const expectedResult: CorporationResponseDto = {
        id: '1',
        name: 'Updated Corp',
      };

      mockCorporationsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.update).toHaveBeenCalledWith(
        '1',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a corporation', async () => {
      const expectedResult: CorporationResponseDto = {
        id: '1',
        name: 'Test Corp',
      };

      mockCorporationsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove('1');

      expect(result).toEqual(expectedResult);
      expect(mockCorporationsService.remove).toHaveBeenCalledWith('1');
    });
  });
});
