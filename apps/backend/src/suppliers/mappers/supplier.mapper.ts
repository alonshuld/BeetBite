import { Supplier } from 'src/generated/client';
import { SupplierResponseDto } from '../dto/supplier-response.dto';

/**
 * Converts the given supplier entity to a supplier response DTO.
 * @param supplier The supplier entity to convert
 * @returns The supplier response DTO.
 */
export const toSupplierResponse = (
  supplier: Supplier,
): SupplierResponseDto => ({
  ...supplier,
});

/**
 * Converts the given array of supplier entities to an array of supplier response DTOs.
 * @param suppliers The array of supplier entities to convert.
 * @returns An array of supplier response DTOs.
 */
export const toSupplierResponseList = (
  suppliers: Supplier[],
): SupplierResponseDto[] => suppliers.map(toSupplierResponse);
