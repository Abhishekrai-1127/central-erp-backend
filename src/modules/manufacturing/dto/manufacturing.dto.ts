import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum WorkOrderStatusEnum {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class BomComponentDto {
  @ApiProperty({ example: 'Raw High Pressure Blower Shell' })
  @IsString()
  @IsNotEmpty()
  rawMaterialName: string;

  @ApiProperty({ example: 'RM-8414-RAW' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  qtyRequired: number;

  @ApiPropertyOptional({ example: 185000.0 })
  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class CreateBomDto {
  @ApiProperty({ example: 'BOM-2026-881' })
  @IsString()
  @IsNotEmpty()
  bomNo: string;

  @ApiProperty({ example: '40 H.P. High Pressure Blower 2880 RPM' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 'BLW-40HP-2880' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ type: [BomComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomComponentDto)
  components: BomComponentDto[];

  @ApiPropertyOptional({ example: 215000.0 })
  @IsNumber()
  @IsOptional()
  totalCost?: number;
}

export class WorkOrderQueryDto {
  @ApiPropertyOptional({ enum: WorkOrderStatusEnum, example: WorkOrderStatusEnum.PLANNED })
  @IsEnum(WorkOrderStatusEnum)
  @IsOptional()
  status?: WorkOrderStatusEnum;

  @ApiPropertyOptional({ example: 'Blower' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'WO-2026-551' })
  @IsString()
  @IsNotEmpty()
  workOrderNo: string;

  @ApiProperty({ example: '40 H.P. High Pressure Blower 2880 RPM' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 'BLW-40HP-2880' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsNotEmpty()
  targetQty: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsString()
  @IsOptional()
  targetDate?: string;
}
