import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import {
  PurchaseRecordQueryDto,
  CreatePurchaseRecordDto,
  UpdatePurchaseRecordDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(private readonly db: DatabaseService) {}

  private formatINR(amount: number | string): string {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  /* ---------------- GET PURCHASE RECORDS ---------------- */

  async getPurchaseRecords(query: PurchaseRecordQueryDto) {
    const { type, status, search, page = 1, limit = 20 } = query;
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

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(vendor ILIKE $${params.length} OR ref_no ILIKE $${params.length} OR vendor_invoice_no ILIKE $${params.length} OR name ILIKE $${params.length} OR asset_tag ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM purchase_records WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, vendor,
              vendor_invoice_no as "vendorInvoiceNo",
              request_date as "requestDate", bill_date as "billDate",
              due_date as "dueDate", purchase_date as "purchaseDate",
              numeric_amount as "numericAmount", department, priority,
              asset_tag as "assetTag", name, model,
              numeric_cost as "numericCost", location, status,
              created_at as "createdAt"
       FROM purchase_records
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => ({
      ...row,
      numericAmount: Number(row.numericAmount || 0),
      numericCost: Number(row.numericCost || 0),
      formattedAmount: this.formatINR(row.numericAmount || 0),
      formattedCost: this.formatINR(row.numericCost || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  /* ---------------- GET PURCHASE RECORD BY ID ---------------- */

  async getPurchaseRecordById(id: string) {
    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, vendor,
              vendor_invoice_no as "vendorInvoiceNo",
              request_date as "requestDate", bill_date as "billDate",
              due_date as "dueDate", purchase_date as "purchaseDate",
              numeric_amount as "numericAmount", department, priority,
              asset_tag as "assetTag", name, model,
              numeric_cost as "numericCost", location, status,
              created_at as "createdAt"
       FROM purchase_records
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Purchase record with ID ${id} not found` });
    }

    const row = res.rows[0];
    return {
      ...row,
      numericAmount: Number(row.numericAmount || 0),
      numericCost: Number(row.numericCost || 0),
      formattedAmount: this.formatINR(row.numericAmount || 0),
      formattedCost: this.formatINR(row.numericCost || 0),
    };
  }

  /* ---------------- CREATE PURCHASE RECORD ---------------- */

  async createPurchaseRecord(dto: CreatePurchaseRecordDto) {
    const res = await this.db.query(
      `INSERT INTO purchase_records (
        ref_no, type, vendor, vendor_invoice_no, request_date, bill_date,
        due_date, purchase_date, numeric_amount, department, priority,
        asset_tag, name, model, numeric_cost, location, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, ref_no as "refNo", type, vendor,
                 vendor_invoice_no as "vendorInvoiceNo",
                 request_date as "requestDate", bill_date as "billDate",
                 due_date as "dueDate", purchase_date as "purchaseDate",
                 numeric_amount as "numericAmount", department, priority,
                 asset_tag as "assetTag", name, model,
                 numeric_cost as "numericCost", location, status,
                 created_at as "createdAt"`,
      [
        dto.refNo || null,
        dto.type,
        dto.vendor,
        dto.vendorInvoiceNo || null,
        dto.requestDate || null,
        dto.billDate || null,
        dto.dueDate || null,
        dto.purchaseDate || null,
        dto.numericAmount || 0,
        dto.department || null,
        dto.priority || 'NORMAL',
        dto.assetTag || null,
        dto.name || null,
        dto.model || null,
        dto.numericCost || 0,
        dto.location || null,
        dto.status || 'PENDING',
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericAmount: Number(row.numericAmount || 0),
      numericCost: Number(row.numericCost || 0),
      formattedAmount: this.formatINR(row.numericAmount || 0),
      formattedCost: this.formatINR(row.numericCost || 0),
    };
  }

  /* ---------------- UPDATE PURCHASE RECORD ---------------- */

  async updatePurchaseRecord(id: string, dto: UpdatePurchaseRecordDto) {
    const existing = await this.getPurchaseRecordById(id);

    const refNo = dto.refNo ?? existing.refNo;
    const type = dto.type ?? existing.type;
    const vendor = dto.vendor ?? existing.vendor;
    const vendorInvoiceNo = dto.vendorInvoiceNo ?? existing.vendorInvoiceNo;
    const requestDate = dto.requestDate ?? existing.requestDate;
    const billDate = dto.billDate ?? existing.billDate;
    const dueDate = dto.dueDate ?? existing.dueDate;
    const purchaseDate = dto.purchaseDate ?? existing.purchaseDate;
    const numericAmount = dto.numericAmount ?? existing.numericAmount;
    const department = dto.department ?? existing.department;
    const priority = dto.priority ?? existing.priority;
    const assetTag = dto.assetTag ?? existing.assetTag;
    const name = dto.name ?? existing.name;
    const model = dto.model ?? existing.model;
    const numericCost = dto.numericCost ?? existing.numericCost;
    const location = dto.location ?? existing.location;
    const status = dto.status ?? existing.status;

    const res = await this.db.query(
      `UPDATE purchase_records
       SET ref_no = $1, type = $2, vendor = $3, vendor_invoice_no = $4,
           request_date = $5, bill_date = $6, due_date = $7, purchase_date = $8,
           numeric_amount = $9, department = $10, priority = $11, asset_tag = $12,
           name = $13, model = $14, numeric_cost = $15, location = $16, status = $17,
           updated_at = NOW()
       WHERE id = $18 AND is_deleted = false
       RETURNING id, ref_no as "refNo", type, vendor,
                 vendor_invoice_no as "vendorInvoiceNo",
                 request_date as "requestDate", bill_date as "billDate",
                 due_date as "dueDate", purchase_date as "purchaseDate",
                 numeric_amount as "numericAmount", department, priority,
                 asset_tag as "assetTag", name, model,
                 numeric_cost as "numericCost", location, status,
                 created_at as "createdAt"`,
      [
        refNo, type, vendor, vendorInvoiceNo, requestDate, billDate,
        dueDate, purchaseDate, numericAmount, department, priority,
        assetTag, name, model, numericCost, location, status, id,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericAmount: Number(row.numericAmount || 0),
      numericCost: Number(row.numericCost || 0),
      formattedAmount: this.formatINR(row.numericAmount || 0),
      formattedCost: this.formatINR(row.numericCost || 0),
    };
  }

  /* ---------------- DELETE PURCHASE RECORD (SOFT DELETE) ---------------- */

  async deletePurchaseRecord(id: string) {
    const res = await this.db.query(
      `UPDATE purchase_records SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Purchase record with ID ${id} not found` });
    }

    return { message: `Purchase record ${id} soft-deleted successfully` };
  }
}
