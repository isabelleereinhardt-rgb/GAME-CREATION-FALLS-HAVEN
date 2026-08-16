-- ============================================================================
-- Wisp · Optional seed: the house tag vocabulary with one-line descriptions.
-- Run in the Supabase SQL Editor after schema.sql. Safe to re-run.
-- ============================================================================

insert into public.tags (name, kind, description) values
  ('Slow Burn',          'house', 'A romance that develops gradually over many chapters.'),
  ('Enemies to Lovers',  'house', 'Characters who start as adversaries and fall for each other.'),
  ('Found Family',       'house', 'Characters who become a family by choice.'),
  ('Hurt/Comfort',       'house', 'One character is hurt; another provides comfort.'),
  ('Fluff',              'house', 'Light, warm, low-conflict content.'),
  ('Angst',              'house', 'Emotional hardship and distress.'),
  ('Case Fic',           'house', 'A mystery or case to solve drives the plot.'),
  ('Fake Dating',        'house', 'Characters pretend to be a couple.'),
  ('Mutual Pining',      'house', 'Two characters long for each other, each unaware it is mutual.'),
  ('Found Family',       'house', 'A group who become family by choice.'),
  ('No Romance',         'house', 'Contains no central romance.'),
  ('Rivals',             'house', 'Characters in ongoing competition.'),
  ('Coming of Age',      'house', 'A character grows up over the course of the story.'),
  ('Period Piece',       'house', 'Set in a specific historical era.')
on conflict (name) do nothing;
