import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import {
  SalesDocQueryDto,
  CreateSalesDocDto,
  UpdateSalesDocDto,
  SalesDocType,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly db: DatabaseService) {}

  /* ---------------- CHECK INVOICE EXISTS ---------------- */

  async checkInvoiceExists(salesOrderNo: string) {
    if (!salesOrderNo) {
      return { exists: false, salesOrderNo: null, invoice: null };
    }

    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
              status, customer, grand_total as "grandTotal", created_at as "createdAt"
       FROM sales_documents
       WHERE sales_order_no = $1 AND type = 'invoice' AND is_deleted = false
       LIMIT 1`,
      [salesOrderNo],
    );

    const exists = res.rows.length > 0;
    return {
      exists,
      salesOrderNo,
      invoice: exists ? res.rows[0] : null,
    };
  }

  /* ---------------- GET SALES DOCUMENTS ---------------- */

  async getDocuments(query: SalesDocQueryDto) {
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
        `(ref_no ILIKE $${params.length} OR sales_order_no ILIKE $${params.length} OR customer ILIKE $${params.length} OR po_number ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM sales_documents WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
              po_number as "poNumber", date, status, customer, customer_id as "customerId",
              gstin, place_of_supply as "placeOfSupply", items,
              subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
              sgst_amount as "sgstAmount", igst_amount as "igstAmount",
              grand_total as "grandTotal", created_at as "createdAt"
       FROM sales_documents
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => ({
      ...row,
      subtotal: Number(row.subtotal || 0),
      taxTotal: Number(row.taxTotal || 0),
      cgstAmount: Number(row.cgstAmount || 0),
      sgstAmount: Number(row.sgstAmount || 0),
      igstAmount: Number(row.igstAmount || 0),
      grandTotal: Number(row.grandTotal || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  /* ---------------- GET SINGLE DOCUMENT BY ID ---------------- */

  async getDocumentById(id: string) {
    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
              po_number as "poNumber", date, status, customer, customer_id as "customerId",
              gstin, place_of_supply as "placeOfSupply", items,
              subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
              sgst_amount as "sgstAmount", igst_amount as "igstAmount",
              grand_total as "grandTotal", created_at as "createdAt"
       FROM sales_documents
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Sales document with ID ${id} not found` });
    }

    const row = res.rows[0];
    return {
      ...row,
      subtotal: Number(row.subtotal || 0),
      taxTotal: Number(row.taxTotal || 0),
      cgstAmount: Number(row.cgstAmount || 0),
      sgstAmount: Number(row.sgstAmount || 0),
      igstAmount: Number(row.igstAmount || 0),
      grandTotal: Number(row.grandTotal || 0),
    };
  }

  /* ---------------- CREATE SALES DOCUMENT ---------------- */

  async createDocument(dto: CreateSalesDocDto) {
    // MANDATORY BUSINESS RULE: Single-Invoice Enforcement per Sales Order
    if (dto.type === SalesDocType.INVOICE && dto.salesOrderNo) {
      const check = await this.checkInvoiceExists(dto.salesOrderNo);
      if (check.exists) {
        this.logger.warn(
          `[createDocument] Single-Invoice Rule Violated: Invoice already exists for salesOrderNo=${dto.salesOrderNo}`,
        );
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'UNPROCESSABLE_ENTITY',
          message: 'An invoice has already been generated for this Sales Order.',
        });
      }
    }

    const itemsJson = JSON.stringify(dto.items || []);

    const res = await this.db.query(
      `INSERT INTO sales_documents (
        ref_no, type, sales_order_no, po_number, date, status,
        customer, customer_id, gstin, place_of_supply, items,
        subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", items,
                 subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
                 sgst_amount as "sgstAmount", igst_amount as "igstAmount",
                 grand_total as "grandTotal", created_at as "createdAt"`,
      [
        dto.refNo,
        dto.type,
        dto.salesOrderNo || null,
        dto.poNumber || null,
        dto.date || new Date().toISOString().split('T')[0],
        dto.status || 'DRAFT',
        dto.customer,
        dto.customerId || null,
        dto.gstin || null,
        dto.placeOfSupply || null,
        itemsJson,
        dto.subtotal || 0,
        dto.taxTotal || 0,
        dto.cgstAmount || 0,
        dto.sgstAmount || 0,
        dto.igstAmount || 0,
        dto.grandTotal || 0,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      subtotal: Number(row.subtotal || 0),
      taxTotal: Number(row.taxTotal || 0),
      cgstAmount: Number(row.cgstAmount || 0),
      sgstAmount: Number(row.sgstAmount || 0),
      igstAmount: Number(row.igstAmount || 0),
      grandTotal: Number(row.grandTotal || 0),
    };
  }

  /* ---------------- UPDATE SALES DOCUMENT ---------------- */

  async updateDocument(id: string, dto: UpdateSalesDocDto) {
    const existing = await this.getDocumentById(id);

    // If updating to type invoice or updating salesOrderNo on an invoice
    const targetType = dto.type ?? existing.type;
    const targetSO = dto.salesOrderNo ?? existing.salesOrderNo;

    if (
      targetType === SalesDocType.INVOICE &&
      targetSO &&
      (existing.type !== SalesDocType.INVOICE || existing.salesOrderNo !== targetSO)
    ) {
      const check = await this.checkInvoiceExists(targetSO);
      if (check.exists && check.invoice?.id !== id) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'UNPROCESSABLE_ENTITY',
          message: 'An invoice has already been generated for this Sales Order.',
        });
      }
    }

    const refNo = dto.refNo ?? existing.refNo;
    const type = targetType;
    const salesOrderNo = targetSO;
    const poNumber = dto.poNumber ?? existing.poNumber;
    const date = dto.date ?? existing.date;
    const status = dto.status ?? existing.status;
    const customer = dto.customer ?? existing.customer;
    const customerId = dto.customerId ?? existing.customerId;
    const gstin = dto.gstin ?? existing.gstin;
    const placeOfSupply = dto.placeOfSupply ?? existing.placeOfSupply;
    const itemsJson = dto.items ? JSON.stringify(dto.items) : JSON.stringify(existing.items);
    const subtotal = dto.subtotal ?? existing.subtotal;
    const taxTotal = dto.taxTotal ?? existing.taxTotal;
    const cgstAmount = dto.cgstAmount ?? existing.cgstAmount;
    const sgstAmount = dto.sgstAmount ?? existing.sgstAmount;
    const igstAmount = dto.igstAmount ?? existing.igstAmount;
    const grandTotal = dto.grandTotal ?? existing.grandTotal;

    const res = await this.db.query(
      `UPDATE sales_documents
       SET ref_no = $1, type = $2, sales_order_no = $3, po_number = $4, date = $5,
           status = $6, customer = $7, customer_id = $8, gstin = $9, place_of_supply = $10,
           items = $11, subtotal = $12, tax_total = $13, cgst_amount = $14,
           sgst_amount = $15, igst_amount = $16, grand_total = $17, updated_at = NOW()
       WHERE id = $18 AND is_deleted = false
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", items,
                 subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
                 sgst_amount as "sgstAmount", igst_amount as "igstAmount",
                 grand_total as "grandTotal", created_at as "createdAt"`,
      [
        refNo, type, salesOrderNo, poNumber, date, status,
        customer, customerId, gstin, placeOfSupply, itemsJson,
        subtotal, taxTotal, cgstAmount, sgstAmount, igstAmount, grandTotal, id,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      subtotal: Number(row.subtotal || 0),
      taxTotal: Number(row.taxTotal || 0),
      cgstAmount: Number(row.cgstAmount || 0),
      sgstAmount: Number(row.sgstAmount || 0),
      igstAmount: Number(row.igstAmount || 0),
      grandTotal: Number(row.grandTotal || 0),
    };
  }

  /* ---------------- DELETE SALES DOCUMENT (SOFT DELETE) ---------------- */

  async deleteDocument(id: string) {
    const res = await this.db.query(
      `UPDATE sales_documents SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Sales document with ID ${id} not found` });
    }

    return { message: `Sales document ${id} soft-deleted successfully` };
  }
}
