export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function uid(prefix = "id") {
  const rand = crypto.getRandomValues(new Uint32Array(3));
  return `${prefix}_${rand[0].toString(16)}${rand[1].toString(16)}${rand[2].toString(16)}`;
}

export function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function parseJson(req: Request): Promise<any> {
  return req.json().catch(() => ({}));
}

export function calcBmi(heightCm: number, weightKg: number) {
  const h = heightCm / 100;
  if (!h) return null;
  return weightKg / (h * h);
}

// Mifflin-St Jeor
export function calcBmr({ sex, weightKg, heightCm, ageYears }: { sex: string; weightKg: number; heightCm: number; ageYears: number }) {
  const s = String(sex || "male").toLowerCase();
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return s === "female" ? base - 161 : base + 5;
}

export function calcTdee(bmr: number, activityFactor: number) {
  return bmr * (activityFactor || 1.55);
}

export function diffYears(birthDateIso: string) {
  const now = new Date();
  const dob = new Date(`${birthDateIso}T00:00:00Z`);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return Math.max(0, age);
}
