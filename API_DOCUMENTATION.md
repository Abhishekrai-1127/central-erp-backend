# Central ERP Backend API Documentation

**Base URL**: `http://<host>:<port>/api/v1`  
**Swagger UI**: `http://<host>:<port>/api/docs`  
**Auth Strategy**: Bearer Token (`Authorization: Bearer <access_token>`)

---

## 1. Response Envelope Format

All API responses follow a unified response envelope:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed / Error message",
  "error": "Bad Request",
  "timestamp": "2026-09-10T16:00:00.000Z",
  "path": "/api/v1/..."
}
```

---

## 2. User Roles & Permissions

| Role Enum | Description |
| :--- | :--- |
| `ADMIN` | Full access across all modules, trash management, user roles |
| `SALES_REP` | CRM (Leads, Deals, Activities, Customers), Sales Documents, Inventory view |
| `PURCHASE_OFFICER` | Purchase (RFO, Bills, Assets), Vendors, Inventory, Tax Summary |
| `WAREHOUSE_MANAGER`| Inventory (Products, Stock In/Out movements), Manufacturing (BOM, Work Orders) |
| `ACCOUNTANT` | Finance (Vouchers, Chart of Accounts, Tax Summary), Sales & Purchase viewing |

---

## 3. Endpoints Directory

---

### 🟢 System & Health

#### 1. Version & Build Details
- **Endpoint**: `GET /version` or `GET /health/version`
- **Auth**: Public
- **Response**:
```json
{
  "name": "central-erp-backend",
  "version": "0.0.1",
  "environment": "staging",
  "build": {
    "buildNumber": "16",
    "gitCommit": "94c94d4e6b12",
    "gitBranch": "V1.1.1",
    "buildTime": "2026-09-10T10:45:10Z"
  },
  "uptime": 1420,
  "nodeVersion": "v22.23.2",
  "timestamp": "2026-09-10T16:00:00.000Z"
}
```

#### 2. Health Liveness & Readiness
- **Endpoint**: `GET /health`
- **Auth**: Public
- **Response**:
```json
{
  "status": "ok",
  "service": "central-erp-backend",
  "version": "0.0.1",
  "environment": "staging",
  "buildNumber": "16",
  "gitCommit": "94c94d4e6b12",
  "uptime": 1420,
  "timestamp": "2026-09-10T16:00:00.000Z"
}
```

---

### 🔐 Authentication (`/api/v1/auth`)

#### 1. Register User
- **Endpoint**: `POST /auth/register`
- **Auth**: Public
- **Body**:
```json
{
  "name": "John Doe",
  "email": "john@erp.com",
  "password": "SecurePassword123!",
  "role": "SALES_REP",
  "phone": "+91 98765 43210"
}
```

#### 2. Login
- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Body**:
```json
{
  "email": "admin@erp.com",
  "password": "SecurePassword123!"
}
```
- **Response**:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "e7a1b...",
  "user": {
    "id": "usr-1",
    "email": "admin@erp.com",
    "name": "Super Admin",
    "role": "ADMIN"
  }
}
```

#### 3. Current User Profile
- **Endpoint**: `GET /auth/me`
- **Auth**: Bearer Token
- **Response**: User object with organization context.

#### 4. Refresh Token
- **Endpoint**: `POST /auth/refresh`
- **Auth**: Public
- **Body**: `{ "refreshToken": "e7a1b..." }`
- **Response**: `{ "accessToken": "eyJhbGci..." }`

#### 5. Logout
- **Endpoint**: `POST /auth/logout`
- **Auth**: Public
- **Body**: `{ "refreshToken": "e7a1b..." }`

#### 6. Change Password
- **Endpoint**: `POST /auth/change-password`
- **Auth**: Bearer Token
- **Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### 7. Forgot Password
- **Endpoint**: `POST /auth/forgot-password`
- **Auth**: Public
- **Body**: `{ "email": "user@example.com" }`

#### 8. Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **Auth**: Public
- **Body**:
```json
{
  "token": "reset_token_hex",
  "newPassword": "NewSecurePassword123!"
}
```

---

### 👥 Users Management (`/api/v1/users`)

#### 1. List Users
- **Endpoint**: `GET /users`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `PURCHASE_OFFICER`, `WAREHOUSE_MANAGER`, `ACCOUNTANT`)
- **Query Params**: `?role=SALES_REP&status=ACTIVE&search=John&page=1&limit=20`

#### 2. Get User by ID
- **Endpoint**: `GET /users/:id`
- **Auth**: Bearer Token (`ADMIN`)

#### 3. Update User
- **Endpoint**: `PUT /users/:id`
- **Auth**: Bearer Token (`ADMIN`)
- **Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "SALES_REP",
  "phone": "+91 98765 43210",
  "status": "ACTIVE"
}
```

---

### 🏢 Organizations (`/api/v1/organizations`)

#### 1. List Organization Branches
- **Endpoint**: `GET /organizations`
- **Auth**: Bearer Token (`ADMIN`)

#### 2. Create Organization Branch
- **Endpoint**: `POST /organizations`
- **Auth**: Bearer Token (`ADMIN`)
- **Body**:
```json
{
  "name": "Central ERP Headquarters",
  "code": "hq-main",
  "address": "123 Enterprise Way, Tech City"
}
```

---

### 🤝 CRM Module (`/api/v1/crm`)

#### 1. List Customers / Vendors
- **Endpoint**: `GET /crm/customers`
- **Query Params**: `?type=Customer|Vendor&status=Active|Inactive&search=Sharma&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`, `PURCHASE_OFFICER`)

#### 2. Create Customer / Vendor
- **Endpoint**: `POST /crm/customers`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`, `PURCHASE_OFFICER`)
- **Body**:
```json
{
  "type": "Customer",
  "name": "Amitabh Sharma",
  "company": "Sharma Logistics Ltd.",
  "email": "amitabh@sharma-logistics.com",
  "phone": "+91 98765 43210",
  "gst": "09AAACH7409R1ZZ",
  "category": "Logistics",
  "status": "Active",
  "numericOutstanding": 42850.00,
  "numericCreditLimit": 500000.00,
  "assignedRep": "Sarah Jenkins",
  "billingAddress": "Plot 42, Transport Nagar, Kanpur, UP 208023",
  "shippingAddress": "Plot 42, Transport Nagar, Kanpur, UP 208023",
  "notes": "Key enterprise account for North India freight logistics."
}
```

#### 3. Update Customer / Vendor
- **Endpoint**: `PUT /crm/customers/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)

#### 4. Delete Customer / Vendor (Soft-delete)
- **Endpoint**: `DELETE /crm/customers/:id`
- **Auth**: Bearer Token (`ADMIN`)

#### 5. List Leads
- **Endpoint**: `GET /crm/leads`
- **Query Params**: `?stage=New Lead|Contacted|Qualified|Proposal|Won|Lost&search=Apex&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)
- **Response Item**:
```json
{
  "id": "lead-8b1a3d90",
  "name": "Vikram Malhotra",
  "company": "Apex Precision Tools",
  "email": "vikram@apexprecision.com",
  "phone": "+91 98112 33445",
  "estimatedValue": "₹3,50,000.00",
  "numericValue": 350000,
  "stage": "New Lead",
  "notes": "Key requirement details...",
  "date": "2026-09-11",
  "time": "01:32 PM",
  "createdDate": "2026-09-11",
  "createdTime": "01:32 PM",
  "createdAt": "2026-09-11T08:02:47.000Z",
  "updatedAt": "2026-09-11T08:02:47.000Z"
}
```

#### 6. Get Single Lead
- **Endpoint**: `GET /crm/leads/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)

#### 7. Create Lead
- **Endpoint**: `POST /crm/leads`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)
- **Body**:
```json
{
  "name": "Vikram Malhotra",
  "company": "Apex Precision Tools",
  "email": "vikram@apexprecision.com",
  "phone": "+91 98112 33445",
  "estimatedValue": 350000,
  "stage": "New Lead",
  "notes": "Key requirement details..."
}
```

#### 8. Update Lead
- **Endpoint**: `PUT /crm/leads/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)
- **Body**:
```json
{
  "name": "Vikram Malhotra",
  "company": "Apex Precision Tools",
  "email": "vikram@apexprecision.com",
  "phone": "+91 98112 33445",
  "estimatedValue": 350000,
  "stage": "New Lead",
  "notes": "Updated requirement details..."
}
```

#### 9. Delete Lead (Soft-delete)
- **Endpoint**: `DELETE /crm/leads/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)


#### 10. List Deals Pipeline
- **Endpoint**: `GET /crm/deals`
- **Query Params**: `?stage=Proposal|Negotiation|Closed Won|Closed Lost&search=CNC&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)

#### 11. Create Deal
- **Endpoint**: `POST /crm/deals`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`)
- **Body**:
```json
{
  "title": "5-Axis CNC Milling Deal",
  "customerId": "cust-101",
  "customerName": "Apex Precision Tools",
  "value": 350000.00,
  "stage": "Proposal",
  "expectedCloseDate": "2026-09-30",
  "assignedRep": "Sarah Jenkins"
}
```

#### 12. List Timeline Activities
- **Endpoint**: `GET /crm/activities?entityId=:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)

#### 13. Log Activity

- **Endpoint**: `POST /crm/activities`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)
- **Body**:
```json
{
  "entityId": "cust-101",
  "type": "Call",
  "notes": "Discussed Q3 pricing options and credit terms."
}
```

---

### 📦 Inventory Module (`/api/v1/inventory`)

#### 1. List Products
- **Endpoint**: `GET /inventory/products`
- **Query Params**: `?search=Gear&category=Mechanical Parts&warehouse=Bay A&status=IN STOCK|LOW STOCK|OUT OF STOCK&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`, `SALES_REP`, `PURCHASE_OFFICER`, `ACCOUNTANT`)

#### 2. Get Product by ID
- **Endpoint**: `GET /inventory/products/:id`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`, `SALES_REP`, `PURCHASE_OFFICER`, `ACCOUNTANT`)

#### 3. Create Product
- **Endpoint**: `POST /inventory/products`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)
- **Body**:
```json
{
  "name": "Industrial Gear Set X12",
  "sku": "IG-1200-BL",
  "category": "Mechanical Parts",
  "warehouse": "Suraj Main Factory Warehouse (Bay A)",
  "stock": 850,
  "minReorder": 100,
  "unitPrice": 4250.00,
  "unit": "Units",
  "status": "IN STOCK"
}
```

#### 4. Update Product
- **Endpoint**: `PUT /inventory/products/:id`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)

#### 5. List Stock Movement Audit History
- **Endpoint**: `GET /inventory/movements`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`, `SALES_REP`, `PURCHASE_OFFICER`, `ACCOUNTANT`)

#### 6. Receive Stock (Stock In)
- **Endpoint**: `POST /inventory/receive-stock`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)
- **Body**:
```json
{
  "productId": "PROD-001",
  "numericQuantity": 250,
  "referenceNo": "PB-2024-001"
}
```

#### 7. Dispatch Stock (Stock Out)
- **Endpoint**: `POST /inventory/dispatch-stock`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)
- **Body**:
```json
{
  "productId": "PROD-001",
  "numericQuantity": 50,
  "referenceNo": "INV-2026-1441"
}
```

---

### 💰 Sales Module (`/api/v1/sales`)

#### 1. List Sales Documents
- **Endpoint**: `GET /sales/documents`
- **Query Params**: `?type=quotation|sales_order|invoice|delivery_challan|payment&status=DRAFT|PENDING|APPROVED|PAID|UNPAID|DELIVERED|CANCELLED&search=SO-2026-1441&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`)

#### 2. Check Single-Invoice Generation Rule
- **Endpoint**: `GET /sales/check-invoice-exists?salesOrderNo=SO-2026-1441`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`)

#### 3. Get Sales Document by ID
- **Endpoint**: `GET /sales/documents/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`)

#### 4. Create Sales Document
- **Endpoint**: `POST /sales/documents`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)
- **Validation**: Enforces HTTP `422 Unprocessable Entity` if an invoice has already been generated for the referenced `salesOrderNo`.
- **Body**:
```json
{
  "refNo": "INV-2026-1441",
  "type": "invoice",
  "salesOrderNo": "SO-2026-1441",
  "poNumber": "PO-99420",
  "date": "2026-05-07",
  "status": "UNPAID",
  "customer": "Acme Corp Pvt Ltd",
  "customerId": "cust-101",
  "gstin": "07AAACA123411Z5",
  "placeOfSupply": "07 - Delhi",
  "items": [
    {
      "productId": "PROD-001",
      "sku": "IG-1200-BL",
      "description": "40 H.P. High Pressure Blower 2880 RPM 3700 CFM",
      "hsnSac": "84145930",
      "qty": 1,
      "unit": "Nos",
      "listPrice": 260000.00,
      "discRupees": 0.00,
      "taxPercent": 18.00
    }
  ],
  "subtotal": 260000.00,
  "taxTotal": 46800.00,
  "cgstAmount": 23400.00,
  "sgstAmount": 23400.00,
  "igstAmount": 0.00,
  "grandTotal": 306800.00
}
```

#### 5. Update Sales Document
- **Endpoint**: `PUT /sales/documents/:id`
- **Auth**: Bearer Token (`ADMIN`, `SALES_REP`, `ACCOUNTANT`)

#### 6. Delete Sales Document
- **Endpoint**: `DELETE /sales/documents/:id`
- **Auth**: Bearer Token (`ADMIN`)

---

### 🛒 Purchase Module (`/api/v1/purchase`)

#### 1. List Purchase Records
- **Endpoint**: `GET /purchase`
- **Query Params**: `?type=rfo|purchase_bill|purchased_machinery&status=UNPAID&search=Haas&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `PURCHASE_OFFICER`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`)

#### 2. Get Purchase Record by ID
- **Endpoint**: `GET /purchase/:id`
- **Auth**: Bearer Token (`ADMIN`, `PURCHASE_OFFICER`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`)

#### 3. Create Purchase Record
- **Endpoint**: `POST /purchase`
- **Auth**: Bearer Token (`ADMIN`, `PURCHASE_OFFICER`, `ACCOUNTANT`)
- **Body**:
```json
{
  "refNo": "RFO-2024-901",
  "type": "rfo",
  "vendor": "Apex Industrial Solutions",
  "vendorInvoiceNo": "VINV-99120",
  "requestDate": "2024-10-14",
  "dueDate": "2024-11-12",
  "numericAmount": 145000.00,
  "department": "Toolroom & Precision Machining",
  "priority": "HIGH",
  "status": "PENDING APPROVAL"
}
```

#### 4. Update Purchase Record
- **Endpoint**: `PUT /purchase/:id`
- **Auth**: Bearer Token (`ADMIN`, `PURCHASE_OFFICER`, `ACCOUNTANT`)

#### 5. Delete Purchase Record
- **Endpoint**: `DELETE /purchase/:id`
- **Auth**: Bearer Token (`ADMIN`)

---

### 📊 Finance & Tax Module (`/api/v1/finance`)

#### 1. Chart of Accounts & General Ledger
- **Endpoint**: `GET /finance/accounts`
- **Auth**: Bearer Token (`ADMIN`, `ACCOUNTANT`)

#### 2. List Financial Vouchers
- **Endpoint**: `GET /finance/vouchers`
- **Query Params**: `?type=JOURNAL|PAYMENT|RECEIPT&status=POSTED&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `ACCOUNTANT`)

#### 3. Post Financial Voucher
- **Endpoint**: `POST /finance/vouchers`
- **Auth**: Bearer Token (`ADMIN`, `ACCOUNTANT`)
- **Body**:
```json
{
  "voucherNo": "JV-2026-001",
  "type": "JOURNAL",
  "date": "2026-05-07",
  "amount": 45000.00,
  "debitAccount": "1010 - Cash & Bank Account",
  "creditAccount": "2010 - Accounts Payable",
  "narration": "Payment for Raw Material Purchase PB-2024-001"
}
```

#### 4. Aggregated Tax Summary (GST / ITC)
- **Endpoint**: `GET /finance/tax-summary`
- **Auth**: Bearer Token (`ADMIN`, `ACCOUNTANT`, `PURCHASE_OFFICER`)
- **Response**: Aggregated CGST, SGST, IGST liabilities and Input Tax Credit (ITC).

---

### 🏭 Manufacturing Module (`/api/v1/manufacturing`)

#### 1. List Bills of Materials (BOM)
- **Endpoint**: `GET /manufacturing/bom`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`, `PURCHASE_OFFICER`)

#### 2. Create Bill of Materials (BOM)
- **Endpoint**: `POST /manufacturing/bom`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)
- **Body**:
```json
{
  "bomNo": "BOM-2026-881",
  "productName": "40 H.P. High Pressure Blower 2880 RPM",
  "sku": "BLW-40HP-2880",
  "components": [
    {
      "rawMaterialName": "Raw High Pressure Blower Shell",
      "sku": "RM-8414-RAW",
      "qtyRequired": 1,
      "unitCost": 185000.00
    }
  ],
  "totalCost": 215000.00
}
```

#### 3. List Work Orders
- **Endpoint**: `GET /manufacturing/work-orders`
- **Query Params**: `?status=PLANNED|IN_PROGRESS|COMPLETED|CANCELLED&search=Blower&page=1&limit=20`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)

#### 4. Issue Work Order
- **Endpoint**: `POST /manufacturing/work-orders`
- **Auth**: Bearer Token (`ADMIN`, `WAREHOUSE_MANAGER`)
- **Body**:
```json
{
  "workOrderNo": "WO-2026-551",
  "productName": "40 H.P. High Pressure Blower 2880 RPM",
  "sku": "BLW-40HP-2880",
  "targetQty": 10,
  "startDate": "2026-06-01",
  "targetDate": "2026-06-15"
}
```

---

### 🗑️ Admin & System Trash (`/api/v1/admin`)

#### 1. View Soft-Deleted Trash
- **Endpoint**: `GET /admin/trash`
- **Auth**: Bearer Token (`ADMIN`)

#### 2. Restore Soft-Deleted Record
- **Endpoint**: `POST /admin/restore/:entityType/:id`
- **Auth**: Bearer Token (`ADMIN`)
- **Params**: `entityType` (`customer`, `sales_doc`, `purchase_record`, `user`, etc.), `id`
