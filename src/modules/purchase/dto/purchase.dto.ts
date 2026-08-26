import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum PurchaseRecordType {
  RFO = 'rfo',
  PURCHASE_BILL = 'purchase_bill',
  PURCHASED_MACHINERY = 'purchased_machinery',
}

export enum RfoPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class PurchaseRecordQueryDto {
  @ApiPropertyOptional({ enum: PurchaseRecordType, example: PurchaseRecordType.RFO })
  @IsEnum(PurchaseRecordType)
  @IsOptional()
  type?: PurchaseRecordType;

  @ApiPropertyOptional({ example: 'UNPAID' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'Haas' })
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

export class CreatePurchaseRecordDto {
  @ApiPropertyOptional({ example: 'RFO-2024-901' })
  @IsString()
  @IsOptional()
  refNo?: string;

  @ApiProperty({ enum: PurchaseRecordType, example: PurchaseRecordType.RFO })
  @IsEnum(PurchaseRecordType)
  @IsNotEmpty()
  type: PurchaseRecordType;

  @ApiProperty({ example: 'Apex Industrial Solutions' })
  @IsString()
  @IsNotEmpty()
  vendor: string;

  @ApiPropertyOptional({ example: 'VINV-99120' })
  @IsString()
  @IsOptional()
  vendorInvoiceNo?: string;

  @ApiPropertyOptional({ example: '2024-10-14' })
  @IsString()
  @IsOptional()
  requestDate?: string;

  @ApiPropertyOptional({ example: '2024-10-12' })
  @IsString()
  @IsOptional()
  billDate?: string;

  @ApiPropertyOptional({ example: '2024-11-12' })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 145000.0 })
  @IsNumber()
  @IsOptional()
  numericAmount?: number;

  @ApiPropertyOptional({ example: 'Toolroom & Precision Machining' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ enum: RfoPriority, example: RfoPriority.HIGH })
  @IsEnum(RfoPriority)
  @IsOptional()
  priority?: RfoPriority;

  @ApiPropertyOptional({ example: 'MAC-2024-881' })
  @IsString()
  @IsOptional()
  assetTag?: string;

  @ApiPropertyOptional({ example: 'CNC 5-Axis Milling Machine' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Haas VF-4SS High Speed Vertical Center' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: 3850000.0 })
  @IsNumber()
  @IsOptional()
  numericCost?: number;

  @ApiPropertyOptional({ example: 'Bay A - Main Workshop' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'PENDING APPROVAL' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdatePurchaseRecordDto {
  @ApiPropertyOptional({ example: 'RFO-2024-901' })
  @IsString()
  @IsOptional()
  refNo?: string;

  @ApiPropertyOptional({ enum: PurchaseRecordType, example: PurchaseRecordType.RFO })
  @IsEnum(PurchaseRecordType)
  @IsOptional()
  type?: PurchaseRecordType;

  @ApiPropertyOptional({ example: 'Apex Industrial Solutions' })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiPropertyOptional({ example: 'VINV-99120' })
  @IsString()
  @IsOptional()
  vendorInvoiceNo?: string;

  @ApiPropertyOptional({ example: '2024-10-14' })
  @IsString()
  @IsOptional()
  requestDate?: string;

  @ApiPropertyOptional({ example: '2024-10-12' })
  @IsString()
  @IsOptional()
  billDate?: string;

  @ApiPropertyOptional({ example: '2024-11-12' })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 145000.0 })
  @IsNumber()
  @IsOptional()
  numericAmount?: number;

  @ApiPropertyOptional({ example: 'Toolroom & Precision Machining' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ enum: RfoPriority, example: RfoPriority.HIGH })
  @IsEnum(RfoPriority)
  @IsOptional()
  priority?: RfoPriority;

  @ApiPropertyOptional({ example: 'MAC-2024-881' })
  @IsString()
  @IsOptional()
  assetTag?: string;

  @ApiPropertyOptional({ example: 'CNC 5-Axis Milling Machine' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Haas VF-4SS High Speed Vertical Center' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: 3850000.0 })
  @IsNumber()
  @IsOptional()
  numericCost?: number;

  @ApiPropertyOptional({ example: 'Bay A - Main Workshop' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'PENDING APPROVAL' })
  @IsString()
  @IsOptional()
  status?: string;
}
