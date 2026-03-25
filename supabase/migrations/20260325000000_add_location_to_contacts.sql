-- Add location field to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location text;
