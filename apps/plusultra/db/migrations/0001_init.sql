PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 1,

  name TEXT NOT NULL,
  birth_date TEXT NOT NULL, -- YYYY-MM-DD
  sex TEXT NOT NULL DEFAULT 'male', -- male|female
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,

  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  activity_factor REAL NOT NULL DEFAULT 1.55,

  goal_current TEXT,
  modality TEXT,
  diet_preference TEXT,

  training_split TEXT,
  training_time TEXT,
  training_rest TEXT,
  training_cadence TEXT,

  plan_type TEXT NOT NULL DEFAULT 'monthly', -- monthly|quarterly|semiannual
  plan_start_date TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  next_consultation_date TEXT,

  is_online INTEGER NOT NULL DEFAULT 1,

  diseases_active TEXT,
  diseases_previous TEXT,
  meds_current TEXT,
  supplements_current TEXT,
  notes_extra TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,

  focus TEXT,
  methodology TEXT,

  valid_until TEXT NOT NULL, -- YYYY-MM-DD
  next_feedback_date TEXT NOT NULL,
  next_consultation_date TEXT NOT NULL,

  objective_md TEXT,
  nutrition_observations_md TEXT,
  training_aerobics_md TEXT,
  training_observations_md TEXT,

  status TEXT NOT NULL DEFAULT 'active', -- active|archived

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id)
);

CREATE TABLE IF NOT EXISTS meal_options (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES meals(id)
);

CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  kcal_per_100 REAL NOT NULL,
  protein_g_per_100 REAL NOT NULL,
  carbs_g_per_100 REAL NOT NULL,
  fat_g_per_100 REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_items (
  id TEXT PRIMARY KEY,
  option_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  food_id TEXT NOT NULL,
  qty REAL NOT NULL, -- grams
  notes TEXT,
  FOREIGN KEY (option_id) REFERENCES meal_options(id),
  FOREIGN KEY (food_id) REFERENCES foods(id)
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id)
);

CREATE TABLE IF NOT EXISTS workout_items (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  sets TEXT,
  reps TEXT,
  load TEXT,
  rest TEXT,
  cadence TEXT,
  notes TEXT,
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS billing_items (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  due_date TEXT NOT NULL, -- YYYY-MM-DD
  paid_at TEXT,
  status TEXT NOT NULL DEFAULT 'due', -- due|paid|void
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'local', -- local|google
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  keywords TEXT NOT NULL,
  answer_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  matched_faq_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (matched_faq_id) REFERENCES faq_entries(id)
);

CREATE TABLE IF NOT EXISTS message_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- whatsapp
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed
  scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);
CREATE INDEX IF NOT EXISTS idx_protocols_patient ON protocols(patient_id);
CREATE INDEX IF NOT EXISTS idx_protocols_feedback ON protocols(next_feedback_date);
CREATE INDEX IF NOT EXISTS idx_billing_due ON billing_items(due_date, status);
