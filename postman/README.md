# Central ERP Postman Collection & Environments

This directory contains the complete and official Postman collection and environments for testing and integrating with the Central ERP Backend API.

## Structure

```
postman/
├── central-erp.postman_collection.json   # Postman Collection (v2.1)
├── environments/
│   ├── central-erp.local.postman_environment.json    # Local Environment (localhost:3000/api/v1)
│   ├── central-erp.staging.postman_environment.json  # Staging Environment
│   └── central-erp.live.postman_environment.json     # Production Environment
└── README.md
```

## Getting Started

1. **Import into Postman**:
   - Open Postman.
   - Click **Import** (top left).
   - Drag and drop `central-erp.postman_collection.json` and your desired environment file from `environments/`.

2. **Select the Environment**:
   - In the top-right environment dropdown, select **Central ERP - Local** (or Staging / Live).

3. **Authenticate**:
   - Execute **Authentication > Register** (if first time setup) or **Authentication > Login**.
   - The test script on the **Login** request automatically captures the `accessToken` and `refreshToken` and saves them to your active environment variables (`token` and `refreshToken`).
   - All protected requests throughout the collection inherit the Bearer token automatically (`{{token}}`).

## Available Folders & Endpoints (64 Endpoints)

| Folder | Endpoints | Key Highlights |
|---|---|---|
| **Authentication** | 8 requests | Register, Login, Me, Refresh Token, Logout, Change Password, Forgot Password, Reset Password |
| **Users** | 3 requests | List users with role/status filters, Get user by ID, Update user details |
| **Admin** | 2 requests | System-wide soft-deleted trash viewer, Entity restore endpoint |
| **Organizations** | 2 requests | List organization branches, Create organization branch |
| **CRM** | 14 requests | GSTIN lookup (`/crm/lookup-gstin/:gstin`), Customers & Vendors CRUD with financial credit terms & address support, Leads CRUD, Deals pipeline, Activity logs |
| **Sales** | 10 requests | Sales docs (Quotation, Sales Order, Invoice, Delivery Challan, Payment), Sequential Reference Number generation (`/sales/next-ref-no`), Single-Invoice rule validation (`/sales/check-invoice-exists`), Status updates (`READY`, `UNPAID`, etc.), Archived document recovery & permanent purge |
| **Purchase** | 6 requests | Purchase domain records (RFO, Purchase Bill, Purchased Machinery), Sequential Reference Number generation (`/purchase/next-ref-no`), CRUD operations |
| **Inventory** | 7 requests | Products CRUD, Stock Movements audit log, Inward stock receipt (`/inventory/receive-stock`), Outward stock dispatch (`/inventory/dispatch-stock`) |
| **Manufacturing** | 4 requests | Bill of Materials (BOM) management, Shop floor Work Order issuing & tracking |
| **Finance** | 4 requests | Chart of Accounts & GL, Journal/Payment/Receipt vouchers, Tax summary (CGST/SGST/IGST/ITC) |
| **Health & System** | 4 requests | Root health ping (`/`), App deployment version (`/version`), System health (`/health`), Health build info (`/health/version`) |

## Variables Reference

- `baseUrl`: Base URL prefix for all requests (Default: `http://localhost:3000/api/v1`).
- `token`: Bearer access token (populated automatically upon login).
- `refreshToken`: Refresh token for session renewal (populated automatically upon login).
- `adminEmail`: Admin user email (Default: `admin@erp.com`).
- `adminPassword`: Admin user password (Default: `Admin@123456`).
