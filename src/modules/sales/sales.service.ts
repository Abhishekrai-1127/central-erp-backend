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
              gstin, place_of_supply as "placeOfSupply", billing_address as "billingAddress", shipping_address as "shippingAddress", items,
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
              gstin, place_of_supply as "placeOfSupply", billing_address as "billingAddress", shipping_address as "shippingAddress", items,
              subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
              sgst_amount as "sgstAmount", igst_amount as "igstAmount",
              grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"
       FROM sales_documents
       WHERE (id = $1 OR ref_no = $1) AND is_deleted = false`,
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

    const sanitizedItems = Array.isArray(dto.items)
      ? dto.items.map((it: any) => ({
          ...it,
          hsnSac: it.hsnSac?.trim() || "84145930",
        }))
      : [];
    const itemsJson = JSON.stringify(sanitizedItems);

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
    const billingAddress = dto.billingAddress || null;
    const shippingAddress = dto.shippingAddress || dto.billingAddress || null;

    const res = await this.db.query(
      `INSERT INTO sales_documents (
        ref_no, type, sales_order_no, po_number, date, status,
        customer, customer_id, gstin, place_of_supply, billing_address, shipping_address, items,
        subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
        valid_until, notes, currency,
        transporter, transporter_name, vehicle_no, date_of_supply, eway_bill_no, eway_bill_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", billing_address as "billingAddress", shipping_address as "shippingAddress", items,
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
        billingAddress,
        shippingAddress,
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
    let existing: any;
    try {
      existing = await this.getDocumentById(id);
    } catch (err) {
      if (err instanceof NotFoundException) {
        // Document not found in DB - Auto-provision / upsert
        const createPayload: any = {
          ...dto,
          refNo: dto.refNo || id,
          type: dto.type || (id.startsWith("INV-") ? SalesDocType.INVOICE : id.startsWith("PAY-") ? SalesDocType.PAYMENT : id.startsWith("SO-") ? SalesDocType.SALES_ORDER : SalesDocType.INVOICE),
          customer: dto.customer || "General Customer",
        };
        return this.createDocument(createPayload);
      }
      throw err;
    }

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
    const sanitizedUpdateItems = dto.items && Array.isArray(dto.items)
      ? dto.items.map((it: any) => ({
          ...it,
          hsnSac: it.hsnSac?.trim() || "84145930",
        }))
      : null;
    const itemsJson = sanitizedUpdateItems ? JSON.stringify(sanitizedUpdateItems) : JSON.stringify(existing.items);
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
    const billingAddress = dto.billingAddress ?? existing.billingAddress ?? null;
    const shippingAddress = dto.shippingAddress ?? dto.billingAddress ?? existing.shippingAddress ?? null;

    const res = await this.db.query(
      `UPDATE sales_documents
       SET ref_no = $1, type = $2, sales_order_no = $3, po_number = $4, date = $5,
           status = $6, customer = $7, customer_id = $8, gstin = $9, place_of_supply = $10,
           billing_address = $11, shipping_address = $12,
           items = $13, subtotal = $14, tax_total = $15, cgst_amount = $16,
           sgst_amount = $17, igst_amount = $18, grand_total = $19,
           transporter = $20, transporter_name = $21, vehicle_no = $22,
           date_of_supply = $23, eway_bill_no = $24, eway_bill_date = $25, updated_at = NOW()
       WHERE id = $26 AND is_deleted = false
       RETURNING id, ref_no as "refNo", type, sales_order_no as "salesOrderNo",
                 po_number as "poNumber", date, status, customer, customer_id as "customerId",
                 gstin, place_of_supply as "placeOfSupply", billing_address as "billingAddress", shipping_address as "shippingAddress", items,
                 subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
                 sgst_amount as "sgstAmount", igst_amount as "igstAmount",
                 grand_total as "grandTotal", valid_until as "validUntil", notes, currency, transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo", date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate", created_at as "createdAt"`,
      [
        refNo, type, salesOrderNo, poNumber, date, status,
        customer, customerId, gstin, placeOfSupply, billingAddress, shippingAddress, itemsJson,
        subtotal, taxTotal, cgstAmount, sgstAmount, igstAmount, grandTotal,
        transporterJson, transporterName, vehicleNo, dateOfSupply, ewayBillNo, ewayBillDate, existing.id,
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

  /* ---------------- ARCHIVE AND DELETE SALES DOCUMENT ---------------- */

  async deleteDocument(id: string, deletedBy = "Admin", reason = "") {
    const docRes = await this.db.query(
      `SELECT * FROM sales_documents WHERE (id = $1 OR ref_no = $1) LIMIT 1`,
      [id],
    );

    if (docRes.rows.length === 0) {
      throw new NotFoundException({ message: `Sales document with ID ${id} not found` });
    }

    const doc = docRes.rows[0];
    const client = await this.db.getClient();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO deleted_sales_documents (
          original_id, original_ref_no, type, sales_order_no, po_number, date, status,
          customer, customer_id, gstin, place_of_supply, billing_address, shipping_address,
          items, subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
          valid_until, notes, currency, transporter, transporter_name, vehicle_no,
          date_of_supply, eway_bill_no, eway_bill_date, deleted_at, deleted_by, delete_reason, document_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28, $29, NOW(), $30, $31, $32
        )`,
        [
          doc.id,
          doc.ref_no,
          doc.type,
          doc.sales_order_no,
          doc.po_number,
          doc.date,
          "DELETED",
          doc.customer,
          doc.customer_id,
          doc.gstin,
          doc.place_of_supply,
          doc.billing_address,
          doc.shipping_address,
          typeof doc.items === "string" ? doc.items : JSON.stringify(doc.items || []),
          doc.subtotal,
          doc.tax_total,
          doc.cgst_amount,
          doc.sgst_amount,
          doc.igst_amount,
          doc.grand_total,
          doc.valid_until,
          doc.notes,
          doc.currency,
          typeof doc.transporter === "string" ? doc.transporter : JSON.stringify(doc.transporter || {}),
          doc.transporter_name,
          doc.vehicle_no,
          doc.date_of_supply,
          doc.eway_bill_no,
          doc.eway_bill_date,
          deletedBy,
          reason,
          JSON.stringify(doc),
        ],
      );

      // Hard-delete from active table to instantly release the ID and ref_no
      await client.query(`DELETE FROM sales_documents WHERE id = $1`, [doc.id]);
      await client.query("COMMIT");

      this.logger.log(`Document ${doc.ref_no} (${doc.id}) moved to deleted_sales_documents archive.`);
      return {
        success: true,
        message: `Sales document ${doc.ref_no} moved to deleted archive. Reference number is now free.`,
        originalRefNo: doc.ref_no,
        originalId: doc.id,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      this.logger.error(`Failed to archive and delete document ${id}: ${err.message}`, err.stack);
      throw err;
    } finally {
      client.release();
    }
  }

  /* ---------------- GET DELETED / ARCHIVED DOCUMENTS ---------------- */

  async getDeletedDocuments(query: { type?: string; search?: string; page?: number; limit?: number }) {
    const { type, search, page = 1, limit = 50 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (type && type !== "all") {
      params.push(type.toLowerCase());
      conditions.push(`LOWER(type) = ${params.length}`);
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s);
      const pIdx = params.length;
      conditions.push(
        `(LOWER(original_ref_no) LIKE ${pIdx} OR LOWER(customer) LIKE ${pIdx} OR LOWER(COALESCE(gstin, '')) LIKE ${pIdx} OR LOWER(COALESCE(sales_order_no, '')) LIKE ${pIdx} OR LOWER(COALESCE(po_number, '')) LIKE ${pIdx})`
      );
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM deleted_sales_documents WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await this.db.query(
      `SELECT archive_id as "archiveId",
              original_id as "originalId",
              original_ref_no as "originalRefNo",
              type, sales_order_no as "salesOrderNo",
              po_number as "poNumber", date, status, customer, customer_id as "customerId",
              gstin, place_of_supply as "placeOfSupply", billing_address as "billingAddress", shipping_address as "shippingAddress",
              items, subtotal, tax_total as "taxTotal", cgst_amount as "cgstAmount",
              sgst_amount as "sgstAmount", igst_amount as "igstAmount",
              grand_total as "grandTotal", valid_until as "validUntil", notes, currency,
              transporter, transporter_name as "transporterName", vehicle_no as "vehicleNo",
              date_of_supply as "dateOfSupply", eway_bill_no as "eWayBillNo", eway_bill_date as "eWayBillDate",
              deleted_at as "deletedAt", deleted_by as "deletedBy", delete_reason as "deleteReason"
       FROM deleted_sales_documents
       WHERE ${whereClause}
       ORDER BY deleted_at DESC
       LIMIT ${params.length + 1} OFFSET ${params.length + 2}`,
      [...params, limitNum, offset],
    );

    return {
      success: true,
      data: dataRes.rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /* ---------------- RESTORE DELETED SALES DOCUMENT ---------------- */

  async restoreDeletedDocument(archiveIdOrRefNo: string) {
    const res = await this.db.query(
      `SELECT * FROM deleted_sales_documents
       WHERE archive_id = $1 OR original_id = $1 OR original_ref_no = $1
       LIMIT 1`,
      [archiveIdOrRefNo],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Archived document ${archiveIdOrRefNo} not found` });
    }

    const archived = res.rows[0];

    // Check if the original_ref_no is already taken by an active document
    const dupCheck = await this.db.query(
      `SELECT id, ref_no FROM sales_documents WHERE ref_no = $1 LIMIT 1`,
      [archived.original_ref_no],
    );

    if (dupCheck.rows.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: "REF_NO_OCCUPIED",
        message: `Cannot restore: Reference number ${archived.original_ref_no} is currently occupied by an active document. Please create a new document or modify reference number before restoring.`,
      });
    }

    const client = await this.db.getClient();
    try {
      await client.query("BEGIN");

      // Re-insert into active sales_documents
      const statusToRestore = archived.type === "quotation" ? "PENDING" : "DRAFT";

      await client.query(
        `INSERT INTO sales_documents (
          id, ref_no, type, sales_order_no, po_number, date, status,
          customer, customer_id, gstin, place_of_supply, billing_address, shipping_address,
          items, subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
          valid_until, notes, currency, transporter, transporter_name, vehicle_no,
          date_of_supply, eway_bill_no, eway_bill_date, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28, $29, FALSE, NOW(), NOW()
        )`,
        [
          archived.original_id,
          archived.original_ref_no,
          archived.type,
          archived.sales_order_no,
          archived.po_number,
          archived.date,
          statusToRestore,
          archived.customer,
          archived.customer_id,
          archived.gstin,
          archived.place_of_supply,
          archived.billing_address,
          archived.shipping_address,
          typeof archived.items === "string" ? archived.items : JSON.stringify(archived.items || []),
          archived.subtotal,
          archived.tax_total,
          archived.cgst_amount,
          archived.sgst_amount,
          archived.igst_amount,
          archived.grand_total,
          archived.valid_until,
          archived.notes,
          archived.currency,
          typeof archived.transporter === "string" ? archived.transporter : JSON.stringify(archived.transporter || {}),
          archived.transporter_name,
          archived.vehicle_no,
          archived.date_of_supply,
          archived.eway_bill_no,
          archived.eway_bill_date,
        ],
      );

      // Remove from deleted_sales_documents
      await client.query(`DELETE FROM deleted_sales_documents WHERE archive_id = $1`, [archived.archive_id]);

      await client.query("COMMIT");

      this.logger.log(`Restored document ${archived.original_ref_no} from archive to sales_documents.`);
      return {
        success: true,
        message: `Document ${archived.original_ref_no} restored successfully.`,
        document: {
          id: archived.original_id,
          refNo: archived.original_ref_no,
          type: archived.type,
          status: statusToRestore,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      this.logger.error(`Failed to restore document ${archiveIdOrRefNo}: ${err.message}`, err.stack);
      throw err;
    } finally {
      client.release();
    }
  }

  /* ---------------- PERMANENTLY PURGE ARCHIVED DOCUMENT ---------------- */

  async permanentlyDeleteDocument(archiveIdOrRefNo: string) {
    const res = await this.db.query(
      `DELETE FROM deleted_sales_documents
       WHERE archive_id = $1 OR original_id = $1 OR original_ref_no = $1
       RETURNING archive_id, original_ref_no`,
      [archiveIdOrRefNo],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Archived document ${archiveIdOrRefNo} not found` });
    }

    return {
      success: true,
      message: `Document ${res.rows[0].original_ref_no} permanently purged from archive.`,
    };
  }
}
