-- PostgreSQL Migration: Suraj ERP Complete Core Tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
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

-- 2. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRM Customers & Vendors Table
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

-- 5. CRM Leads Table
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

-- 6. CRM Deals Table
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

-- 7. CRM Activities Table
CREATE TABLE IF NOT EXISTS crm_activities (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('act-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    entity_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Note',
    notes TEXT NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Sales Documents Table
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

-- 9. Purchase Records Table
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

-- 10. Inventory Products Table
CREATE TABLE IF NOT EXISTS inventory_products (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('PROD-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    warehouse VARCHAR(255) DEFAULT 'Suraj Main Factory Warehouse (Bay A)',
    stock INT DEFAULT 0,
    min_reorder INT DEFAULT 10,
    unit_price NUMERIC(15,2) DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'Units',
    status VARCHAR(50) DEFAULT 'IN STOCK',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Inventory Stock Movement Audit Logs Table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('MOV-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    product_id VARCHAR(100) REFERENCES inventory_products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    numeric_quantity INT NOT NULL,
    reference_no VARCHAR(100),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user VARCHAR(255)
);

-- 12. Finance Accounts Table
CREATE TABLE IF NOT EXISTS finance_accounts (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('ACC-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Finance Vouchers Table
CREATE TABLE IF NOT EXISTS finance_vouchers (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('VOUCH-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    voucher_no VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15,2) DEFAULT 0.00,
    debit_account VARCHAR(255) NOT NULL,
    credit_account VARCHAR(255) NOT NULL,
    narration TEXT,
    status VARCHAR(50) DEFAULT 'POSTED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Manufacturing BOMs Table
CREATE TABLE IF NOT EXISTS manufacturing_boms (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('BOM-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    bom_no VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cost NUMERIC(15,2) DEFAULT 0.00,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Manufacturing Work Orders Table
CREATE TABLE IF NOT EXISTS manufacturing_work_orders (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('WO-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
    work_order_no VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    target_qty INT NOT NULL,
    completed_qty INT DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE,
    status VARCHAR(50) DEFAULT 'PLANNED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
