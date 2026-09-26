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

  
  /* ---------------- GET NEXT REF NO ---------------- */

  async getNextRefNo(type: SalesDocType = SalesDocType.INVOICE) {
    const prefixMap: Record<string, string> = {
      quotation: "QT",
      sales_order: "SO",
      invoice: "INV",
      delivery_challan: "DC",
      payment: "PAY",
    };

    const docType = (type || "invoice").toLowerCase();
    const prefix = prefixMap[docType] || "DOC";
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const res = await this.db.query(
      `SELECT ref_no
       FROM sales_documents
       WHERE type = $1 AND ref_no LIKE $2
       ORDER BY id DESC
       LIMIT 100`,
      [docType, pattern],
    );

    let maxSeq = 0;
    for (const row of res.rows) {
      const parts = (row.ref_no || "").split("-");
      if (parts.length >= 3) {
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(4, "0");
    const nextRefNo = `${prefix}-${year}-${paddedSeq}`;

    return {
      success: true,
      refNo: nextRefNo,
      type: docType,
      prefix,
      year,
      sequence: nextSeq,
    };
  }

  /* ---------------- CHECK INVOICE EXISTS ---------------- */

  async checkInvoiceExists(salesOrderNo: string) {
    const cleanSO = salesOrderNo ? String(salesOrderNo).trim() : "";
    if (!cleanSO) {
      return { exists: false, salesOrderNo: null, invoice: null };
    }

    const res = await this.db.query(
      `SELECT id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
              status, customer, grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"
       FROM sales_documents
       WHERE sales_order_no = $1 AND type = 'invoice' AND is_deleted = false
       LIMIT 1`,
      [cleanSO],
    );

    const exists = res.rows.length > 0;
    return {
      exists,
      salesOrderNo: cleanSO,
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
              grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"
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
              grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"
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
    // Validate or Auto-Generate Sequential refNo
    let finalRefNo = dto.refNo ? dto.refNo.trim() : "";
    if (!finalRefNo) {
      const nextInfo = await this.getNextRefNo(dto.type);
      finalRefNo = nextInfo.refNo;
    }

    // Check for duplicate reference number
    const dupCheck = await this.db.query(
      `SELECT id FROM sales_documents WHERE ref_no = $1 AND is_deleted = false LIMIT 1`,
      [finalRefNo],
    );
    if (dupCheck.rows.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: "DUPLICATE_REF_NO",
        message: `A sales document with reference number ${finalRefNo} already exists.`,
      });
    }

    // MANDATORY BUSINESS RULE: Single-Invoice Enforcement per Sales Order
    const cleanSalesOrderNo = dto.salesOrderNo && typeof dto.salesOrderNo === "string" && dto.salesOrderNo.trim()
      ? dto.salesOrderNo.trim()
      : null;
    const cleanPoNumber = dto.poNumber && typeof dto.poNumber === "string" && dto.poNumber.trim()
      ? dto.poNumber.trim()
      : null;

    if (dto.type === SalesDocType.INVOICE && cleanSalesOrderNo) {
      const check = await this.checkInvoiceExists(cleanSalesOrderNo);
      if (check.exists) {
        this.logger.warn(
          `[createDocument] Single-Invoice Rule Violated: Invoice already exists for salesOrderNo=${cleanSalesOrderNo}`,
        );
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'UNPROCESSABLE_ENTITY',
          message: 'An invoice has already been generated for this Sales Order.',
        });
      }
    }

    const itemsJson = JSON.stringify(dto.items || []);

    const transporterObj = dto.transporter || {
      name: dto.transporterName || "",
      vehicleNo: dto.vehicleNo || "",
      dateOfSupply: dto.dateOfSupply || dto.date || "",
      placeOfSupply: dto.placeOfSupply || "",
      eWayBillNo: dto.eWayBillNo || "",
      eWayBillDate: dto.eWayBillDate || "",
    };
    const transporterJson = JSON.stringify(transporterObj);
    const transporterName = dto.transporterName || dto.transporter?.name || null;
    const vehicleNo = dto.vehicleNo || dto.transporter?.vehicleNo || null;
    const dateOfSupply = dto.dateOfSupply || dto.transporter?.dateOfSupply || null;
    const ewayBillNo = dto.eWayBillNo || dto.transporter?.eWayBillNo || null;
    const ewayBillDate = dto.eWayBillDate || dto.transporter?.eWayBillDate || null;

    const res = await this.db.query(
      `INSERT INTO sales_documents (
        ref_no, type, sales_order_no, po_number, date, status,
        customer, customer_id, gstin, place_of_supply, items,
        subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
        valid_until, notes, currency,
        transporter, transporter_name, vehicle_no, date_of_supply, eway_bill_no, eway_bill_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", items,
                 subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
                 sgst_amount as "sgstAmount", igst_amount as "igstAmount",
                 grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"`,
      [
        finalRefNo,
        dto.type,
        cleanSalesOrderNo,
        cleanPoNumber,
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
        dto.validUntil || null,
        dto.notes || null,
        dto.currency || 'INR (₹)',
        transporterJson,
        transporterName,
        vehicleNo,
        dateOfSupply,
        ewayBillNo,
        ewayBillDate,
      ],
    );

    // AUTOMATED STOCK TRIGGER: Auto-dispatch inventory if sales invoice is created
    if (dto.type === SalesDocType.INVOICE && Array.isArray(dto.items)) {
      for (const item of dto.items) {
        if (item.productId && item.qty) {
          try {
            await this.db.query(
              `UPDATE inventory_products SET stock = GREATEST(0, stock - $1), updated_at = NOW() WHERE id = $2`,
              [item.qty, item.productId],
            );
            await this.db.query(
              `INSERT INTO inventory_movements (product_id, product_name, sku, type, quantity, numeric_quantity, reference_no, created_by_user)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                item.productId,
                item.description || 'Invoice Product Item',
                item.sku || 'N/A',
                'STOCK OUT',
                `-${item.qty} Units`,
                item.qty,
                dto.refNo || 'SALES_INVOICE',
                'Automated System Trigger',
              ],
            );
          } catch (err: any) {
            this.logger.warn(`Failed auto stock trigger for item ${item.productId}: ${err.message}`);
          }
        }
      }
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

  /* ---------------- UPDATE SALES DOCUMENT ---------------- */

  async updateDocument(id: string, dto: UpdateSalesDocDto) {
    const existing = await this.getDocumentById(id);

    // If updating to type invoice or updating salesOrderNo on an invoice
    const targetType = dto.type ?? existing.type;
    const targetSO = dto.salesOrderNo !== undefined
      ? (dto.salesOrderNo && typeof dto.salesOrderNo === "string" && dto.salesOrderNo.trim() ? dto.salesOrderNo.trim() : null)
      : existing.salesOrderNo;
    const targetPoNumber = dto.poNumber !== undefined
      ? (dto.poNumber && typeof dto.poNumber === "string" && dto.poNumber.trim() ? dto.poNumber.trim() : null)
      : existing.poNumber;

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
    const poNumber = targetPoNumber;
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

    const transporterObj = dto.transporter || (dto.transporterName || dto.vehicleNo || dto.eWayBillNo ? {
      name: dto.transporterName || existing.transporterName || "",
      vehicleNo: dto.vehicleNo || existing.vehicleNo || "",
      dateOfSupply: dto.dateOfSupply || existing.dateOfSupply || "",
      placeOfSupply: dto.placeOfSupply || existing.placeOfSupply || "",
      eWayBillNo: dto.eWayBillNo || existing.eWayBillNo || "",
      eWayBillDate: dto.eWayBillDate || existing.eWayBillDate || "",
    } : existing.transporter || {});
    const transporterJson = JSON.stringify(transporterObj);
    const transporterName = dto.transporterName ?? dto.transporter?.name ?? existing.transporterName ?? null;
    const vehicleNo = dto.vehicleNo ?? dto.transporter?.vehicleNo ?? existing.vehicleNo ?? null;
    const dateOfSupply = dto.dateOfSupply ?? dto.transporter?.dateOfSupply ?? existing.dateOfSupply ?? null;
    const ewayBillNo = dto.eWayBillNo ?? dto.transporter?.eWayBillNo ?? existing.eWayBillNo ?? null;
    const ewayBillDate = dto.eWayBillDate ?? dto.transporter?.eWayBillDate ?? existing.eWayBillDate ?? null;

    const res = await this.db.query(
      `UPDATE sales_documents
       SET ref_no = $1, type = $2, sales_order_no = $3, po_number = $4, date = $5,
           status = $6, customer = $7, customer_id = $8, gstin = $9, place_of_supply = $10,
           items = $11, subtotal = $12, tax_total = $13, cgst_amount = $14,
           sgst_amount = $15, igst_amount = $16, grand_total = $17,
           transporter = $18, transporter_name = $19, vehicle_no = $20,
           date_of_supply = $21, eway_bill_no = $22, eway_bill_date = $23, updated_at = NOW()
       WHERE id = $24 AND is_deleted = false
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", items,
                 subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
                 sgst_amount as "sgstAmount", igst_amount as "igstAmount",
                 grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"`,
      [
        refNo, type, salesOrderNo, poNumber, date, status,
        customer, customerId, gstin, placeOfSupply, itemsJson,
        subtotal, taxTotal, cgstAmount, sgstAmount, igstAmount, grandTotal,
        transporterJson, transporterName, vehicleNo, dateOfSupply, ewayBillNo, ewayBillDate, id,
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
