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
      `SELECT id, type, name, company, email, phone, gst, category, status,
              numeric_outstanding as "numericOutstanding",
              numeric_credit_limit as "numericCreditLimit",
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

    const formattedData = res.rows.map((row) => ({
      ...row,
      numericOutstanding: Number(row.numericOutstanding || 0),
      numericCreditLimit: Number(row.numericCreditLimit || 0),
      outstanding: this.formatINR(row.numericOutstanding || 0),
      creditLimit: this.formatINR(row.numericCreditLimit || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createCustomer(dto: CreateCustomerDto) {
    const res = await this.db.query(
      `INSERT INTO crm_customers (
        type, name, company, email, phone, gst, category, status,
        numeric_outstanding, numeric_credit_limit, assigned_rep,
        billing_address, shipping_address, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, type, name, company, email, phone, gst, category, status,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
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
        dto.numericOutstanding || 0,
        dto.numericCreditLimit || 0,
        dto.assignedRep || null,
        dto.billingAddress || null,
        dto.shippingAddress || null,
        dto.notes || null,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericOutstanding: Number(row.numericOutstanding || 0),
      numericCreditLimit: Number(row.numericCreditLimit || 0),
      outstanding: this.formatINR(row.numericOutstanding || 0),
      creditLimit: this.formatINR(row.numericCreditLimit || 0),
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
    const numericOutstanding = dto.numericOutstanding ?? ex.numeric_outstanding;
    const numericCreditLimit = dto.numericCreditLimit ?? ex.numeric_credit_limit;
    const assignedRep = dto.assignedRep ?? ex.assigned_rep;
    const billingAddress = dto.billingAddress ?? ex.billing_address;
    const shippingAddress = dto.shippingAddress ?? ex.shipping_address;
    const notes = dto.notes ?? ex.notes;

    const res = await this.db.query(
      `UPDATE crm_customers
       SET type = $1, name = $2, company = $3, email = $4, phone = $5, gst = $6,
           category = $7, status = $8, numeric_outstanding = $9, numeric_credit_limit = $10,
           assigned_rep = $11, billing_address = $12, shipping_address = $13, notes = $14,
           updated_at = NOW()
       WHERE id = $15 AND is_deleted = false
       RETURNING id, type, name, company, email, phone, gst, category, status,
                 numeric_outstanding as "numericOutstanding",
                 numeric_credit_limit as "numericCreditLimit",
                 assigned_rep as "assignedRep",
                 billing_address as "billingAddress",
                 shipping_address as "shippingAddress",
                 notes, created_at as "createdAt"`,
      [
        type, name, company, email, phone, gst, category, status,
        numericOutstanding, numericCreditLimit, assignedRep,
        billingAddress, shippingAddress, notes, id,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericOutstanding: Number(row.numericOutstanding || 0),
      numericCreditLimit: Number(row.numericCreditLimit || 0),
      outstanding: this.formatINR(row.numericOutstanding || 0),
      creditLimit: this.formatINR(row.numericCreditLimit || 0),
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
      conditions.push(`(name ILIKE $${params.length} OR company ILIKE $${params.length})`);
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
              stage, assigned_rep as "assignedRep", score, notes, created_at as "createdAt"
       FROM crm_leads
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const formattedData = res.rows.map((row) => ({
      ...row,
      numericValue: Number(row.numericValue || 0),
      estimatedValue: this.formatINR(row.numericValue || 0),
    }));

    return {
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createLead(dto: CreateLeadDto) {
    const res = await this.db.query(
      `INSERT INTO crm_leads (
        name, company, email, phone, source, numeric_value, stage, assigned_rep, score, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, company, email, phone, source,
                 numeric_value as "numericValue",
                 stage, assigned_rep as "assignedRep", score, notes, created_at as "createdAt"`,
      [
        dto.name,
        dto.company,
        dto.email || null,
        dto.phone || null,
        dto.source || 'Direct Outreach',
        dto.numericValue || 0,
        dto.stage || 'New',
        dto.assignedRep || null,
        dto.score || 50,
        dto.notes || null,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericValue: Number(row.numericValue || 0),
      estimatedValue: this.formatINR(row.numericValue || 0),
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
    const name = dto.name ?? ex.name;
    const company = dto.company ?? ex.company;
    const email = dto.email ?? ex.email;
    const phone = dto.phone ?? ex.phone;
    const source = dto.source ?? ex.source;
    const numericValue = dto.numericValue ?? ex.numeric_value;
    const stage = dto.stage ?? ex.stage;
    const assignedRep = dto.assignedRep ?? ex.assigned_rep;
    const score = dto.score ?? ex.score;
    const notes = dto.notes ?? ex.notes;

    const res = await this.db.query(
      `UPDATE crm_leads
       SET name = $1, company = $2, email = $3, phone = $4, source = $5,
           numeric_value = $6, stage = $7, assigned_rep = $8, score = $9, notes = $10,
           updated_at = NOW()
       WHERE id = $11 AND is_deleted = false
       RETURNING id, name, company, email, phone, source,
                 numeric_value as "numericValue",
                 stage, assigned_rep as "assignedRep", score, notes, created_at as "createdAt"`,
      [name, company, email, phone, source, numericValue, stage, assignedRep, score, notes, id],
    );

    const row = res.rows[0];
    return {
      ...row,
      numericValue: Number(row.numericValue || 0),
      estimatedValue: this.formatINR(row.numericValue || 0),
    };
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

    const formattedData = res.rows.map((row) => ({
      ...row,
      value: Number(row.value || 0),
      formattedValue: this.formatINR(row.value || 0),
    }));

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
    return {
      ...row,
      value: Number(row.value || 0),
      formattedValue: this.formatINR(row.value || 0),
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

    return res.rows;
  }

  async createActivity(dto: CreateActivityDto, createdByName?: string) {
    const res = await this.db.query(
      `INSERT INTO crm_activities (entity_id, type, notes, created_by_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, entity_id as "entityId", type, notes, created_by_name as "createdByName", created_at as "createdAt"`,
      [dto.entityId, dto.type, dto.notes, createdByName || 'System'],
    );

    return res.rows[0];
  }
}
