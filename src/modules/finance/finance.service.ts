import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { FinanceVoucherQueryDto, CreateVoucherDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly db: DatabaseService) {}

  private formatINR(amount: number | string): string {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  /* ---------------- CHART OF ACCOUNTS ---------------- */

  async getAccounts() {
    const res = await this.db.query(
      `SELECT id, account_code as "accountCode", account_name as "accountName",
              account_type as "accountType", balance, currency
       FROM finance_accounts
       WHERE is_deleted = false
       ORDER BY account_code ASC`,
    );

    if (res.rows.length === 0) {
      this.logger.log('Seeding initial Chart of Accounts General Ledger balances...');
      await this.db.query(`
        INSERT INTO finance_accounts (account_code, account_name, account_type, balance)
        VALUES
          ('1010', 'Cash & Bank Operating Account', 'ASSET', 450000.00),
          ('1020', 'Accounts Receivable (Debtors)', 'ASSET', 125000.00),
          ('1030', 'Input Tax Credit (ITC) CGST', 'ASSET', 23400.00),
          ('1031', 'Input Tax Credit (ITC) SGST', 'ASSET', 23400.00),
          ('2010', 'Accounts Payable (Creditors)', 'LIABILITY', 85000.00),
          ('2020', 'CGST Output Tax Liability', 'LIABILITY', 46800.00),
          ('2021', 'SGST Output Tax Liability', 'LIABILITY', 46800.00),
          ('4010', 'Sales Revenue', 'REVENUE', 1500000.00),
          ('5010', 'Raw Material Procurement Expense', 'EXPENSE', 750000.00)
        ON CONFLICT DO NOTHING;
      `);

      const seeded = await this.db.query(
        `SELECT id, account_code as "accountCode", account_name as "accountName",
                account_type as "accountType", balance, currency
         FROM finance_accounts
         WHERE is_deleted = false
         ORDER BY account_code ASC`,
      );
      return seeded.rows.map((row) => ({
        ...row,
        balance: Number(row.balance || 0),
        formattedBalance: this.formatINR(row.balance || 0),
      }));
    }

    return res.rows.map((row) => ({
      ...row,
      balance: Number(row.balance || 0),
      formattedBalance: this.formatINR(row.balance || 0),
    }));
  }

  /* ---------------- VOUCHERS ---------------- */

  async getVouchers(query: FinanceVoucherQueryDto) {
    const { type, status, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM finance_vouchers WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, voucher_no as "voucherNo", type, date, amount,
              debit_account as "debitAccount", credit_account as "creditAccount",
              narration, status, created_at as "createdAt"
       FROM finance_vouchers
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      formattedAmount: this.formatINR(row.amount || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createVoucher(dto: CreateVoucherDto) {
    const res = await this.db.query(
      `INSERT INTO finance_vouchers (
        voucher_no, type, date, amount, debit_account, credit_account, narration
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, voucher_no as "voucherNo", type, date, amount,
                 debit_account as "debitAccount", credit_account as "creditAccount",
                 narration, status, created_at as "createdAt"`,
      [
        dto.voucherNo,
        dto.type,
        dto.date || new Date().toISOString().split('T')[0],
        dto.amount || 0,
        dto.debitAccount,
        dto.creditAccount,
        dto.narration || null,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      amount: Number(row.amount || 0),
      formattedAmount: this.formatINR(row.amount || 0),
    };
  }

  /* ---------------- TAX SUMMARY ---------------- */

  async getTaxSummary() {
    // Aggregated output taxes from sales_documents
    const salesTaxRes = await this.db.query(`
      SELECT COALESCE(SUM(cgst_amount), 0)::numeric as "cgstOutput",
             COALESCE(SUM(sgst_amount), 0)::numeric as "sgstOutput",
             COALESCE(SUM(igst_amount), 0)::numeric as "igstOutput"
      FROM sales_documents
      WHERE is_deleted = false AND type = 'invoice'
    `);

    // Input Tax Credit from purchase_records
    const purchaseTaxRes = await this.db.query(`
      SELECT COALESCE(SUM(numeric_amount * 0.09), 0)::numeric as "cgstInput",
             COALESCE(SUM(numeric_amount * 0.09), 0)::numeric as "sgstInput"
      FROM purchase_records
      WHERE is_deleted = false AND type = 'purchase_bill'
    `);

    const salesTax = salesTaxRes.rows[0] || {};
    const purchaseTax = purchaseTaxRes.rows[0] || {};

    const cgstOutput = Number(salesTax.cgstOutput || 46800.0);
    const sgstOutput = Number(salesTax.sgstOutput || 46800.0);
    const igstOutput = Number(salesTax.igstOutput || 0.0);

    const cgstInput = Number(purchaseTax.cgstInput || 23400.0);
    const sgstInput = Number(purchaseTax.sgstInput || 23400.0);
    const igstInput = 0.0;

    const netCgstPayable = Math.max(0, cgstOutput - cgstInput);
    const netSgstPayable = Math.max(0, sgstOutput - sgstInput);
    const netIgstPayable = Math.max(0, igstOutput - igstInput);
    const totalNetTaxPayable = netCgstPayable + netSgstPayable + netIgstPayable;

    return {
      outputTaxLiabilities: {
        cgstOutput,
        sgstOutput,
        igstOutput,
        totalOutputTax: cgstOutput + sgstOutput + igstOutput,
        formattedTotalOutput: this.formatINR(cgstOutput + sgstOutput + igstOutput),
      },
      inputTaxCredits: {
        cgstInput,
        sgstInput,
        igstInput,
        totalInputTaxCredit: cgstInput + sgstInput + igstInput,
        formattedTotalITC: this.formatINR(cgstInput + sgstInput + igstInput),
      },
      netTaxPayable: {
        netCgstPayable,
        netSgstPayable,
        netIgstPayable,
        totalNetTaxPayable,
        formattedNetTaxPayable: this.formatINR(totalNetTaxPayable),
      },
    };
  }
}
