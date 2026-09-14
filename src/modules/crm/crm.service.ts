import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import {
  CustomerQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  LeadQueryDto,
  CreateLeadDto,
  UpdateLeadDto,
  DealQueryDto,
  CreateDealDto,
  CreateActivityDto,
} from './dto/crm.dto';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private readonly db: DatabaseService) {}

  private formatINR(amount: number | string): string {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  private formatDateTime(dateVal: Date | string | null | undefined): { date: string; time: string; createdAt: string } {
    if (!dateVal) {
      const now = new Date();
      return {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        createdAt: now.toISOString(),
      };
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        createdAt: now.toISOString(),
      };
    }
    return {
      date: d.toISOString().split('T')[0],
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      createdAt: d.toISOString(),
    };
  }

  /* ---------------- CUSTOMERS & VENDORS ---------------- */

  async getCustomers(query: CustomerQueryDto) {
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
      conditions.push(`(name ILIKE $${params.length} OR company ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM crm_customers WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, type, name, company, email, phone, gst, category, status, stage, source,
              numeric_outstanding as "numericOutstanding",
              numeric_credit_limit as "numericCreditLimit",
              outstanding, credit_limit as "creditLimit",
              billing_address as "billingAddress",
              shipping_address as "shippingAddress",
              notes, created_at as "createdAt"
       FROM crm_customers
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => {
      const dt = this.formatDateTime(row.createdAt);
      return {
        ...row,
        numericOutstanding: Number(row.numericOutstanding || 0),
        numericCreditLimit: Number(row.numericCreditLimit || 0),
        outstanding: row.outstanding || this.formatINR(row.numericOutstanding || 0),
        creditLimit: row.creditLimit || this.formatINR(row.numericCreditLimit || 0),
        stage: row.stage || row.status || 'New',
        source: row.source || 'Inbound Web Inquiry',
        date: dt.date,
        time: dt.time,
        createdDate: dt.date,
        createdTime: dt.time,
        createdAt: dt.createdAt,
      };
    });

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createCustomer(dto: CreateCustomerDto) {
    const res = await this.db.query(
      `INSERT INTO crm_customers (
        type, name, company, email, phone, gst, category, status, stage, source,
        numeric_outstanding, numeric_credit_limit, outstanding, credit_limit,
        billing_address, shipping_address, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, type, name, company, email, phone, gst, category, status, stage, source,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
                 outstanding, credit_limit as "creditLimit",
                 billing_address as "billingAddress",
                 shipping_address as "shippingAddress",
                 notes, created_at as "createdAt"`,
      [
        dto.type,
        dto.name,
        dto.company,
        dto.email || null,
        dto.phone || null,
        dto.gst || null,
        dto.category || null,
        dto.status || 'Active',
        dto.stage || 'New',
        dto.source || 'Inbound Web Inquiry',
        dto.numericOutstanding || 0,
        dto.numericCreditLimit || 0,
        dto.outstanding || null,
        dto.creditLimit || null,
        dto.billingAddress || null,
        dto.shippingAddress || null,
        dto.notes || null,
        dto.createdAt ? new Date(dto.createdAt) : new Date(),
      ],
    );

    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      ...row,
      numericOutstanding: Number(row.numericOutstanding || 0),
      numericCreditLimit: Number(row.numericCreditLimit || 0),
      outstanding: row.outstanding || this.formatINR(row.numericOutstanding || 0),
      creditLimit: row.creditLimit || this.formatINR(row.numericCreditLimit || 0),
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
    };
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const existing = await this.db.query(
      `SELECT * FROM crm_customers WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (existing.rows.length === 0) {
      throw new NotFoundException({ message: `Customer/Vendor with ID ${id} not found` });
    }

    const ex = existing.rows[0];
    const type = dto.type ?? ex.type;
    const name = dto.name ?? ex.name;
    const company = dto.company ?? ex.company;
    const email = dto.email !== undefined ? (dto.email || null) : ex.email;
    const phone = dto.phone ?? ex.phone;
    const gst = dto.gst ?? ex.gst;
    const category = dto.category ?? ex.category;
    const status = dto.status ?? ex.status;
    const stage = dto.stage ?? ex.stage ?? 'New';
    const source = dto.source ?? ex.source ?? 'Inbound Web Inquiry';
    const numericOutstanding = dto.numericOutstanding ?? ex.numeric_outstanding;
    const numericCreditLimit = dto.numericCreditLimit ?? ex.numeric_credit_limit;
    const outstanding = dto.outstanding ?? ex.outstanding;
    const creditLimit = dto.creditLimit ?? ex.credit_limit;
    const billingAddress = dto.billingAddress ?? ex.billing_address;
    const shippingAddress = dto.shippingAddress ?? ex.shipping_address;
    const notes = dto.notes ?? ex.notes;

    const res = await this.db.query(
      `UPDATE crm_customers
       SET type = $1, name = $2, company = $3, email = $4, phone = $5, gst = $6,
           category = $7, status = $8, stage = $9, source = $10,
           numeric_outstanding = $11, numeric_credit_limit = $12,
           outstanding = $13, credit_limit = $14, billing_address = $15,
           shipping_address = $16, notes = $17, created_at = $18, updated_at = NOW()
       WHERE id = $19 AND is_deleted = false
       RETURNING id, type, name, company, email, phone, gst, category, status, stage, source,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
                 outstanding, credit_limit as "creditLimit",
                 billing_address as "billingAddress",
                 shipping_address as "shippingAddress",
                 notes, created_at as "createdAt"`,
      [
        type, name, company, email, phone, gst, category, status, stage, source,
        numericOutstanding, numericCreditLimit, outstanding, creditLimit,
        billingAddress, shippingAddress, notes,
        dto.createdAt ? new Date(dto.createdAt) : ex.created_at, id,
      ],
    );

    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      ...row,
      numericOutstanding: Number(row.numericOutstanding || 0),
      numericCreditLimit: Number(row.numericCreditLimit || 0),
      outstanding: row.outstanding || this.formatINR(row.numericOutstanding || 0),
      creditLimit: row.creditLimit || this.formatINR(row.numericCreditLimit || 0),
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
    };
  }

  async deleteCustomer(id: string) {
    const res = await this.db.query(
      `UPDATE crm_customers SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Customer/Vendor with ID ${id} not found` });
    }
    return { message: `Customer/Vendor party record ${id} soft-deleted successfully` };
  }

  /* ---------------- LEADS ---------------- */

  async getLeads(query: LeadQueryDto) {
    const { stage, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (stage) {
      params.push(stage);
      conditions.push(`stage = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR company ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM crm_leads WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, name, company, email, phone, source,
              numeric_value as "numericValue",
              stage, notes, created_at as "createdAt", updated_at as "updatedAt"
       FROM crm_leads
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => {
      const dt = this.formatDateTime(row.createdAt);
      return {
        id: row.id,
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        source: row.source || 'Inbound Web Inquiry',
        estimatedValue: this.formatINR(row.numericValue || 0),
        numericValue: Number(row.numericValue || 0),
        stage: row.stage,
        notes: row.notes,
        date: dt.date,
        time: dt.time,
        createdDate: dt.date,
        createdTime: dt.time,
        createdAt: dt.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async getLeadById(id: string) {
    const res = await this.db.query(
      `SELECT id, name, company, email, phone, source,
              numeric_value as "numericValue",
              stage, notes, created_at as "createdAt", updated_at as "updatedAt"
       FROM crm_leads
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Lead with ID ${id} not found` });
    }
    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      id: row.id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      source: row.source || 'Inbound Web Inquiry',
      estimatedValue: this.formatINR(row.numericValue || 0),
      numericValue: Number(row.numericValue || 0),
      stage: row.stage,
      notes: row.notes,
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createLead(dto: CreateLeadDto) {
    const rawVal = dto.estimatedValue !== undefined ? dto.estimatedValue : dto.numericValue;
    const numVal = Number(rawVal) || 0;

    let createdAt = new Date();
    if (dto.createdAt) {
      const parsed = new Date(dto.createdAt);
      if (!isNaN(parsed.getTime())) createdAt = parsed;
    } else if (dto.date) {
      const timePart = dto.time ? ` ${dto.time}` : ' 00:00:00';
      const parsed = new Date(`${dto.date}${timePart}`);
      if (!isNaN(parsed.getTime())) createdAt = parsed;
    }

    const res = await this.db.query(
      `INSERT INTO crm_leads (
        name, company, email, phone, source, numeric_value, stage, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, company, email, phone, source,
                 numeric_value as "numericValue",
                 stage, notes, created_at as "createdAt", updated_at as "updatedAt"`,
      [
        dto.name,
        dto.company,
        dto.email || null,
        dto.phone || null,
        dto.source || 'Inbound Web Inquiry',
        numVal,
        dto.stage || 'New',
        dto.notes || null,
        createdAt,
      ],
    );

    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      id: row.id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      source: row.source || 'Inbound Web Inquiry',
      estimatedValue: this.formatINR(row.numericValue || 0),
      numericValue: Number(row.numericValue || 0),
      stage: row.stage,
      notes: row.notes,
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const existing = await this.db.query(
      `SELECT * FROM crm_leads WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    if (existing.rows.length === 0) {
      throw new NotFoundException({ message: `Lead with ID ${id} not found` });
    }

    const ex = existing.rows[0];
    const name = dto.name !== undefined ? dto.name : ex.name;
    const company = dto.company !== undefined ? dto.company : ex.company;
    const email = dto.email !== undefined ? (dto.email || null) : ex.email;
    const phone = dto.phone !== undefined ? dto.phone : ex.phone;
    const source = dto.source !== undefined ? dto.source : (ex.source || 'Inbound Web Inquiry');

    let numVal = ex.numeric_value;
    if (dto.estimatedValue !== undefined) {
      numVal = Number(dto.estimatedValue) || 0;
    } else if (dto.numericValue !== undefined) {
      numVal = Number(dto.numericValue) || 0;
    }

    const stage = dto.stage !== undefined ? dto.stage : ex.stage;
    const notes = dto.notes !== undefined ? dto.notes : ex.notes;

    const res = await this.db.query(
      `UPDATE crm_leads
       SET name = $1, company = $2, email = $3, phone = $4, source = $5,
           numeric_value = $6, stage = $7, notes = $8,
           updated_at = NOW()
       WHERE id = $9 AND is_deleted = false
       RETURNING id, name, company, email, phone, source,
                 numeric_value as "numericValue",
                 stage, notes, created_at as "createdAt", updated_at as "updatedAt"`,
      [name, company, email, phone, source, numVal, stage, notes, id],
    );



    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      id: row.id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      estimatedValue: this.formatINR(row.numericValue || 0),
      numericValue: Number(row.numericValue || 0),
      stage: row.stage,
      notes: row.notes,
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async deleteLead(id: string) {
    const res = await this.db.query(
      `UPDATE crm_leads SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ message: `Lead with ID ${id} not found` });
    }
    return { message: `Lead record ${id} soft-deleted successfully` };
  }

  /* ---------------- DEALS ---------------- */

  async getDeals(query: DealQueryDto) {
    const { stage, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (stage) {
      params.push(stage);
      conditions.push(`stage = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR customer_name ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM crm_deals WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, title, customer_id as "customerId", customer_name as "customerName",
              value, stage, expected_close_date as "expectedCloseDate",
              created_at as "createdAt"
       FROM crm_deals
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => {
      const dt = this.formatDateTime(row.createdAt);
      return {
        ...row,
        value: Number(row.value || 0),
        formattedValue: this.formatINR(row.value || 0),
        date: dt.date,
        time: dt.time,
        createdDate: dt.date,
        createdTime: dt.time,
        createdAt: dt.createdAt,
      };
    });

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createDeal(dto: CreateDealDto) {
    const res = await this.db.query(
      `INSERT INTO crm_deals (
        title, customer_id, customer_name, value, stage, expected_close_date
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, customer_id as "customerId", customer_name as "customerName",
                 value, stage, expected_close_date as "expectedCloseDate",
                 created_at as "createdAt"`,
      [
        dto.title,
        dto.customerId || null,
        dto.customerName || null,
        dto.value || 0,
        dto.stage || 'Proposal',
        dto.expectedCloseDate || null,
      ],
    );

    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      ...row,
      value: Number(row.value || 0),
      formattedValue: this.formatINR(row.value || 0),
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
    };
  }

  /* ---------------- ACTIVITIES ---------------- */

  async getActivities(entityId: string) {
    const res = await this.db.query(
      `SELECT id, entity_id as "entityId", type, notes, created_by_name as "createdByName", created_at as "createdAt"
       FROM crm_activities
       WHERE entity_id = $1
       ORDER BY created_at DESC`,
      [entityId],
    );

    return res.rows.map((row) => {
      const dt = this.formatDateTime(row.createdAt);
      return {
        ...row,
        date: dt.date,
        time: dt.time,
        createdDate: dt.date,
        createdTime: dt.time,
        createdAt: dt.createdAt,
      };
    });
  }

  async createActivity(dto: CreateActivityDto, createdByName?: string) {
    const res = await this.db.query(
      `INSERT INTO crm_activities (entity_id, type, notes, created_by_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, entity_id as "entityId", type, notes, created_by_name as "createdByName", created_at as "createdAt"`,
      [dto.entityId, dto.type, dto.notes, createdByName || 'System'],
    );

    const row = res.rows[0];
    const dt = this.formatDateTime(row.createdAt);
    return {
      ...row,
      date: dt.date,
      time: dt.time,
      createdDate: dt.date,
      createdTime: dt.time,
      createdAt: dt.createdAt,
    };
  }


  /* ---------------- GSTIN LOOKUP & AUTOFILL ---------------- */

  async lookupByGstin(rawGstin: string) {
    if (!rawGstin) {
      throw new BadRequestException({ message: "GSTIN is required" });
    }

    const cleanGstin = rawGstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");

    // 1. Search in crm_customers (Customer or Vendor)
    const custRes = await this.db.query(
      `SELECT id, type, name, company, email, phone, gst, category, status,
              billing_address as "billingAddress", shipping_address as "shippingAddress",
              notes, created_at as "createdAt"
       FROM crm_customers
       WHERE REPLACE(UPPER(gst), ' ', '') = $1 AND is_deleted = false
       ORDER BY updated_at DESC
       LIMIT 1`,
      [cleanGstin],
    );

    if (custRes.rows.length > 0) {
      const party = custRes.rows[0];
      const stateCode = cleanGstin.slice(0, 2);
      const isDelhi = stateCode === "07";
      return {
        found: true,
        source: "crm_customers",
        party: {
          id: party.id,
          name: party.name,
          company: party.company || party.name,
          email: party.email || "",
          phone: party.phone || "",
          gst: party.gst || cleanGstin,
          gstin: party.gst || cleanGstin,
          type: party.type || "Customer",
          category: party.category || "General",
          billingAddress: party.billingAddress || "",
          shippingAddress: party.shippingAddress || party.billingAddress || "",
          stateCode,
          placeOfSupply: party.billingAddress || (isDelhi ? "07 - Delhi" : `${stateCode} - Outside Delhi`),
          isDelhi,
          isInterState: !isDelhi,
          taxMode: isDelhi ? "CGST_SGST" : "IGST",
        },
      };
    }

    // 2. Search in sales_documents (previously issued invoices/orders)
    const salesRes = await this.db.query(
      `SELECT customer, customer_id as "customerId", gstin, place_of_supply as "placeOfSupply"
       FROM sales_documents
       WHERE REPLACE(UPPER(gstin), ' ', '') = $1 AND is_deleted = false
       ORDER BY date DESC
       LIMIT 1`,
      [cleanGstin],
    );

    if (salesRes.rows.length > 0) {
      const party = salesRes.rows[0];
      const stateCode = cleanGstin.slice(0, 2);
      const isDelhi = stateCode === "07";
      return {
        found: true,
        source: "sales_documents",
        party: {
          id: party.customerId || null,
          name: party.customer,
          company: party.customer,
          gst: party.gstin || cleanGstin,
          gstin: party.gstin || cleanGstin,
          type: "Customer",
          billingAddress: party.placeOfSupply || "",
          shippingAddress: party.placeOfSupply || "",
          stateCode,
          placeOfSupply: party.placeOfSupply || (isDelhi ? "07 - Delhi" : `${stateCode} - Outside Delhi`),
          isDelhi,
          isInterState: !isDelhi,
          taxMode: isDelhi ? "CGST_SGST" : "IGST",
        },
      };
    }

    // 3. Algorithmic GSTIN Parsing (State Code, State Name, PAN, Entity Type)
    const stateMap: Record<string, string> = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
      "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
      "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
      "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
      "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
      "16": "Tripura", "17": "Meghalaya", "18": "Assam",
      "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
      "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
      "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
      "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
      "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
      "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh",
      "38": "Ladakh"
    };

    const stateCode = cleanGstin.slice(0, 2);
    const stateName = stateMap[stateCode] || "Outside Delhi";
    const isDelhi = stateCode === "07";
    const isInterState = !isDelhi;
    const pan = cleanGstin.length >= 12 ? cleanGstin.slice(2, 12) : "";

    const entityTypeMap: Record<string, string> = {
      C: "Company / Corporate",
      P: "Proprietorship / Individual",
      H: "Hindu Undivided Family (HUF)",
      F: "Partnership Firm / LLP",
      A: "Association of Persons (AOP)",
      T: "Trust",
      B: "Body of Individuals (BOI)",
      L: "Local Authority",
      J: "Artificial Juridical Person",
      G: "Government Entity",
    };
    const constitutionChar = pan.length >= 4 ? pan[3] : "";
    const entityType = entityTypeMap[constitutionChar] || "Commercial Entity";

    return {
      found: false,
      source: "algorithmic_parser",
      parsed: {
        gstin: cleanGstin,
        stateCode,
        stateName,
        isDelhi,
        isInterState,
        placeOfSupply: `${stateCode} - ${stateName}`,
        pan,
        entityType,
        taxMode: isDelhi ? "CGST_SGST" : "IGST",
      },
    };
  }

}
