-- Migration to add caddies_about to clubs and views to caddies

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS caddies_about text;
ALTER TABLE public.caddies ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
