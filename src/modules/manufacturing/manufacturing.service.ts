import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import {
  CreateBomDto,
  WorkOrderQueryDto,
  CreateWorkOrderDto,
} from './dto/manufacturing.dto';

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(private readonly db: DatabaseService) {}

  private formatINR(amount: number | string): string {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  /* ---------------- BILL OF MATERIALS (BOM) ---------------- */

  async getBoms() {
    const res = await this.db.query(
      `SELECT id, bom_no as "bomNo", product_name as "productName",
              sku, components, total_cost as "totalCost", created_at as "createdAt"
       FROM manufacturing_boms
       WHERE is_deleted = false
       ORDER BY created_at DESC`,
    );

    return res.rows.map((row) => ({
      ...row,
      totalCost: Number(row.totalCost || 0),
      formattedTotalCost: this.formatINR(row.totalCost || 0),
    }));
  }

  async createBom(dto: CreateBomDto) {
    const componentsJson = JSON.stringify(dto.components || []);

    const res = await this.db.query(
      `INSERT INTO manufacturing_boms (bom_no, product_name, sku, components, total_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, bom_no as "bomNo", product_name as "productName",
                 sku, components, total_cost as "totalCost", created_at as "createdAt"`,
      [
        dto.bomNo,
        dto.productName,
        dto.sku,
        componentsJson,
        dto.totalCost || 0,
      ],
    );

    const row = res.rows[0];
    return {
      ...row,
      totalCost: Number(row.totalCost || 0),
      formattedTotalCost: this.formatINR(row.totalCost || 0),
    };
  }

  /* ---------------- WORK ORDERS ---------------- */

  async getWorkOrders(query: WorkOrderQueryDto) {
    const { status, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(work_order_no ILIKE $${params.length} OR product_name ILIKE $${params.length} OR sku ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM manufacturing_work_orders WHERE ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await this.db.query(
      `SELECT id, work_order_no as "workOrderNo", product_name as "productName",
              sku, target_qty as "targetQty", completed_qty as "completedQty",
              start_date as "startDate", target_date as "targetDate", status, created_at as "createdAt"
       FROM manufacturing_work_orders
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    return {
      data: res.rows,
      meta: { page: pageNum, limit: limitNum, total, totalPages },
    };
  }

  async createWorkOrder(dto: CreateWorkOrderDto) {
    const res = await this.db.query(
      `INSERT INTO manufacturing_work_orders (
        work_order_no, product_name, sku, target_qty, start_date, target_date
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, work_order_no as "workOrderNo", product_name as "productName",
                 sku, target_qty as "targetQty", completed_qty as "completedQty",
                 start_date as "startDate", target_date as "targetDate", status, created_at as "createdAt"`,
      [
        dto.workOrderNo,
        dto.productName,
        dto.sku,
        dto.targetQty,
        dto.startDate || new Date().toISOString().split('T')[0],
        dto.targetDate || null,
      ],
    );

    return res.rows[0];
  }
}
