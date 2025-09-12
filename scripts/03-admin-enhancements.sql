-- Admin Interface Enhancements
-- Adds household members, departments, and enhanced issue tracking

-- Household members table for managing family members per homeowner
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES homeowners(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50), -- spouse, child, parent, tenant, etc.
  phone VARCHAR(20),
  email VARCHAR(255),
  date_of_birth DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table for issue assignment and email routing
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issue comments table for department communication and tracking
CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- internal comments vs public updates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issue department assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS issue_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false, -- one department can be primary responsible
  UNIQUE(issue_id, department_id)
);

-- Add department tracking to existing issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS reference_code VARCHAR(20) UNIQUE;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS estimated_completion DATE;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS actual_completion DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_members_homeowner_id ON household_members(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_household_members_active ON household_members(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_author ON issue_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_issue_departments_issue_id ON issue_departments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_departments_department_id ON issue_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_reference_code ON issues(reference_code);

-- Enable RLS for new tables
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for household_members
CREATE POLICY "Homeowners can view their household members" ON household_members
  FOR SELECT USING (
    homeowner_id IN (
      SELECT id FROM homeowners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can manage their household members" ON household_members
  FOR ALL USING (
    homeowner_id IN (
      SELECT id FROM homeowners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all household members" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admins can manage all household members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for departments
CREATE POLICY "Everyone can view active departments" ON departments
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for issue_comments
CREATE POLICY "Users can view comments on their issues" ON issue_comments
  FOR SELECT USING (
    issue_id IN (
      SELECT id FROM issues WHERE reporter_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can add comments to issues" ON issue_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for issue_departments
CREATE POLICY "Staff can view issue department assignments" ON issue_departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can manage issue department assignments" ON issue_departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- Insert default departments
INSERT INTO departments (name, description, email) VALUES
  ('Maintenance', 'Property maintenance and repairs', 'maintenance@hoa.local'),
  ('Security', 'Security and safety concerns', 'security@hoa.local'),
  ('Landscaping', 'Grounds and landscaping issues', 'landscaping@hoa.local'),
  ('Administration', 'Administrative and general inquiries', 'admin@hoa.local'),
  ('Finance', 'Billing and financial matters', 'finance@hoa.local')
ON CONFLICT (name) DO NOTHING;

-- Function to generate reference codes for issues
CREATE OR REPLACE FUNCTION generate_issue_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := 'ISS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('issue_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for reference codes
CREATE SEQUENCE IF NOT EXISTS issue_ref_seq START 1000;

-- Create trigger to auto-generate reference codes
DROP TRIGGER IF EXISTS trigger_generate_issue_reference ON issues;
CREATE TRIGGER trigger_generate_issue_reference
  BEFORE INSERT ON issues
  FOR EACH ROW
  EXECUTE FUNCTION generate_issue_reference_code();
