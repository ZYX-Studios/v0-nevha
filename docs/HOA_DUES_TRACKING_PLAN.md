# HOA Dues Tracking Implementation Plan

## Overview
Implement a comprehensive system to track annual HOA dues payments and determine members in good standing.

## Database Schema Design

### Option 1: Dedicated HOA Dues Table (Recommended)

#### New Table: `hoa_dues`
```sql
CREATE TABLE hoa_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  dues_year integer NOT NULL,
  annual_amount numeric(12,2) NOT NULL,
  amount_paid numeric(12,2) DEFAULT 0,
  payment_date date,
  payment_method varchar(50), -- 'cash', 'check', 'bank_transfer', 'online', etc.
  receipt_number varchar(100),
  is_paid_in_full boolean GENERATED ALWAYS AS (amount_paid >= annual_amount) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(homeowner_id, dues_year),
  CHECK (dues_year >= 2024),
  CHECK (annual_amount > 0),
  CHECK (amount_paid >= 0)
);

-- Indexes
CREATE INDEX idx_hoa_dues_homeowner_year ON hoa_dues(homeowner_id, dues_year);
CREATE INDEX idx_hoa_dues_year_paid ON hoa_dues(dues_year, is_paid_in_full);
CREATE INDEX idx_hoa_dues_payment_date ON hoa_dues(payment_date);
```

#### New Table: `hoa_dues_config`
```sql
CREATE TABLE hoa_dues_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dues_year integer NOT NULL UNIQUE,
  annual_amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  late_fee_amount numeric(12,2) DEFAULT 0,
  late_fee_grace_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CHECK (dues_year >= 2024),
  CHECK (annual_amount > 0)
);

-- Insert current year config
INSERT INTO hoa_dues_config (dues_year, annual_amount, due_date) 
VALUES (2025, 1200.00, '2025-03-31');
```

### Database Functions

#### Function: Get Good Standing Status
```sql
CREATE OR REPLACE FUNCTION get_good_standing_status(
  p_homeowner_id uuid,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM hoa_dues 
    WHERE homeowner_id = p_homeowner_id 
      AND dues_year = p_year 
      AND is_paid_in_full = true
  );
END;
$$;
```

#### Function: Get Homeowners with Dues Status
```sql
CREATE OR REPLACE FUNCTION get_homeowners_with_dues_status(
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE (
  homeowner_id uuid,
  first_name varchar,
  last_name varchar,
  property_address varchar,
  block varchar,
  lot varchar,
  phase varchar,
  annual_amount numeric,
  amount_paid numeric,
  is_paid_in_full boolean,
  payment_date date,
  is_good_standing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.first_name,
    h.last_name,
    h.property_address,
    h.block,
    h.lot,
    h.phase,
    COALESCE(hd.annual_amount, hdc.annual_amount) as annual_amount,
    COALESCE(hd.amount_paid, 0) as amount_paid,
    COALESCE(hd.is_paid_in_full, false) as is_paid_in_full,
    hd.payment_date,
    COALESCE(hd.is_paid_in_full, false) as is_good_standing
  FROM homeowners h
  LEFT JOIN hoa_dues hd ON h.id = hd.homeowner_id AND hd.dues_year = p_year
  LEFT JOIN hoa_dues_config hdc ON hdc.dues_year = p_year AND hdc.is_active = true
  ORDER BY h.last_name, h.first_name;
END;
$$;
```

## Migration Strategy

### Phase 1: Create New Tables
1. Create `hoa_dues` and `hoa_dues_config` tables
2. Set up indexes and constraints
3. Create database functions

### Phase 2: Migrate Existing Data
1. Migrate existing `date_paid` and `amount_paid` from homeowners table to hoa_dues for 2025
2. Set up default annual amount for 2025

### Phase 3: Admin Interface
1. Dues management dashboard
2. Payment recording interface
3. Good standing reports
4. Bulk operations (import/export)

### Phase 4: Integration
1. Update homeowner search/filter to include dues status
2. Add dues status to homeowner detail pages
3. Create dues collection workflows

## API Endpoints

### Admin Endpoints
- `GET /api/admin/dues/config` - Get dues configuration
- `POST /api/admin/dues/config` - Create/update dues config
- `GET /api/admin/dues/{year}` - Get all dues for a year
- `POST /api/admin/dues/payment` - Record payment
- `PUT /api/admin/dues/{id}` - Update dues record
- `GET /api/admin/dues/reports/good-standing` - Good standing report

### Homeowner Endpoints
- `GET /api/homeowners/{id}/dues` - Get dues history
- `GET /api/homeowners/{id}/dues/status` - Get current dues status

## Admin UI Components

### 1. Dues Dashboard
- Overview of collection rates
- Good standing statistics
- Outstanding payments list
- Payment trends

### 2. Payment Recording
- Search homeowner
- Record payment amount
- Payment method selection
- Receipt number tracking
- Partial payment support

### 3. Dues Configuration
- Set annual amounts
- Configure due dates
- Late fee management

### 4. Reports
- Good standing members list
- Outstanding dues report
- Payment history
- Collection analytics

## Implementation Priority

1. **High Priority**
   - Create database tables and functions
   - Migrate existing payment data
   - Basic payment recording interface

2. **Medium Priority**
   - Good standing filtering in homeowner lists
   - Dues dashboard
   - Payment reports

3. **Low Priority**
   - Advanced analytics
   - Automated reminders
   - Online payment integration

## Data Validation Rules

1. **Payment Amount**: Cannot exceed annual amount + late fees
2. **Dues Year**: Must be current year or future years
3. **Payment Date**: Cannot be in the future
4. **Good Standing**: Automatically calculated based on full payment

## Security Considerations

1. **RLS Policies**: Restrict dues data to admin/staff roles
2. **Audit Trail**: Track all payment modifications
3. **Data Privacy**: Sensitive financial information protection

## Future Enhancements

1. **Automated Reminders**: Email notifications for overdue payments
2. **Online Payments**: Integration with payment gateways
3. **Late Fee Calculation**: Automatic late fee application
4. **Payment Plans**: Support for installment payments
5. **Mobile App**: Homeowner self-service portal
