const FALLBACK_API_URL = (() => {
  try {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "";
    if (h.endsWith("paulopina.com")) return "https://api-plusultra.paulopina.com";
    return "";
  } catch {
    return "";
  }
})();

const API_URL = (import.meta.env.VITE_API_URL || (window as any).__PLUSULTRA_API_URL || FALLBACK_API_URL || "").trim();

export type ApiError = { error: string };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("VITE_API_URL is not set");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || res.statusText;
    throw new Error(msg);
  }

  return data as T;
}

export type DashboardResponse = {
  kpis: {
    active_patients: number;
    awaiting_feedback: number;
    awaiting_consultation: number;
    overdue_payments: number;
    expected_receivables_cents: number;
  };
};

export type PatientListItem = {
  id: string;
  is_active: number;
  name: string;
  birth_date: string;
  modality: string | null;
  plan_type: string;
  next_due_date: string;
  next_consultation_date: string | null;
  created_at: string;
};

export type Patient = Record<string, any> & { id: string };

export async function getDashboard() {
  return req<DashboardResponse>("/dashboard");
}

export async function listPatients() {
  return req<{ results: PatientListItem[] }>("/patients");
}

export async function getPatient(id: string) {
  return req<{ result: Patient }>(`/patients/${id}`);
}

export async function createPatient(input: any) {
  return req<{ result: Patient }>("/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePatient(id: string, input: any) {
  return req<{ result: Patient }>(`/patients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function calcPatient(input: any) {
  return req<{ result: { bmi: number | null; geb: number | null; get: number | null; ageYears?: number } }>("/calc/patient", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createQuestion(input: any) {
  return req<{ result: { id: string; matched_faq: { id: string; title: string; answer_md: string } | null } }>("/questions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function formatCentsBRL(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtIsoDate(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}
