insert into public.bosses (id, name, hp, time_limit_secs, xp_reward, difficulty, required_level, is_free) values
  ('goblin', 'DRAKE', 20, 180, 100, 'easy', 1, true),
  ('orc',    'LIZARD',    35, 240, 200, 'medium', 3, true),
  ('troll',  'DEMON',  50, 300, 350, 'hard', 5, false),
  ('jinn',   'DJINN',  45, 240, 300, 'medium', 4, true),
  ('medusa', 'MEDUSA', 65, 360, 450, 'hard', 6, false),
  ('titan',  'DRAGON',  80, 420, 600, 'boss', 8, false),
  ('demon_slime', 'DEMON SLIME', 100, 480, 800, 'boss', 10, false);
