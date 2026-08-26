import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly db: DatabaseService) {}

  private readonly entityTableMap: Record<string, string> = {
    users: 'users',
    customers: 'crm_customers',
    leads: 'crm_leads',
    deals: 'crm_deals',
    sales: 'sales_documents',
    purchase: 'purchase_records',
    inventory: 'inventory_products',
    accounts: 'finance_accounts',
    vouchers: 'finance_vouchers',
    boms: 'manufacturing_boms',
    workorders: 'manufacturing_work_orders',
  };

  /* ---------------- FETCH ALL SOFT-DELETED TRASH ---------------- */

  async getTrash() {
    const trashItems: any[] = [];

    for (const [entityType, table] of Object.entries(this.entityTableMap)) {
      try {
        const res = await this.db.query(
          `SELECT id, updated_at as "deletedAt" FROM ${table} WHERE is_deleted = true LIMIT 50`,
        );
        for (const row of res.rows) {
          trashItems.push({
            entityType,
            id: row.id,
            deletedAt: row.deletedAt,
          });
        }
      } catch (err: any) {
        this.logger.debug(`Could not query trash for table ${table}: ${err.message}`);
      }
    }

    return {
      totalTrashed: trashItems.length,
      trash: trashItems,
    };
  }

  /* ---------------- RESTORE SOFT-DELETED RECORD ---------------- */

  async restore(entityType: string, id: string) {
    const table = this.entityTableMap[entityType.toLowerCase()];
    if (!table) {
      throw new BadRequestException({
        message: `Invalid entityType '${entityType}'. Supported types: ${Object.keys(this.entityTableMap).join(', ')}`,
      });
    }

    const res = await this.db.query(
      `UPDATE ${table} SET is_deleted = false, updated_at = NOW() WHERE id = $1 AND is_deleted = true RETURNING id`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({
        message: `Soft-deleted record with ID '${id}' not found in ${entityType}`,
      });
    }

    return {
      message: `Successfully restored ${entityType} record ${id}`,
      id,
      entityType,
    };
  }
}
