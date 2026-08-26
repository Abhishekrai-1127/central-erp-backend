-- PostgreSQL Migration: Suraj ERP Core & CRM Tables

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
