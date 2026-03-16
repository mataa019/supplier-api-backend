# Minet Zambia Supplier Portal — Backend API Documentation

> Base URL: `https://api.yourdomain.com/api/v1`  
> Authentication: `Authorization: Bearer <accessToken>`  
> Content-Type: `application/json` unless stated as `multipart/form-data`  
> Roles: `supplier` | `admin` | `manager` | `viewer`

---

## Status / Type Values

| Domain | Values |
|--------|--------|
| Application | `draft`, `submitted`, `under_review`, `approved`, `rejected`, `withdrawn` |
| Payment | `pending`, `verified`, `rejected` |
| Supplier | `pending`, `active`, `suspended` |
| Admin User | `active`, `inactive` |
| Document | `pending`, `verified`, `rejected` |
| Payment Method | `bank_transfer`, `mobile_money`, `card` |
| Document Type | `business_registration`, `tax_certificate`, `bank_letter`, `insurance`, `other` |

---

## 1. System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Service health check |
| GET | `/version` | None | API version info |
| GET | `/meta/enums` | None | All enums (statuses, roles, types) |

---

## 2. Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new supplier |
| POST | `/auth/login` | None | Login |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | Any | Invalidate refresh token |
| POST | `/auth/forgot-password` | None | Send reset link to email |
| POST | `/auth/reset-password` | None | Reset password via token |
| PATCH | `/auth/change-password` | Any | Change own password |
| GET | `/auth/me` | Any | Get current user info |

### Body: POST `/auth/register`
```json
{
  "companyName": "string",
  "registeredNumber": "string",
  "tpin": "string",
  "phoneNumber": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

### Body: POST `/auth/login`
```json
{
  "email": "string",
  "password": "string"
}
```

### Body: POST `/auth/refresh`
```json
{
  "refreshToken": "string"
}
```

### Body: POST `/auth/logout`
```json
{
  "refreshToken": "string"
}
```

### Body: POST `/auth/forgot-password`
```json
{
  "email": "string"
}
```

### Body: POST `/auth/reset-password`
```json
{
  "token": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

### Body: PATCH `/auth/change-password`
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

---

## 3. Admin Users

> Role required: `admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List admin users |
| GET | `/admin/users/:userId` | Get single admin user |
| POST | `/admin/users` | Create admin user |
| PATCH | `/admin/users/:userId` | Update admin user |
| PATCH | `/admin/users/:userId/status` | Toggle status |
| DELETE | `/admin/users/:userId` | Delete admin user |

### Query: GET `/admin/users`
```
?role=admin|manager|viewer
&status=active|inactive
&search=string
&page=1
&limit=10
```

### Body: POST `/admin/users`
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "admin | manager | viewer",
  "department": "string",
  "status": "active | inactive"
}
```

### Body: PATCH `/admin/users/:userId`
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "string (optional)",
  "department": "string (optional)",
  "status": "string (optional)"
}
```

### Body: PATCH `/admin/users/:userId/status`
```json
{
  "status": "active | inactive"
}
```

---

## 4. Suppliers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/suppliers/me` | supplier | Get own profile |
| PATCH | `/suppliers/me` | supplier | Update own profile |
| GET | `/admin/suppliers` | admin/manager | List all suppliers |
| GET | `/admin/suppliers/:supplierId` | admin/manager | Get single supplier |
| GET | `/admin/suppliers/:supplierId/applications` | admin/manager | Supplier's applications |
| GET | `/admin/suppliers/:supplierId/payments` | admin/manager | Supplier's payments |
| PATCH | `/admin/suppliers/:supplierId/status` | admin | Update supplier status |
| DELETE | `/admin/suppliers/:supplierId` | admin | Delete supplier |

### Body: PATCH `/suppliers/me`
```json
{
  "companyName": "string (optional)",
  "registeredNumber": "string (optional)",
  "tpin": "string (optional)",
  "phoneNumber": "string (optional)",
  "contactPerson": "string (optional)",
  "address": "string (optional)",
  "email": "string (optional)"
}
```

### Query: GET `/admin/suppliers`
```
?status=pending|active|suspended
&categoryId=string
&search=string
&page=1
&limit=10
```

### Body: PATCH `/admin/suppliers/:supplierId/status`
```json
{
  "status": "pending | active | suspended",
  "reason": "string (optional)"
}
```

---

## 5. Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | Any | List active categories |
| GET | `/categories/:categoryId` | Any | Get category details |
| GET | `/suppliers/categories/:categoryId/form-template` | supplier | Get online form template (JSON schema) |
| GET | `/admin/suppliers/categories` | admin/manager | List categories |
| GET | `/admin/suppliers/categories/:categoryId` | admin/manager | Get category details |
| POST | `/admin/suppliers/categories` | admin | Create category |
| PATCH | `/admin/suppliers/categories/:categoryId` | admin | Update category |
| DELETE | `/admin/suppliers/categories/:categoryId` | admin | Delete category |
| POST | `/admin/suppliers/form-templates` | admin | Create a form template and optionally assign it to a category |
| GET | `/admin/suppliers/form-templates` | admin/manager | List available predefined templates |
| GET | `/admin/suppliers/form-templates/library` | admin/manager | List form templates from code library |
| PATCH | `/admin/suppliers/categories/:categoryId/template` | admin | Assign predefined template to category |
| DELETE | `/admin/suppliers/categories/:categoryId/template` | admin | Unassign template from category |

### Query: GET `/categories`
```
?status=active|inactive
&search=string
&page=1
&limit=10
```

### Body: POST `/admin/suppliers/categories`
```json
{
  "name": "string",
  "description": "string",
  "applicationFee": 2500,
  "status": "active | inactive",
  "templateId": "string (optional)",
  "documentTemplate": "string (optional)"
}
```

### Body: PATCH `/admin/suppliers/categories/:categoryId`
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "applicationFee": "number (optional)",
  "status": "active | inactive (optional)",
  "templateId": "string | null (optional)",
  "documentTemplate": "string | null (optional)"
}
```

### Body: POST `/admin/suppliers/form-templates`
```json
{
  "templateCode": "supplier_onboarding_v1 (optional)",
  "name": "Supplier Onboarding Form",
  "version": "1.0.0",
  "description": "Default supplier onboarding form",
  "categoryId": "string (optional)",
  "fields": [
    {
      "key": "businessNature",
      "label": "Nature of Business",
      "type": "text",
      "required": true,
      "placeholder": "Enter nature of business"
    },
    {
      "key": "companyType",
      "label": "Company Type",
      "type": "select",
      "required": true,
      "options": ["Local", "International", "Joint Venture"]
    }
  ]
}
```

> Note: `templateCode` can load a predefined field schema from `src/admin/form-template.data.ts`.

### Body: PATCH `/admin/suppliers/categories/:categoryId/template`
```json
{
  "templateId": "string"
}
```

### Response: GET `/suppliers/categories/:categoryId/form-template`
```json
{
  "categoryId": "string",
  "categoryName": "string",
  "template": {
    "id": "string",
    "name": "Supplier Onboarding Form",
    "version": "1.0.0",
    "fields": [
      {
        "key": "businessNature",
        "label": "Nature of Business",
        "type": "text",
        "required": true,
        "options": []
      }
    ]
  }
}
```

---

## 6. Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/applications` | supplier | Create application (draft) |
| GET | `/applications/me` | supplier | My applications |
| GET | `/applications/:applicationId` | supplier | Single application details |
| PATCH | `/applications/:applicationId` | supplier | Update draft |
| POST | `/applications/:applicationId/submit` | supplier | Submit application |
| POST | `/applications/:applicationId/withdraw` | supplier | Withdraw application |
| GET | `/applications/:applicationId/timeline` | supplier | Status history |
| GET | `/admin/applications` | admin/manager | List all applications |
| GET | `/admin/applications/:applicationId` | admin/manager | Single application (full) |
| PATCH | `/admin/applications/:applicationId/under-review` | admin/manager | Mark as under review |
| PATCH | `/admin/applications/:applicationId/approve` | admin/manager | Approve application |
| PATCH | `/admin/applications/:applicationId/reject` | admin/manager | Reject application |

### Body: POST `/applications`
```json
{
  "categoryId": "string",
  "templateId": "string",
  "responses": {
    "businessNature": "string"
  },
  "notes": "string (optional)"
}
```

### Body: PATCH `/applications/:applicationId`
```json
{
  "categoryId": "string (optional)",
  "responses": {
    "businessNature": "string (optional)"
  },
  "notes": "string (optional)"
}
```

### Body: POST `/applications/:applicationId/submit`
```json
{
  "declarationAccepted": true
}
```

### Body: POST `/applications/:applicationId/withdraw`
```json
{
  "reason": "string"
}
```

### Query: GET `/applications/me`
```
?status=draft|submitted|under_review|approved|rejected|withdrawn
&search=string
&page=1
&limit=10
```

### Query: GET `/admin/applications`
```
?status=draft|submitted|under_review|approved|rejected|withdrawn
&categoryId=string
&supplierId=string
&search=string
&page=1
&limit=10
```

### Body: PATCH `/admin/applications/:applicationId/approve`
```json
{
  "remarks": "string (optional)"
}
```

### Body: PATCH `/admin/applications/:applicationId/reject`
```json
{
  "remarks": "string (required)"
}
```

### Body: PATCH `/admin/applications/:applicationId/under-review`
```json
{
  "remarks": "string (optional)"
}
```

---

## 7. Application Notes (Internal)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/applications/:applicationId/notes` | admin/manager | List notes |
| POST | `/admin/applications/:applicationId/notes` | admin/manager | Add note |
| DELETE | `/admin/applications/:applicationId/notes/:noteId` | admin | Delete note |

### Body: POST `/admin/applications/:applicationId/notes`
```json
{
  "note": "string",
  "visibility": "internal | supplier"
}
```

---

## 8. Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/applications/:applicationId/documents` | supplier | Upload document |
| GET | `/applications/:applicationId/documents` | supplier | List documents |
| GET | `/documents/:documentId/download` | supplier/admin | Download file |
| DELETE | `/documents/:documentId` | supplier | Delete document |
| GET | `/admin/applications/:applicationId/documents` | admin/manager | View all docs |
| PATCH | `/admin/documents/:documentId/verify` | admin/manager | Verify or reject doc |

### Body: POST `/applications/:applicationId/documents`
```
Content-Type: multipart/form-data
form-data:
  type: business_registration | tax_certificate | bank_letter | insurance | other
  file: (binary)
  description: string (optional)
```

### Body: PATCH `/admin/documents/:documentId/verify`
```json
{
  "status": "verified | rejected",
  "remarks": "string (optional)"
}
```

---

## 9. Payment Instructions & Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payment-instructions` | Any | Get bank/mobile money details |
| PATCH | `/admin/payment-instructions` | admin | Update payment instructions |
| POST | `/applications/:applicationId/payment` | supplier | Submit payment proof |
| GET | `/applications/:applicationId/payment` | supplier | Get own payment status |
| GET | `/applications/:applicationId/payment/proof` | supplier | Download own proof file |
| GET | `/admin/payments` | admin/manager | List all payments |
| GET | `/admin/payments/:paymentId` | admin/manager | Payment details |
| GET | `/admin/payments/:paymentId/proof` | admin/manager | Download proof file |
| PATCH | `/admin/payments/:paymentId/verify` | admin/manager | Verify payment |
| PATCH | `/admin/payments/:paymentId/reject` | admin/manager | Reject payment |

### Body: PATCH `/admin/payment-instructions`
```json
{
  "bankName": "string",
  "accountName": "string",
  "accountNumber": "string",
  "branch": "string (optional)",
  "swiftCode": "string (optional)",
  "mobileMoneyName": "string (optional)",
  "mobileMoneyNumber": "string (optional)",
  "mobileMoneyProvider": "string (optional)",
  "notes": "string (optional)"
}
```

### Body: POST `/applications/:applicationId/payment`
```
Content-Type: multipart/form-data
form-data:
  amount: number
  currency: ZMW
  method: bank_transfer | mobile_money | card
  transactionRef: string
  paidAt: ISO date string
  proofFile: (binary)
```

### Query: GET `/admin/payments`
```
?status=pending|verified|rejected
&method=bank_transfer|mobile_money|card
&applicationId=string
&supplierId=string
&search=string
&page=1
&limit=10
```

### Body: PATCH `/admin/payments/:paymentId/verify`
```json
{
  "remarks": "string (optional)"
}
```

### Body: PATCH `/admin/payments/:paymentId/reject`
```json
{
  "remarks": "string (required)"
}
```

---

## 10. Admin Dashboard

> Role required: `admin` | `manager` | `viewer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Totals: suppliers, applications, payments |
| GET | `/admin/dashboard/recent-applications` | Latest submitted applications |
| GET | `/admin/dashboard/pending-payments` | Unverified payments |
| GET | `/admin/dashboard/category-breakdown` | Applications per category |
| GET | `/admin/dashboard/supplier-growth` | Supplier registration over time |

### Query: GET `/admin/dashboard/stats`
```
?from=2026-01-01
&to=2026-03-31
```

### Query: GET `/admin/dashboard/recent-applications`
```
?limit=5
```

### Query: GET `/admin/dashboard/pending-payments`
```
?limit=5
```

### Query: GET `/admin/dashboard/category-breakdown`
```
?from=2026-01-01
&to=2026-03-31
```

### Query: GET `/admin/dashboard/supplier-growth`
```
?from=2026-01-01
&to=2026-03-31
&interval=day|week|month
```

---

## 11. Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications/me` | Any | My notifications |
| PATCH | `/notifications/:notificationId/read` | Any | Mark as read |
| PATCH | `/notifications/read-all` | Any | Mark all as read |
| POST | `/admin/notifications/broadcast` | admin | Send to users/suppliers |

### Query: GET `/notifications/me`
```
?read=true|false
&page=1
&limit=20
```

### Body: PATCH `/notifications/:notificationId/read`
```json
{
  "read": true
}
```

### Body: POST `/admin/notifications/broadcast`
```json
{
  "title": "string",
  "message": "string",
  "targetRole": "supplier | admin | manager (optional, all if omitted)",
  "targetSupplierIds": ["string (optional)"],
  "channel": "in_app | email | both"
}
```

---

## 12. Audit Logs

> Role required: `admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/audit-logs` | List all audit logs |
| GET | `/admin/audit-logs/:logId` | Single audit log entry |

### Query: GET `/admin/audit-logs`
```
?actorId=string
&entityType=user|supplier|application|payment|document|category
&entityId=string
&action=create|update|delete|approve|reject|verify|login|logout
&from=ISO date
&to=ISO date
&page=1
&limit=20
```

---

## 13. Reports / Export

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/reports/applications` | admin/manager | Export applications |
| GET | `/admin/reports/payments` | admin/manager | Export payments |
| GET | `/admin/reports/suppliers` | admin/manager | Export suppliers |

### Query: GET `/admin/reports/applications`
```
?status=string
&from=ISO date
&to=ISO date
&categoryId=string
&format=csv|xlsx
```

### Query: GET `/admin/reports/payments`
```
?status=string
&from=ISO date
&to=ISO date
&method=string
&format=csv|xlsx
```

### Query: GET `/admin/reports/suppliers`
```
?status=string
&from=ISO date
&to=ISO date
&format=csv|xlsx
```

---

## 14. Settings & Master Data

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/settings` | admin | Get portal settings |
| PATCH | `/admin/settings` | admin | Update portal settings |
| GET | `/admin/master-data/document-types` | admin | List document types |
| POST | `/admin/master-data/document-types` | admin | Add document type |
| PATCH | `/admin/master-data/document-types/:id` | admin | Update document type |
| DELETE | `/admin/master-data/document-types/:id` | admin | Delete document type |

### Body: PATCH `/admin/settings`
```json
{
  "applicationYearOpen": "string (e.g. 2026)",
  "applicationYearClose": "string (e.g. 2027)",
  "allowNewRegistrations": true,
  "maxFileSizeMb": 10,
  "allowedFileTypes": ["pdf", "docx", "jpg", "png"]
}
```

### Body: POST `/admin/master-data/document-types`
```json
{
  "code": "string",
  "name": "string",
  "required": true,
  "appliesToCategoryIds": ["string (optional)"]
}
```

### Body: PATCH `/admin/master-data/document-types/:id`
```json
{
  "name": "string (optional)",
  "required": "boolean (optional)",
  "appliesToCategoryIds": ["string (optional)"]
}
```

---

## 15. Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/categories` | Active categories list |
| GET | `/public/settings/registration-window` | Is registration open |
| GET | `/public/payment-instructions` | Bank/mobile payment details |
