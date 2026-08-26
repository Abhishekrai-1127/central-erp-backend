import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ProductUnit {
  UNITS = 'Units',
  PCS = 'Pcs',
  ROLLS = 'Rolls',
  BAGS = 'Bags',
  BOXES = 'Boxes',
  KG = 'Kg',
}

export enum ProductStatus {
  IN_STOCK = 'IN STOCK',
  LOW_STOCK = 'LOW STOCK',
  OUT_OF_STOCK = 'OUT OF STOCK',
}

export enum MovementType {
  STOCK_IN = 'STOCK IN',
  STOCK_OUT = 'STOCK OUT',
}

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'Gear' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Mechanical Parts' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'Suraj Main Factory Warehouse (Bay A)' })
  @IsString()
  @IsOptional()
  warehouse?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.IN_STOCK })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Industrial Gear Set X12' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'IG-1200-BL' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Mechanical Parts' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Suraj Main Factory Warehouse (Bay A)' })
  @IsString()
  @IsOptional()
  warehouse?: string;

  @ApiPropertyOptional({ example: 850 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  minReorder?: number;

  @ApiPropertyOptional({ example: 4250.0 })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: ProductUnit, example: ProductUnit.UNITS })
  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.IN_STOCK })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Industrial Gear Set X12' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'IG-1200-BL' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 'Mechanical Parts' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'Suraj Main Factory Warehouse (Bay A)' })
  @IsString()
  @IsOptional()
  warehouse?: string;

  @ApiPropertyOptional({ example: 850 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  minReorder?: number;

  @ApiPropertyOptional({ example: 4250.0 })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: ProductUnit, example: ProductUnit.UNITS })
  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.IN_STOCK })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}

export class ReceiveStockDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @IsNotEmpty()
  numericQuantity: number;

  @ApiPropertyOptional({ example: 'PB-2024-001' })
  @IsString()
  @IsOptional()
  referenceNo?: string;
}

export class DispatchStockDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsNotEmpty()
  numericQuantity: number;

  @ApiPropertyOptional({ example: 'INV-2026-1441' })
  @IsString()
  @IsOptional()
  referenceNo?: string;
}
