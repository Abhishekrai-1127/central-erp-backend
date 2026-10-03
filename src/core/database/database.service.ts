import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbConfig = this.configService.get('database');
    const connectionString = dbConfig?.url || process.env.DATABASE_URL;

    if (connectionString && connectionString.trim() !== '') {
      this.logger.log('Initializing PostgreSQL Pool with connectionString');
      this.pool = new Pool({
        connectionString,
      });
    } else {
      const host = dbConfig?.host || process.env.DB_HOST || '100.99.17.37';
      const port = dbConfig?.port || parseInt(process.env.DB_PORT || '5432', 10);
      const user = dbConfig?.username || process.env.DB_USERNAME || process.env.DB_USER;
      const password = dbConfig?.password || process.env.DB_PASSWORD;
      const database = dbConfig?.name || process.env.DB_NAME;

      this.pool = new Pool({
        host,
        port,
        user,
        password,
        database,
      });
    }

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });

    await this.initTables();
  }

  private async initTables() {
    try {
      this.logger.log('Ensuring database schema & tables exist...');
      await this.pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'SALES_REP',
            phone VARCHAR(50),
            status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_customers (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('cust-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            type VARCHAR(50) NOT NULL DEFAULT 'Customer',
            name TEXT NOT NULL,
            company TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            gst TEXT,
            category TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Active',
            numeric_outstanding NUMERIC(15,2) DEFAULT 0.00,
            numeric_credit_limit NUMERIC(15,2) DEFAULT 0.00,
            outstanding TEXT,
            credit_limit TEXT,
            billing_address TEXT,
            shipping_address TEXT,
            notes TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Existing installations already have this table, so add the newly accepted
      // frontend display fields and widen columns to TEXT to prevent truncation errors.
      await this.pool.query(`
        ALTER TABLE crm_customers
          ADD COLUMN IF NOT EXISTS outstanding TEXT,
          ADD COLUMN IF NOT EXISTS credit_limit TEXT,
          ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'New',
          ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Inbound Web Inquiry',
          ALTER COLUMN name TYPE TEXT,
          ALTER COLUMN company TYPE TEXT,
          ALTER COLUMN email TYPE TEXT,
          ALTER COLUMN phone TYPE TEXT,
          ALTER COLUMN gst TYPE TEXT,
          ALTER COLUMN category TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_leads (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('lead-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            name TEXT NOT NULL,
            company TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            source TEXT DEFAULT 'Direct Outreach',
            numeric_value NUMERIC(15,2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'New',
            score INT DEFAULT 50,
            notes TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE crm_leads
          ALTER COLUMN name TYPE TEXT,
          ALTER COLUMN company TYPE TEXT,
          ALTER COLUMN email TYPE TEXT,
          ALTER COLUMN phone TYPE TEXT,
          ALTER COLUMN source TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_deals (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('deal-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            title TEXT NOT NULL,
            customer_id TEXT,
            customer_name TEXT,
            value NUMERIC(15,2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'Proposal',
            expected_close_date DATE,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE crm_deals
          ALTER COLUMN title TYPE TEXT,
          ALTER COLUMN customer_id TYPE TEXT,
          ALTER COLUMN customer_name TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_activities (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('act-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            entity_id TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'Note',
            notes TEXT NOT NULL,
            created_by_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sales_documents (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('INV-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            ref_no TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'invoice',
            sales_order_no TEXT,
            po_number TEXT,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
            customer TEXT NOT NULL,
            customer_id TEXT,
            gstin TEXT,
            place_of_supply TEXT,
            billing_address TEXT,
            shipping_address TEXT,
            items JSONB NOT NULL DEFAULT '[]'::jsonb,
            subtotal NUMERIC(15,2) DEFAULT 0.00,
            tax_total NUMERIC(15,2) DEFAULT 0.00,
            cgst_amount NUMERIC(15,2) DEFAULT 0.00,
            sgst_amount NUMERIC(15,2) DEFAULT 0.00,
            igst_amount NUMERIC(15,2) DEFAULT 0.00,
            grand_total NUMERIC(15,2) DEFAULT 0.00,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE sales_documents
          ADD COLUMN IF NOT EXISTS valid_until DATE,
          ADD COLUMN IF NOT EXISTS notes TEXT,
          ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR (₹)',
          ADD COLUMN IF NOT EXISTS transporter JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS transporter_name TEXT,
          ADD COLUMN IF NOT EXISTS vehicle_no TEXT,
          ADD COLUMN IF NOT EXISTS date_of_supply DATE,
          ADD COLUMN IF NOT EXISTS eway_bill_no TEXT,
          ADD COLUMN IF NOT EXISTS eway_bill_date DATE,
          ADD COLUMN IF NOT EXISTS billing_address TEXT,
          ADD COLUMN IF NOT EXISTS shipping_address TEXT,
          ALTER COLUMN ref_no TYPE TEXT,
          ALTER COLUMN sales_order_no TYPE TEXT,
          ALTER COLUMN po_number TYPE TEXT,
          ALTER COLUMN customer TYPE TEXT,
          ALTER COLUMN customer_id TYPE TEXT,
          ALTER COLUMN gstin TYPE TEXT,
          ALTER COLUMN place_of_supply TYPE TEXT,
          ALTER COLUMN transporter_name TYPE TEXT,
          ALTER COLUMN vehicle_no TYPE TEXT,
          ALTER COLUMN eway_bill_no TYPE TEXT,
          ALTER COLUMN currency TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS deleted_sales_documents (
            archive_id VARCHAR(100) PRIMARY KEY DEFAULT ('DEL-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            original_id VARCHAR(100) NOT NULL,
            original_ref_no TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'invoice',
            sales_order_no TEXT,
            po_number TEXT,
            date DATE,
            status VARCHAR(50) DEFAULT 'DELETED',
            customer TEXT NOT NULL,
            customer_id TEXT,
            gstin TEXT,
            place_of_supply TEXT,
            billing_address TEXT,
            shipping_address TEXT,
            items JSONB NOT NULL DEFAULT '[]'::jsonb,
            subtotal NUMERIC(15,2) DEFAULT 0.00,
            tax_total NUMERIC(15,2) DEFAULT 0.00,
            cgst_amount NUMERIC(15,2) DEFAULT 0.00,
            sgst_amount NUMERIC(15,2) DEFAULT 0.00,
            igst_amount NUMERIC(15,2) DEFAULT 0.00,
            grand_total NUMERIC(15,2) DEFAULT 0.00,
            valid_until DATE,
            notes TEXT,
            currency TEXT DEFAULT 'INR (₹)',
            transporter JSONB DEFAULT '{}'::jsonb,
            transporter_name TEXT,
            vehicle_no TEXT,
            date_of_supply DATE,
            eway_bill_no TEXT,
            eway_bill_date DATE,
            deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_by TEXT DEFAULT 'Admin',
            delete_reason TEXT,
            document_data JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_deleted_docs_original_ref ON deleted_sales_documents (original_ref_no);
        CREATE INDEX IF NOT EXISTS idx_deleted_docs_type ON deleted_sales_documents (type);
        CREATE INDEX IF NOT EXISTS idx_deleted_docs_deleted_at ON deleted_sales_documents (deleted_at DESC);
      `);

      try {
        await this.pool.query(`
          INSERT INTO deleted_sales_documents (
            original_id, original_ref_no, type, sales_order_no, po_number, date, status,
            customer, customer_id, gstin, place_of_supply, billing_address, shipping_address,
            items, subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
            valid_until, notes, currency, transporter, transporter_name, vehicle_no,
            date_of_supply, eway_bill_no, eway_bill_date, deleted_at, deleted_by, delete_reason, document_data
          )
          SELECT
            id, ref_no, type, sales_order_no, po_number, date, 'DELETED',
            customer, customer_id, gstin, place_of_supply, billing_address, shipping_address,
            items, subtotal, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total,
            valid_until, notes, currency, transporter, transporter_name, vehicle_no,
            date_of_supply, eway_bill_no, eway_bill_date, COALESCE(updated_at, CURRENT_TIMESTAMP), 'Migration', 'Migrated legacy soft-deleted record',
            to_jsonb(sales_documents)
          FROM sales_documents
          WHERE is_deleted = true;

          DELETE FROM sales_documents WHERE is_deleted = true;
        `);
      } catch (mErr) {
        this.logger.warn(`Soft-delete migration notice: ${mErr.message}`);
      }

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS purchase_records (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('PUR-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            ref_no TEXT,
            type VARCHAR(50) NOT NULL DEFAULT 'rfo',
            vendor TEXT NOT NULL,
            vendor_invoice_no TEXT,
            request_date DATE,
            bill_date DATE,
            due_date DATE,
            purchase_date DATE,
            numeric_amount NUMERIC(15,2) DEFAULT 0.00,
            department TEXT,
            priority VARCHAR(50) DEFAULT 'NORMAL',
            asset_tag TEXT,
            name TEXT,
            model TEXT,
            numeric_cost NUMERIC(15,2) DEFAULT 0.00,
            location TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE purchase_records
          ALTER COLUMN ref_no TYPE TEXT,
          ALTER COLUMN vendor TYPE TEXT,
          ALTER COLUMN vendor_invoice_no TYPE TEXT,
          ALTER COLUMN department TYPE TEXT,
          ALTER COLUMN asset_tag TYPE TEXT,
          ALTER COLUMN name TYPE TEXT,
          ALTER COLUMN model TYPE TEXT,
          ALTER COLUMN location TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS inventory_products (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('PROD-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            name TEXT NOT NULL,
            sku VARCHAR(100) NOT NULL UNIQUE,
            category TEXT NOT NULL,
            warehouse TEXT DEFAULT 'Suraj Main Factory Warehouse (Bay A)',
            stock INT DEFAULT 0,
            min_reorder INT DEFAULT 10,
            unit_price NUMERIC(15,2) DEFAULT 0.00,
            unit VARCHAR(50) DEFAULT 'Units',
            status VARCHAR(50) DEFAULT 'IN STOCK',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE inventory_products
          ALTER COLUMN name TYPE TEXT,
          ALTER COLUMN warehouse TYPE TEXT,
          ALTER COLUMN category TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('MOV-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            product_id VARCHAR(100) REFERENCES inventory_products(id) ON DELETE CASCADE,
            product_name TEXT NOT NULL,
            sku VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            quantity VARCHAR(50) NOT NULL,
            numeric_quantity INT NOT NULL,
            reference_no TEXT,
            date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by_user TEXT
        );
      `);
      await this.pool.query(`
        ALTER TABLE inventory_movements
          ALTER COLUMN product_name TYPE TEXT,
          ALTER COLUMN reference_no TYPE TEXT,
          ALTER COLUMN created_by_user TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS finance_accounts (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('ACC-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            account_code VARCHAR(50) UNIQUE NOT NULL,
            account_name TEXT NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance NUMERIC(15,2) DEFAULT 0.00,
            currency VARCHAR(10) DEFAULT 'INR',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE finance_accounts
          ALTER COLUMN account_name TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS finance_vouchers (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('VOUCH-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            voucher_no VARCHAR(100) UNIQUE NOT NULL,
            type VARCHAR(50) NOT NULL,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            amount NUMERIC(15,2) DEFAULT 0.00,
            debit_account TEXT NOT NULL,
            credit_account TEXT NOT NULL,
            narration TEXT,
            status VARCHAR(50) DEFAULT 'POSTED',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE finance_vouchers
          ALTER COLUMN debit_account TYPE TEXT,
          ALTER COLUMN credit_account TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS manufacturing_boms (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('BOM-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            bom_no VARCHAR(100) UNIQUE NOT NULL,
            product_name TEXT NOT NULL,
            sku VARCHAR(100) NOT NULL,
            components JSONB NOT NULL DEFAULT '[]'::jsonb,
            total_cost NUMERIC(15,2) DEFAULT 0.00,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE manufacturing_boms
          ALTER COLUMN product_name TYPE TEXT;
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS manufacturing_work_orders (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('WO-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            work_order_no VARCHAR(100) UNIQUE NOT NULL,
            product_name TEXT NOT NULL,
            sku VARCHAR(100) NOT NULL,
            target_qty INT NOT NULL,
            completed_qty INT DEFAULT 0,
            start_date DATE DEFAULT CURRENT_DATE,
            target_date DATE,
            status VARCHAR(50) DEFAULT 'PLANNED',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        ALTER TABLE manufacturing_work_orders
          ALTER COLUMN product_name TYPE TEXT;
      `);
      this.logger.log('Database tables successfully verified/created.');
    } catch (err: any) {
      this.logger.warn(`Could not verify/create tables automatically: ${err.message}`);
    }
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Executed query: { text: '${text}', duration: ${duration}ms, rows: ${res.rowCount} }`);
      return res;
    } catch (error: any) {
      this.logger.error(`Database query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

    async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
