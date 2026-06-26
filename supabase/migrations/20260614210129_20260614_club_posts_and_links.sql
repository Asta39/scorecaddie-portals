-- Link clubs to Course (assuming Course exists and id is TEXT/UUID)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS course_id TEXT;

-- Club Posts Table
CREATE TABLE IF NOT EXISTS club_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'announcement', -- announcement, fixture, notice, result
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notification Log to prevent duplicates
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL, -- The ID of the post, competition, etc.
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for club_posts
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view club posts" ON club_posts;
CREATE POLICY "Anyone can view club posts"
  ON club_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Club admins can insert club posts" ON club_posts;
CREATE POLICY "Club admins can insert club posts"
  ON club_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id = club_id
      AND c.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Club admins can update their posts" ON club_posts;
CREATE POLICY "Club admins can update their posts"
  ON club_posts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id = club_id
      AND c.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Club admins can delete their posts" ON club_posts;
CREATE POLICY "Club admins can delete their posts"
  ON club_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id = club_id
      AND c.owner_id = auth.uid()
  ));
