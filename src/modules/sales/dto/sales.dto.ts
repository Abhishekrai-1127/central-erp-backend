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

export enum SalesDocType {
  QUOTATION = 'quotation',
  SALES_ORDER = 'sales_order',
  INVOICE = 'invoice',
  DELIVERY_CHALLAN = 'delivery_challan',
  PAYMENT = 'payment',
}

export enum SalesDocStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class LineItemDto {
  @ApiProperty({ example: '40 H.P. High Pressure Blower 2880 RPM 3700 CFM' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: '84145930' })
  @IsString()
  @IsOptional()
  hsnSac?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  qty: number;

  @ApiPropertyOptional({ example: 'Nos' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 260000.0 })
  @IsNumber()
  @IsNotEmpty()
  listPrice: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsNumber()
  @IsOptional()
  discRupees?: number;

  @ApiPropertyOptional({ example: 18.0 })
  @IsNumber()
  @IsOptional()
  taxPercent?: number;
}

export class SalesDocQueryDto {
  @ApiPropertyOptional({ enum: SalesDocType, example: SalesDocType.INVOICE })
  @IsEnum(SalesDocType)
  @IsOptional()
  type?: SalesDocType;

  @ApiPropertyOptional({ enum: SalesDocStatus, example: SalesDocStatus.UNPAID })
  @IsEnum(SalesDocStatus)
  @IsOptional()
  status?: SalesDocStatus;

  @ApiPropertyOptional({ example: 'SO-2026-1441' })
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

export class CreateSalesDocDto {
  @ApiProperty({ example: 'INV-2026-1441' })
  @IsString()
  @IsNotEmpty()
  refNo: string;

  @ApiProperty({ enum: SalesDocType, example: SalesDocType.INVOICE })
  @IsEnum(SalesDocType)
  @IsNotEmpty()
  type: SalesDocType;

  @ApiPropertyOptional({ example: 'SO-2026-1441' })
  @IsString()
  @IsOptional()
  salesOrderNo?: string;

  @ApiPropertyOptional({ example: 'PO-99420' })
  @IsString()
  @IsOptional()
  poNumber?: string;

  @ApiPropertyOptional({ example: '2026-05-07' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ enum: SalesDocStatus, example: SalesDocStatus.UNPAID })
  @IsEnum(SalesDocStatus)
  @IsOptional()
  status?: SalesDocStatus;

  @ApiProperty({ example: 'Acme Corp Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  customer: string;

  @ApiPropertyOptional({ example: 'cust-101' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: '07AAACA123411Z5' })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiPropertyOptional({ example: '07 - Delhi' })
  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items: LineItemDto[];

  @ApiPropertyOptional({ example: 260000.0 })
  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @ApiPropertyOptional({ example: 46800.0 })
  @IsNumber()
  @IsOptional()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 23400.0 })
  @IsNumber()
  @IsOptional()
  cgstAmount?: number;

  @ApiPropertyOptional({ example: 23400.0 })
  @IsNumber()
  @IsOptional()
  sgstAmount?: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsNumber()
  @IsOptional()
  igstAmount?: number;

  @ApiPropertyOptional({ example: 306800.0 })
  @IsNumber()
  @IsOptional()
  grandTotal?: number;
}

export class UpdateSalesDocDto {
  @ApiPropertyOptional({ example: 'INV-2026-1441' })
  @IsString()
  @IsOptional()
  refNo?: string;

  @ApiPropertyOptional({ enum: SalesDocType, example: SalesDocType.INVOICE })
  @IsEnum(SalesDocType)
  @IsOptional()
  type?: SalesDocType;

  @ApiPropertyOptional({ example: 'SO-2026-1441' })
  @IsString()
  @IsOptional()
  salesOrderNo?: string;

  @ApiPropertyOptional({ example: 'PO-99420' })
  @IsString()
  @IsOptional()
  poNumber?: string;

  @ApiPropertyOptional({ example: '2026-05-07' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ enum: SalesDocStatus, example: SalesDocStatus.UNPAID })
  @IsEnum(SalesDocStatus)
  @IsOptional()
  status?: SalesDocStatus;

  @ApiPropertyOptional({ example: 'Acme Corp Pvt Ltd' })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiPropertyOptional({ example: 'cust-101' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: '07AAACA123411Z5' })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiPropertyOptional({ example: '07 - Delhi' })
  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @ApiPropertyOptional({ type: [LineItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items?: LineItemDto[];

  @ApiPropertyOptional({ example: 260000.0 })
  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @ApiPropertyOptional({ example: 46800.0 })
  @IsNumber()
  @IsOptional()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 23400.0 })
  @IsNumber()
  @IsOptional()
  cgstAmount?: number;

  @ApiPropertyOptional({ example: 23400.0 })
  @IsNumber()
  @IsOptional()
  sgstAmount?: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsNumber()
  @IsOptional()
  igstAmount?: number;

  @ApiPropertyOptional({ example: 306800.0 })
  @IsNumber()
  @IsOptional()
  grandTotal?: number;
}
