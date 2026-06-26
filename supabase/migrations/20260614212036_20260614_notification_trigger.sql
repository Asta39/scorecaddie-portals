-- Create a trigger function that calls the edge function via pg_net when a new club post is added
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_club_members()
RETURNS TRIGGER AS $$
BEGIN
  -- We only want to notify if the post is inserted
  IF TG_OP = 'INSERT' THEN
    -- Construct the JSON payload for the edge function
    -- We assume the edge function will handle authentication and authorization.
    -- However, since pg_net runs on the DB layer, we can bypass Auth and use anon/service role or handle it in the function.
    -- To keep it simple, we use pg_net.http_post
    PERFORM net.http_post(
        url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-club-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
            'club_id', NEW.club_id,
            'title', NEW.title,
            'message', left(NEW.content, 100) || CASE WHEN length(NEW.content) > 100 THEN '...' ELSE '' END,
            'post_type', NEW.post_type
        )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_club_members ON club_posts;
CREATE TRIGGER trigger_notify_club_members
  AFTER INSERT ON club_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_club_members();
