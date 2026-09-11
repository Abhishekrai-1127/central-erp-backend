import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
              assigned_rep as "assignedRep",
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
        numeric_outstanding, numeric_credit_limit, outstanding, credit_limit, assigned_rep,
        billing_address, shipping_address, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING id, type, name, company, email, phone, gst, category, status, stage, source,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
                 outstanding, credit_limit as "creditLimit",
                 assigned_rep as "assignedRep",
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
        dto.assignedRep || null,
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
    const email = dto.email ?? ex.email;
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
    const assignedRep = dto.assignedRep ?? ex.assigned_rep;
    const billingAddress = dto.billingAddress ?? ex.billing_address;
    const shippingAddress = dto.shippingAddress ?? ex.shipping_address;
    const notes = dto.notes ?? ex.notes;

    const res = await this.db.query(
      `UPDATE crm_customers
       SET type = $1, name = $2, company = $3, email = $4, phone = $5, gst = $6,
           category = $7, status = $8, stage = $9, source = $10,
           numeric_outstanding = $11, numeric_credit_limit = $12,
           outstanding = $13, credit_limit = $14, assigned_rep = $15, billing_address = $16,
           shipping_address = $17, notes = $18, created_at = $19, updated_at = NOW()
       WHERE id = $20 AND is_deleted = false
       RETURNING id, type, name, company, email, phone, gst, category, status, stage, source,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
                 outstanding, credit_limit as "creditLimit",
                 assigned_rep as "assignedRep",
                 billing_address as "billingAddress",
                 shipping_address as "shippingAddress",
                 notes, created_at as "createdAt"`,
      [
        type, name, company, email, phone, gst, category, status, stage, source,
        numericOutstanding, numericCreditLimit, outstanding, creditLimit, assignedRep,
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
    const email = dto.email !== undefined ? dto.email : ex.email;
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
              assigned_rep as "assignedRep", created_at as "createdAt"
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
        title, customer_id, customer_name, value, stage, expected_close_date, assigned_rep
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, customer_id as "customerId", customer_name as "customerName",
                 value, stage, expected_close_date as "expectedCloseDate",
                 assigned_rep as "assignedRep", created_at as "createdAt"`,
      [
        dto.title,
        dto.customerId || null,
        dto.customerName || null,
        dto.value || 0,
        dto.stage || 'Proposal',
        dto.expectedCloseDate || null,
        dto.assignedRep || null,
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

}
