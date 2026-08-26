import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbConfig = this.configService.get('database');
    const connectionString = dbConfig?.url || process.env.DATABASE_URL;

    if (connectionString) {
      this.logger.log('Initializing PostgreSQL Pool with connectionString');
      this.pool = new Pool({
        connectionString,
      });
    } else {
      this.logger.log('Initializing PostgreSQL Pool with discrete connection params');
      this.pool = new Pool({
        host: dbConfig?.host || process.env.DB_HOST || 'localhost',
        port: dbConfig?.port || parseInt(process.env.DB_PORT || '5432', 10),
        user: dbConfig?.username || process.env.DB_USER || 'postgres',
        password: dbConfig?.password || process.env.DB_PASSWORD || 'postgres',
        database: dbConfig?.name || process.env.DB_NAME || 'central_erp',
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
            name VARCHAR(255) NOT NULL,
            company VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            gst VARCHAR(50),
            category VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'Active',
            numeric_outstanding NUMERIC(15,2) DEFAULT 0.00,
            numeric_credit_limit NUMERIC(15,2) DEFAULT 0.00,
            assigned_rep VARCHAR(255),
            billing_address TEXT,
            shipping_address TEXT,
            notes TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_leads (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('lead-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            name VARCHAR(255) NOT NULL,
            company VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            source VARCHAR(100) DEFAULT 'Direct Outreach',
            numeric_value NUMERIC(15,2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'New',
            assigned_rep VARCHAR(255),
            score INT DEFAULT 50,
            notes TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_deals (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('deal-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            title VARCHAR(255) NOT NULL,
            customer_id VARCHAR(100),
            customer_name VARCHAR(255),
            value NUMERIC(15,2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'Proposal',
            expected_close_date DATE,
            assigned_rep VARCHAR(255),
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS crm_activities (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('act-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            entity_id VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'Note',
            notes TEXT NOT NULL,
            created_by_name VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sales_documents (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('INV-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            ref_no VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'invoice',
            sales_order_no VARCHAR(100),
            po_number VARCHAR(100),
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
            customer VARCHAR(255) NOT NULL,
            customer_id VARCHAR(100),
            gstin VARCHAR(50),
            place_of_supply VARCHAR(100),
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
        CREATE TABLE IF NOT EXISTS purchase_records (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('PUR-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
            ref_no VARCHAR(100),
            type VARCHAR(50) NOT NULL DEFAULT 'rfo',
            vendor VARCHAR(255) NOT NULL,
            vendor_invoice_no VARCHAR(100),
            request_date DATE,
            bill_date DATE,
            due_date DATE,
            purchase_date DATE,
            numeric_amount NUMERIC(15,2) DEFAULT 0.00,
            department VARCHAR(100),
            priority VARCHAR(50) DEFAULT 'NORMAL',
            asset_tag VARCHAR(100),
            name VARCHAR(255),
            model VARCHAR(255),
            numeric_cost NUMERIC(15,2) DEFAULT 0.00,
            location VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
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

  async onModuleDestroy() {
    await this.pool.end();
  }
}
