-- ============================================
-- HOTSHOT FABRICS - Home Announcements Table
-- For admin-managed news/announcements on home
-- ============================================

CREATE TABLE IF NOT EXISTS home_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  badge TEXT DEFAULT 'New',
  bg_color TEXT DEFAULT 'bg-orange-500/10',
  text_color TEXT DEFAULT 'text-orange-400',
  border_color TEXT DEFAULT 'border-orange-500/20',
  link_url TEXT,
  link_text TEXT DEFAULT 'Learn More',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE home_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can read active announcements" ON home_announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage announcements" ON home_announcements
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  ));

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_home_announcements_updated_at
  BEFORE UPDATE ON home_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed a default welcome announcement
INSERT INTO home_announcements (title, content, badge, sort_order, is_active)
VALUES (
  'Welcome to Hotshot Fabrics!',
  'Discover premium South African fashion. Quality fabrics, bold designs, and unbeatable style. Free shipping on orders over R1,500.',
  'Welcome',
  0,
  true
)
ON CONFLICT DO NOTHING;
