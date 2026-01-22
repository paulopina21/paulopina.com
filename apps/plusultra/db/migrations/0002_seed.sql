INSERT INTO foods (id, name, kcal_per_100, protein_g_per_100, carbs_g_per_100, fat_g_per_100) VALUES
  ('food_chicken_breast', 'Chicken breast (cooked)', 165, 31, 0, 3.6),
  ('food_rice_white', 'White rice (cooked)', 130, 2.7, 28.0, 0.3),
  ('food_oats', 'Oats', 389, 16.9, 66.3, 6.9),
  ('food_egg_whole', 'Whole egg', 143, 13, 1.1, 9.5),
  ('food_salmon', 'Salmon', 208, 20, 0, 13);

INSERT INTO exercises (id, name, video_url) VALUES
  ('ex_squat', 'Back squat', null),
  ('ex_bench', 'Bench press', null),
  ('ex_deadlift', 'Deadlift', null),
  ('ex_row', 'Barbell row', null);

INSERT INTO faq_entries (id, title, keywords, answer_md) VALUES
  ('faq_squat', 'Como executar o agachamento', 'agachamento,squat', '1) Pes firmes no chao\n2) Coluna neutra\n3) Desca controlando\n4) Suba mantendo joelhos alinhados.'),
  ('faq_rest', 'Tempo de descanso', 'descanso,intervalo', 'Regra geral: 60-120s para hipertrofia; 2-4min para forca. Ajuste conforme o protocolo.');
