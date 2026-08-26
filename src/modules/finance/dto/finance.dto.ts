import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum AccountTypeEnum {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum VoucherTypeEnum {
  JOURNAL = 'JOURNAL',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
}

export class FinanceVoucherQueryDto {
  @ApiPropertyOptional({ enum: VoucherTypeEnum, example: VoucherTypeEnum.JOURNAL })
  @IsEnum(VoucherTypeEnum)
  @IsOptional()
  type?: VoucherTypeEnum;

  @ApiPropertyOptional({ example: 'POSTED' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateVoucherDto {
  @ApiProperty({ example: 'JV-2026-001' })
  @IsString()
  @IsNotEmpty()
  voucherNo: string;

  @ApiProperty({ enum: VoucherTypeEnum, example: VoucherTypeEnum.JOURNAL })
  @IsEnum(VoucherTypeEnum)
  @IsNotEmpty()
  type: VoucherTypeEnum;

  @ApiPropertyOptional({ example: '2026-05-07' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 45000.0 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: '1010 - Cash & Bank Account' })
  @IsString()
  @IsNotEmpty()
  debitAccount: string;

  @ApiProperty({ example: '2010 - Accounts Payable' })
  @IsString()
  @IsNotEmpty()
  creditAccount: string;

  @ApiPropertyOptional({ example: 'Payment for Raw Material Purchase PB-2024-001' })
  @IsString()
  @IsOptional()
  narration?: string;
}
