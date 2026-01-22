import { addDays, calcBmi, calcBmr, calcTdee, diffYears, json, parseJson, uid } from "./utils";

export interface Env {
  DB: D1Database;
  APP_NAME: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(init: ResponseInit = {}) {
  return { ...init, headers: { ...corsHeaders, ...(init.headers || {}) } };
}

async function listPatients(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT id, is_active, name, birth_date, modality, plan_type, next_due_date, next_consultation_date, created_at
     FROM patients
     ORDER BY datetime(created_at) DESC
     LIMIT 200`
  ).all();
  return results;
}

async function getPatient(env: Env, id: string) {
  const row = await env.DB.prepare(`SELECT * FROM patients WHERE id = ?`).bind(id).first();
  return row;
}

async function createPatient(env: Env, body: any) {
  const id = uid("pat");
  const name = String(body?.name ?? "").trim();
  const birth_date = String(body?.birth_date ?? "").trim();
  if (!name) throw new Error("name required");
  if (!birth_date) throw new Error("birth_date required");

  const height_cm = Number(body?.height_cm ?? 0);
  const weight_kg = Number(body?.weight_kg ?? 0);
  if (!height_cm || !weight_kg) throw new Error("height_cm and weight_kg required");

  const plan_start_date = String(body?.plan_start_date ?? new Date().toISOString().slice(0, 10));
  const next_due_date = String(body?.next_due_date ?? plan_start_date);

  await env.DB.prepare(
    `INSERT INTO patients (
      id, is_active, name, birth_date, sex, email, phone, city, state,
      height_cm, weight_kg, activity_factor,
      goal_current, modality, diet_preference,
      training_split, training_time, training_rest, training_cadence,
      plan_type, plan_start_date, next_due_date, next_consultation_date,
      is_online,
      diseases_active, diseases_previous, meds_current, supplements_current, notes_extra,
      created_at, updated_at
    ) VALUES (
      ?, 1, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?,
      ?, ?, ?, ?, ?,
      datetime('now'), datetime('now')
    )`
  )
    .bind(
      id,
      name,
      birth_date,
      String(body?.sex ?? "male"),
      body?.email ?? null,
      body?.phone ?? null,
      body?.city ?? null,
      body?.state ?? null,
      height_cm,
      weight_kg,
      Number(body?.activity_factor ?? 1.55),
      body?.goal_current ?? null,
      body?.modality ?? null,
      body?.diet_preference ?? null,
      body?.training_split ?? null,
      body?.training_time ?? null,
      body?.training_rest ?? null,
      body?.training_cadence ?? null,
      String(body?.plan_type ?? "monthly"),
      plan_start_date,
      next_due_date,
      body?.next_consultation_date ?? null,
      body?.is_online === false ? 0 : 1,
      body?.diseases_active ?? null,
      body?.diseases_previous ?? null,
      body?.meds_current ?? null,
      body?.supplements_current ?? null,
      body?.notes_extra ?? null
    )
    .run();

  return await getPatient(env, id);
}

async function updatePatient(env: Env, id: string, body: any) {
  const existing = await getPatient(env, id);
  if (!existing) return null;

  const merged = { ...existing, ...body };

  await env.DB.prepare(
    `UPDATE patients SET
      is_active = ?,
      name = ?, birth_date = ?, sex = ?, email = ?, phone = ?, city = ?, state = ?,
      height_cm = ?, weight_kg = ?, activity_factor = ?,
      goal_current = ?, modality = ?, diet_preference = ?,
      training_split = ?, training_time = ?, training_rest = ?, training_cadence = ?,
      plan_type = ?, plan_start_date = ?, next_due_date = ?, next_consultation_date = ?,
      is_online = ?,
      diseases_active = ?, diseases_previous = ?, meds_current = ?, supplements_current = ?, notes_extra = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      Number(merged.is_active ?? 1),
      String(merged.name ?? ""),
      String(merged.birth_date ?? ""),
      String(merged.sex ?? "male"),
      merged.email ?? null,
      merged.phone ?? null,
      merged.city ?? null,
      merged.state ?? null,
      Number(merged.height_cm ?? 0),
      Number(merged.weight_kg ?? 0),
      Number(merged.activity_factor ?? 1.55),
      merged.goal_current ?? null,
      merged.modality ?? null,
      merged.diet_preference ?? null,
      merged.training_split ?? null,
      merged.training_time ?? null,
      merged.training_rest ?? null,
      merged.training_cadence ?? null,
      String(merged.plan_type ?? "monthly"),
      String(merged.plan_start_date ?? new Date().toISOString().slice(0, 10)),
      String(merged.next_due_date ?? new Date().toISOString().slice(0, 10)),
      merged.next_consultation_date ?? null,
      merged.is_online === false || merged.is_online === 0 ? 0 : 1,
      merged.diseases_active ?? null,
      merged.diseases_previous ?? null,
      merged.meds_current ?? null,
      merged.supplements_current ?? null,
      merged.notes_extra ?? null,
      id
    )
    .run();

  return await getPatient(env, id);
}

async function listFoods(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, unit, kcal_per_100, protein_g_per_100, carbs_g_per_100, fat_g_per_100
     FROM foods
     ORDER BY name ASC
     LIMIT 500`
  ).all();
  return results;
}

async function dashboard(env: Env) {
  const active = await env.DB.prepare(`SELECT COUNT(1) as c FROM patients WHERE is_active = 1`).first();
  const awaitingFeedback = await env.DB.prepare(
    `SELECT COUNT(1) as c
     FROM protocols
     WHERE status = 'active'
       AND date(next_feedback_date) <= date('now')`
  ).first();
  const awaitingConsult = await env.DB.prepare(
    `SELECT COUNT(1) as c
     FROM patients
     WHERE next_consultation_date IS NOT NULL AND date(next_consultation_date) <= date('now')`
  ).first();

  const overdue = await env.DB.prepare(
    `SELECT COUNT(1) as c
     FROM billing_items
     WHERE status = 'due' AND date(due_date) < date('now')`
  ).first();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const ym = monthStart.toISOString().slice(0, 7);

  const expected = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents),0) as cents
     FROM billing_items
     WHERE status='due' AND substr(due_date,1,7) = ?`
  )
    .bind(ym)
    .first();

  return {
    kpis: {
      active_patients: Number((active as any)?.c ?? 0),
      awaiting_feedback: Number((awaitingFeedback as any)?.c ?? 0),
      awaiting_consultation: Number((awaitingConsult as any)?.c ?? 0),
      overdue_payments: Number((overdue as any)?.c ?? 0),
      expected_receivables_cents: Number((expected as any)?.cents ?? 0),
    },
  };
}

async function calcPatientMetrics(env: Env, body: any) {
  const height_cm = Number(body?.height_cm ?? 0);
  const weight_kg = Number(body?.weight_kg ?? 0);
  const birth_date = String(body?.birth_date ?? "").trim();
  const sex = String(body?.sex ?? "male");
  const activity_factor = Number(body?.activity_factor ?? 1.55);

  if (!height_cm || !weight_kg || !birth_date) {
    return { bmi: null, geb: null, get: null };
  }

  const ageYears = diffYears(birth_date);
  const bmi = calcBmi(height_cm, weight_kg);
  const geb = calcBmr({ sex, weightKg: weight_kg, heightCm: height_cm, ageYears });
  const get = calcTdee(geb, activity_factor);

  return { bmi, geb, get, ageYears };
}

async function createQuestion(env: Env, body: any) {
  const id = uid("q");
  const patient_id = body?.patient_id ?? null;
  const message = String(body?.message ?? "").trim();
  const category = String(body?.category ?? "general");
  if (!message) throw new Error("message required");

  // naive keyword match on faq_entries.keywords
  const { results } = await env.DB.prepare(`SELECT id, title, keywords, answer_md FROM faq_entries`).all();
  const lower = message.toLowerCase();
  let matched: any = null;

  for (const r of results as any[]) {
    const kws = String(r.keywords || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (kws.some((k) => lower.includes(k))) {
      matched = r;
      break;
    }
  }

  await env.DB.prepare(
    `INSERT INTO questions (id, patient_id, category, message, matched_faq_id, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(id, patient_id, category, message, matched?.id ?? null)
    .run();

  if (!matched) {
    // create a whatsapp message payload stub
    const payload = {
      to: "andre_whatsapp",
      text: `Duvida do paciente${patient_id ? ` (${patient_id})` : ""}: ${message}`,
    };

    await env.DB.prepare(
      `INSERT INTO message_queue (id, type, payload_json, status, scheduled_at, created_at)
       VALUES (?, 'whatsapp', ?, 'pending', datetime('now'), datetime('now'))`
    )
      .bind(uid("msg"), JSON.stringify(payload))
      .run();
  }

  return { id, matched_faq: matched ? { id: matched.id, title: matched.title, answer_md: matched.answer_md } : null };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, withCors());

    const url = new URL(req.url);

    try {
      if (url.pathname === "/" || url.pathname === "/health") {
        return json({ ok: true, app: env.APP_NAME }, withCors());
      }

      if (url.pathname === "/dashboard" && req.method === "GET") {
        return json(await dashboard(env), withCors());
      }

      if (url.pathname === "/patients" && req.method === "GET") {
        return json({ results: await listPatients(env) }, withCors());
      }

      if (url.pathname === "/patients" && req.method === "POST") {
        const body = await parseJson(req);
        const created = await createPatient(env, body);
        return json({ result: created }, withCors({ status: 201 }));
      }

      if (url.pathname.startsWith("/patients/") && req.method === "GET") {
        const id = url.pathname.split("/")[2];
        const p = await getPatient(env, id);
        if (!p) return new Response("Not Found", withCors({ status: 404 }));
        return json({ result: p }, withCors());
      }

      if (url.pathname.startsWith("/patients/") && (req.method === "PUT" || req.method === "PATCH")) {
        const id = url.pathname.split("/")[2];
        const body = await parseJson(req);
        const updated = await updatePatient(env, id, body);
        if (!updated) return new Response("Not Found", withCors({ status: 404 }));
        return json({ result: updated }, withCors());
      }

      if (url.pathname === "/foods" && req.method === "GET") {
        return json({ results: await listFoods(env) }, withCors());
      }

      if (url.pathname === "/calc/patient" && req.method === "POST") {
        const body = await parseJson(req);
        return json({ result: await calcPatientMetrics(env, body) }, withCors());
      }

      if (url.pathname === "/questions" && req.method === "POST") {
        const body = await parseJson(req);
        return json({ result: await createQuestion(env, body) }, withCors({ status: 201 }));
      }

      return new Response("Not Found", withCors({ status: 404 }));
    } catch (err: any) {
      return json({ error: String(err?.message || err) }, withCors({ status: 400 }));
    }
  },
};
