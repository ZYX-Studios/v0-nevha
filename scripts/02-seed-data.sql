-- Seed data for HOA PWA development and testing
-- This script populates the database with realistic test data

-- Insert test users (passwords are hashed in real implementation)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@oakwoodcommons.com', '$2b$10$hash1', 'Sarah', 'Johnson', '555-0101', 'admin', true),
('550e8400-e29b-41d4-a716-446655440002', 'staff@oakwoodcommons.com', '$2b$10$hash2', 'Mike', 'Chen', '555-0102', 'staff', true),
('550e8400-e29b-41d4-a716-446655440003', 'john.doe@email.com', '$2b$10$hash3', 'John', 'Doe', '555-0103', 'homeowner', true),
('550e8400-e29b-41d4-a716-446655440004', 'jane.smith@email.com', '$2b$10$hash4', 'Jane', 'Smith', '555-0104', 'homeowner', true),
('550e8400-e29b-41d4-a716-446655440005', 'bob.wilson@email.com', '$2b$10$hash5', 'Bob', 'Wilson', '555-0105', 'homeowner', true),
('550e8400-e29b-41d4-a716-446655440006', 'alice.brown@email.com', '$2b$10$hash6', 'Alice', 'Brown', '555-0106', 'homeowner', true),
('550e8400-e29b-41d4-a716-446655440007', 'david.garcia@email.com', '$2b$10$hash7', 'David', 'Garcia', '555-0107', 'homeowner', true),
('550e8400-e29b-41d4-a716-446655440008', 'lisa.martinez@email.com', '$2b$10$hash8', 'Lisa', 'Martinez', '555-0108', 'homeowner', true);

-- Insert homeowner records
INSERT INTO homeowners (id, user_id, property_address, unit_number, move_in_date, is_owner, emergency_contact_name, emergency_contact_phone, notes) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '123 Oak Street', 'A1', '2023-06-15', true, 'Mary Doe', '555-0203', 'Prefers email communication'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '456 Pine Avenue', 'B2', '2023-08-01', true, 'Bob Smith', '555-0204', 'Has two cats'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '789 Maple Drive', 'C3', '2022-12-10', true, 'Carol Wilson', '555-0205', 'Board member'),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', '321 Elm Court', 'D4', '2024-01-20', false, 'Tom Brown', '555-0206', 'Renter - lease expires Dec 2024'),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '654 Birch Lane', 'E5', '2023-03-15', true, 'Maria Garcia', '555-0207', 'Has home office'),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440008', '987 Cedar Way', 'F6', '2023-11-05', true, 'Carlos Martinez', '555-0208', 'New resident');

-- Insert car stickers
INSERT INTO car_stickers (id, homeowner_id, sticker_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate, issue_date, expiry_date, is_active) VALUES
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'HOA001', 'Toyota', 'Camry', 2022, 'Blue', 'ABC123', '2024-01-15', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'HOA002', 'Honda', 'CR-V', 2021, 'Silver', 'DEF456', '2024-01-15', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 'HOA003', 'Ford', 'F-150', 2023, 'Red', 'GHI789', '2024-01-20', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440003', 'HOA004', 'Chevrolet', 'Malibu', 2020, 'White', 'JKL012', '2024-02-01', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440004', 'HOA005', 'Nissan', 'Altima', 2022, 'Black', 'MNO345', '2024-02-10', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440005', 'HOA006', 'Subaru', 'Outback', 2023, 'Green', 'PQR678', '2024-02-15', '2024-12-31', true),
('750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440006', 'HOA007', 'Mazda', 'CX-5', 2021, 'Gray', 'STU901', '2024-03-01', '2024-12-31', true);

-- Insert announcements
INSERT INTO announcements (id, title, content, author_id, priority, is_published, publish_date, expiry_date) VALUES
('850e8400-e29b-41d4-a716-446655440001', 'Welcome to Spring 2024!', 'As we welcome the spring season, we want to remind all residents about our community guidelines for landscaping and outdoor activities. Please ensure your gardens are well-maintained and any outdoor furniture is properly secured.', '550e8400-e29b-41d4-a716-446655440001', 'normal', true, '2024-03-01 09:00:00+00', '2024-05-31 23:59:59+00'),

('850e8400-e29b-41d4-a716-446655440002', 'Pool Maintenance Schedule', 'The community pool will be closed for routine maintenance and cleaning from March 15-17, 2024. We apologize for any inconvenience and appreciate your patience as we ensure the pool is safe and clean for the upcoming season.', '550e8400-e29b-41d4-a716-446655440001', 'high', true, '2024-03-01 10:00:00+00', '2024-03-20 23:59:59+00'),

('850e8400-e29b-41d4-a716-446655440003', 'Annual HOA Meeting - April 10th', 'Join us for our annual HOA meeting on Wednesday, April 10th at 7:00 PM in the community center. We will discuss the 2024 budget, upcoming projects, and address any community concerns. Light refreshments will be provided. Your participation is important!', '550e8400-e29b-41d4-a716-446655440001', 'high', true, '2024-03-10 08:00:00+00', '2024-04-11 00:00:00+00'),

('850e8400-e29b-41d4-a716-446655440004', 'Parking Reminder', 'Please remember to display your current parking stickers on all vehicles parked in community areas. Vehicles without valid stickers may be subject to towing at the owner''s expense. Contact the office if you need replacement stickers.', '550e8400-e29b-41d4-a716-446655440002', 'normal', true, '2024-02-15 08:00:00+00', NULL),

('850e8400-e29b-41d4-a716-446655440005', 'Community Garden Project', 'We are excited to announce the launch of our community garden project! Interested residents can sign up for garden plots starting April 1st. The garden will be located behind the community center. More details to follow.', '550e8400-e29b-41d4-a716-446655440001', 'normal', true, '2024-03-20 12:00:00+00', NULL),

('850e8400-e29b-41d4-a716-446655440006', 'Emergency Contact Update Required', 'All residents must update their emergency contact information by March 31st, 2024. Please log into your account or contact the office to ensure we have current information on file for safety purposes.', '550e8400-e29b-41d4-a716-446655440001', 'urgent', true, '2024-03-05 09:00:00+00', '2024-03-31 23:59:59+00'),

('850e8400-e29b-41d4-a716-446655440007', 'Upcoming Board Election', 'The HOA board election will be held in May 2024. Nominations are now open for board positions. If you are interested in serving your community, please submit your nomination by April 15th.', '550e8400-e29b-41d4-a716-446655440002', 'normal', false, '2024-04-01 09:00:00+00', NULL);

-- Insert issues
INSERT INTO issues (id, reporter_id, title, description, category, priority, status, location, assigned_to, resolution_notes, resolved_at) VALUES
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Broken Streetlight', 'The streetlight near building A entrance is flickering intermittently and sometimes goes completely dark. This creates a safety concern for residents walking at night.', 'Maintenance', 'high', 'in_progress', 'Near Building A entrance', '550e8400-e29b-41d4-a716-446655440002', NULL, NULL),

('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Noise Complaint', 'There has been loud music and parties from unit C3 during late hours (after 10 PM) on multiple weekends. This is disturbing other residents and violates community quiet hours.', 'Noise', 'normal', 'resolved', 'Building C, Unit 3', '550e8400-e29b-41d4-a716-446655440001', 'Spoke with resident about quiet hours policy. They agreed to keep noise levels down after 10 PM. Will monitor for compliance.', '2024-03-08 16:30:00+00'),

('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'Leaky Faucet in Community Center', 'The kitchen faucet in the community center has been leaking for several days. Water is pooling on the counter and floor, which could cause damage or create a slip hazard.', 'Plumbing', 'normal', 'resolved', 'Community Center Kitchen', '550e8400-e29b-41d4-a716-446655440002', 'Plumber replaced the faucet cartridge and tightened all connections. Leak has been resolved and area cleaned.', '2024-03-02 14:15:00+00'),

('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'Damaged Playground Equipment', 'The swing set in the playground has a broken chain on one of the swings. This is a safety hazard for children and needs immediate attention.', 'Maintenance', 'urgent', 'open', 'Community Playground', NULL, NULL, NULL),

('950e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', 'Trash Bin Overflow', 'The trash bins near building D are consistently overflowing, especially on weekends. This attracts pests and creates an unsanitary condition.', 'Trash/Recycling', 'normal', 'open', 'Near Building D', NULL, NULL, NULL),

('950e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440008', 'Pool Gate Not Locking', 'The automatic lock on the pool gate is not engaging properly. The gate can be opened without using the access code, which is a security concern.', 'Security', 'high', 'in_progress', 'Community Pool Gate', '550e8400-e29b-41d4-a716-446655440002', NULL, NULL),

('950e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'Pothole in Parking Lot', 'There is a large pothole in the main parking lot near spaces 15-20. It has gotten worse with recent rain and could damage vehicles.', 'Maintenance', 'normal', 'open', 'Main Parking Lot, Spaces 15-20', NULL, NULL, NULL),

('950e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004', 'Landscaping Overgrowth', 'The bushes and trees along the main walkway have grown too large and are blocking the path. Some branches are hanging low and could hit people walking by.', 'Landscaping', 'low', 'open', 'Main Walkway near Mailboxes', NULL, NULL, NULL);

-- Update timestamps to be more recent
UPDATE announcements SET created_at = NOW() - INTERVAL '30 days' + (RANDOM() * INTERVAL '25 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440001';
UPDATE announcements SET created_at = NOW() - INTERVAL '20 days' + (RANDOM() * INTERVAL '15 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440002';
UPDATE announcements SET created_at = NOW() - INTERVAL '15 days' + (RANDOM() * INTERVAL '10 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440003';
UPDATE announcements SET created_at = NOW() - INTERVAL '45 days' + (RANDOM() * INTERVAL '10 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440004';
UPDATE announcements SET created_at = NOW() - INTERVAL '5 days' + (RANDOM() * INTERVAL '3 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440005';
UPDATE announcements SET created_at = NOW() - INTERVAL '10 days' + (RANDOM() * INTERVAL '5 days'), updated_at = created_at WHERE id = '850e8400-e29b-41d4-a716-446655440006';

UPDATE issues SET created_at = NOW() - INTERVAL '7 days' + (RANDOM() * INTERVAL '3 days'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440001';
UPDATE issues SET created_at = NOW() - INTERVAL '12 days' + (RANDOM() * INTERVAL '5 days'), updated_at = NOW() - INTERVAL '4 days' WHERE id = '950e8400-e29b-41d4-a716-446655440002';
UPDATE issues SET created_at = NOW() - INTERVAL '15 days' + (RANDOM() * INTERVAL '5 days'), updated_at = NOW() - INTERVAL '13 days' WHERE id = '950e8400-e29b-41d4-a716-446655440003';
UPDATE issues SET created_at = NOW() - INTERVAL '2 days' + (RANDOM() * INTERVAL '1 day'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440004';
UPDATE issues SET created_at = NOW() - INTERVAL '5 days' + (RANDOM() * INTERVAL '2 days'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440005';
UPDATE issues SET created_at = NOW() - INTERVAL '3 days' + (RANDOM() * INTERVAL '1 day'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440006';
UPDATE issues SET created_at = NOW() - INTERVAL '8 days' + (RANDOM() * INTERVAL '3 days'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440007';
UPDATE issues SET created_at = NOW() - INTERVAL '6 days' + (RANDOM() * INTERVAL '2 days'), updated_at = created_at WHERE id = '950e8400-e29b-41d4-a716-446655440008';
