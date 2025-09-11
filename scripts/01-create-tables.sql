-- HOA PWA Database Schema
-- Creates all necessary tables for the Homeowners Association application

-- Users table for authentication and basic user info
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'homeowner' CHECK (role IN ('homeowner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homeowners table for property-specific information
CREATE TABLE IF NOT EXISTS homeowners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_address VARCHAR(255) NOT NULL,
  unit_number VARCHAR(20),
  move_in_date DATE,
  is_owner BOOLEAN DEFAULT true,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Car stickers table for vehicle management
CREATE TABLE IF NOT EXISTS car_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES homeowners(id) ON DELETE CASCADE,
  sticker_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_make VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  vehicle_color VARCHAR(30),
  license_plate VARCHAR(20),
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table for community communications
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published BOOLEAN DEFAULT false,
  publish_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues table for maintenance and community issue reporting
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  location VARCHAR(255),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issue attachments table for photos and documents
CREATE TABLE IF NOT EXISTS issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_homeowners_user_id ON homeowners(user_id);
CREATE INDEX IF NOT EXISTS idx_car_stickers_homeowner_id ON car_stickers(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_car_stickers_number ON car_stickers(sticker_number);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, publish_date);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments(issue_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for homeowners table
CREATE POLICY "Homeowners can view their own data" ON homeowners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Homeowners can update their own data" ON homeowners
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all homeowner data" ON homeowners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for car_stickers table
CREATE POLICY "Homeowners can view their own car stickers" ON car_stickers
  FOR SELECT USING (
    homeowner_id IN (
      SELECT id FROM homeowners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can manage their own car stickers" ON car_stickers
  FOR ALL USING (
    homeowner_id IN (
      SELECT id FROM homeowners WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for announcements table
CREATE POLICY "Everyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = true AND publish_date <= NOW());

CREATE POLICY "Admins can manage all announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for issues table
CREATE POLICY "Users can view their own issues" ON issues
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create issues" ON issues
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update their own issues" ON issues
  FOR UPDATE USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view and manage all issues" ON issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies for issue_attachments table
CREATE POLICY "Users can view attachments for their issues" ON issue_attachments
  FOR SELECT USING (
    issue_id IN (
      SELECT id FROM issues WHERE reporter_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to their issues" ON issue_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    issue_id IN (
      SELECT id FROM issues WHERE reporter_id = auth.uid()
    )
  );
