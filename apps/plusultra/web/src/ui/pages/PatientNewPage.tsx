import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Card, Field, Pill, Select, TextArea, TextInput } from "../components";
import { calcPatient, createPatient } from "../api";

const PatientSchema = z.object({
  name: z.string().min(1),
  birth_date: z.string().min(1),
  sex: z.enum(["male", "female"]).default("male"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  height_cm: z.coerce.number().positive(),
  weight_kg: z.coerce.number().positive(),
  activity_factor: z.coerce.number().min(1.1).max(2.5).default(1.55),

  goal_current: z.string().optional().or(z.literal("")),
  modality: z.string().optional().or(z.literal("")),
  diet_preference: z.string().optional().or(z.literal("")),

  training_split: z.string().optional().or(z.literal("")),
  training_time: z.string().optional().or(z.literal("")),
  training_rest: z.string().optional().or(z.literal("")),
  training_cadence: z.string().optional().or(z.literal("")),

  plan_type: z.enum(["monthly", "quarterly", "semiannual"]).default("monthly"),
  plan_start_date: z.string().min(1),
  next_due_date: z.string().min(1),
  next_consultation_date: z.string().optional().or(z.literal("")),
  is_online: z.coerce.number().default(1),

  diseases_active: z.string().optional().or(z.literal("")),
  diseases_previous: z.string().optional().or(z.literal("")),
  meds_current: z.string().optional().or(z.literal("")),
  supplements_current: z.string().optional().or(z.literal("")),
  notes_extra: z.string().optional().or(z.literal("")),
});

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function PatientNewPage() {
  const nav = useNavigate();
  const [form, setForm] = useState<any>({
    name: "",
    birth_date: "",
    sex: "male",
    email: "",
    phone: "",
    city: "",
    state: "",
    height_cm: "",
    weight_kg: "",
    activity_factor: 1.55,

    goal_current: "",
    modality: "",
    diet_preference: "",

    training_split: "",
    training_time: "",
    training_rest: "60-120s",
    training_cadence: "controlada",

    plan_type: "monthly",
    plan_start_date: isoToday(),
    next_due_date: isoToday(),
    next_consultation_date: "",
    is_online: 1,

    diseases_active: "",
    diseases_previous: "",
    meds_current: "",
    supplements_current: "",
    notes_extra: "",
  });

  const calc = useMutation({
    mutationFn: (payload: any) => calcPatient(payload),
  });

  const [submitted, setSubmitted] = useState(false);
  const [showCalcErr, setShowCalcErr] = useState(false);

  const create = useMutation({
    mutationFn: (payload: any) => createPatient(payload),
    onSuccess: (data: any) => {
      nav(`/patients/${data.result.id}`);
    },
  });

  const metrics = calc.data?.result;

  useEffect(() => {
    const payload = {
      birth_date: form.birth_date,
      sex: form.sex,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      activity_factor: Number(form.activity_factor),
    };

    if (!payload.birth_date || !payload.height_cm || !payload.weight_kg) return;

    setShowCalcErr(false);

    const t = window.setTimeout(() => {
      calc.mutate(payload);
    }, 350);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.birth_date, form.sex, form.height_cm, form.weight_kg, form.activity_factor]);

  const errors = useMemo(() => {
    const r = PatientSchema.safeParse(form);
    if (r.success) return null;
    const m: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = String(issue.path[0] || "form");
      if (!m[key]) m[key] = issue.message;
    }
    return m;
  }, [form]);

  function set<K extends string>(key: K, value: any) {
    setForm((s: any) => ({ ...s, [key]: value }));
  }

  async function recomputeManual() {
    const payload = {
      birth_date: form.birth_date,
      sex: form.sex,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      activity_factor: Number(form.activity_factor),
    };

    if (!payload.birth_date || !payload.height_cm || !payload.weight_kg) return;

    setShowCalcErr(true);
    await calc.mutateAsync(payload);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const r = PatientSchema.safeParse(form);
    if (!r.success) return;

    const normalized = {
      ...r.data,
      email: r.data.email || null,
      phone: r.data.phone || null,
      city: r.data.city || null,
      state: r.data.state || null,
      next_consultation_date: r.data.next_consultation_date || null,
      goal_current: r.data.goal_current || null,
      modality: r.data.modality || null,
      diet_preference: r.data.diet_preference || null,
      training_split: r.data.training_split || null,
      training_time: r.data.training_time || null,
      training_rest: r.data.training_rest || null,
      training_cadence: r.data.training_cadence || null,
      diseases_active: r.data.diseases_active || null,
      diseases_previous: r.data.diseases_previous || null,
      meds_current: r.data.meds_current || null,
      supplements_current: r.data.supplements_current || null,
      notes_extra: r.data.notes_extra || null,
      is_online: Number(r.data.is_online) === 1,
    };

    await create.mutateAsync(normalized);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 950 }}>Cadastro de Paciente</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>3 secoes: basico, acompanhamento, medico.</div>
        </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <Button variant="ghost" onClick={() => recomputeManual()}>
            Recalcular
          </Button>
          <Button type="submit" disabled={!!errors || create.isPending}>
            Salvar
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>
        <Card title="Secao 1 - Informacoes basicas" right={<Pill tone="muted">auto</Pill>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Field label="Nome" hint={submitted ? errors?.name : undefined}>
              <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
            </Field>

            <Field label="Data de nascimento" hint={submitted ? errors?.birth_date : undefined}>
              <TextInput
                type="date"
                value={form.birth_date}
                onChange={(e) => {
                  set("birth_date", e.target.value);
                }}
              />
            </Field>

            <Field label="Sexo" hint={errors?.sex}>
              <Select value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </Select>
            </Field>

            <Field label="E-mail" hint={errors?.email}>
              <TextInput value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@..." />
            </Field>

            <Field label="Telefone" hint={errors?.phone}>
              <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />
            </Field>

            <Field label="Cidade / Estado" hint="">
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 84px", gap: 10 }}>
                <TextInput value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
                <TextInput value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="UF" maxLength={2} />
              </div>
            </Field>

            <Field label="Altura (cm)" hint={submitted ? errors?.height_cm : undefined}>
              <TextInput
                inputMode="decimal"
                value={form.height_cm}
                onChange={(e) => {
                  set("height_cm", e.target.value);
                }}
              />
            </Field>

            <Field label="Peso (kg)" hint={submitted ? errors?.weight_kg : undefined}>
              <TextInput
                inputMode="decimal"
                value={form.weight_kg}
                onChange={(e) => {
                  set("weight_kg", e.target.value);
                }}
              />
            </Field>

            <Field label="Fator atividade" hint={submitted ? errors?.activity_factor : undefined}>
              <Select
                value={String(form.activity_factor)}
                onChange={(e) => {
                  set("activity_factor", Number(e.target.value));
                }}
              >
                <option value={1.2}>Sedentario (1.2)</option>
                <option value={1.375}>Leve (1.375)</option>
                <option value={1.55}>Moderado (1.55)</option>
                <option value={1.725}>Intenso (1.725)</option>
                <option value={1.9}>Atleta (1.9)</option>
              </Select>
            </Field>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill tone="muted">IMC: {metrics?.bmi ? metrics.bmi.toFixed(1) : "-"}</Pill>
                <Pill tone="muted">GEB: {metrics?.geb ? Math.round(metrics.geb) : "-"}</Pill>
                <Pill tone="muted">GET: {metrics?.get ? Math.round(metrics.get) : "-"}</Pill>
                <Pill tone="muted">Idade: {metrics?.ageYears ?? "-"}</Pill>
              </div>
              {showCalcErr && calc.isError && <div style={{ color: "#ffb4b0" }}>{String((calc.error as any)?.message)}</div>}
            </div>
          </div>
        </Card>

        <Card title="Resumo" right={<Pill tone="brand">MVP</Pill>}>
          <div style={{ display: "grid", gap: 10, color: "var(--muted)", lineHeight: 1.55 }}>
            <div>Esse cadastro alimenta automaticamente os calculos, protocolos e financeiro.</div>
            <div>
              Dica: depois vamos ligar automacoes (feedback, consulta, vencimento) e mensagens.
            </div>
          </div>
        </Card>
      </div>

      <Card title="Secao 2 - Acompanhamento" right={<Pill tone="muted">plano</Pill>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <Field label="Objetivo atual">
            <TextInput value={form.goal_current} onChange={(e) => set("goal_current", e.target.value)} placeholder="Hipertrofia, reducao..." />
          </Field>
          <Field label="Modalidade de acompanhamento">
            <Select value={form.modality} onChange={(e) => set("modality", e.target.value)}>
              <option value="">Selecione</option>
              <option value="mensal">Mensal</option>
              <option value="mensal+treino">Mensal + treino</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>
          <Field label="Dieta desejada">
            <Select value={form.diet_preference} onChange={(e) => set("diet_preference", e.target.value)}>
              <option value="">Selecione</option>
              <option value="flexivel">Flexivel</option>
              <option value="lowcarb">Low carb</option>
              <option value="cetogenica">Cetogenica</option>
              <option value="mediterranea">Mediterranea</option>
            </Select>
          </Field>

          <Field label="Divisao do treino">
            <Select value={form.training_split} onChange={(e) => set("training_split", e.target.value)}>
              <option value="">Selecione</option>
              <option value="A/B">A/B</option>
              <option value="A/B/C">A/B/C</option>
              <option value="fullbody">Full body</option>
            </Select>
          </Field>
          <Field label="Horario">
            <TextInput value={form.training_time} onChange={(e) => set("training_time", e.target.value)} placeholder="Ex: 06:30" />
          </Field>
          <Field label="Tempo de descanso">
            <Select value={form.training_rest} onChange={(e) => set("training_rest", e.target.value)}>
              <option value="60-120s">60-120s</option>
              <option value="120-180s">120-180s</option>
              <option value="180-240s">180-240s</option>
            </Select>
          </Field>

          <Field label="Cadencia esperada">
            <Select value={form.training_cadence} onChange={(e) => set("training_cadence", e.target.value)}>
              <option value="controlada">Controlada</option>
              <option value="explosiva">Explosiva</option>
              <option value="tempo">Tempo (ex: 3-1-1)</option>
            </Select>
          </Field>

          <Field label="Tipo de plano" hint={errors?.plan_type}>
            <Select value={form.plan_type} onChange={(e) => set("plan_type", e.target.value)}>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="semiannual">Semestral</option>
            </Select>
          </Field>

          <Field label="Inicio" hint={errors?.plan_start_date}>
            <TextInput type="date" value={form.plan_start_date} onChange={(e) => set("plan_start_date", e.target.value)} />
          </Field>

          <Field label="Proximo vencimento" hint={errors?.next_due_date}>
            <TextInput type="date" value={form.next_due_date} onChange={(e) => set("next_due_date", e.target.value)} />
          </Field>

          <Field label="Proxima consulta">
            <TextInput type="date" value={form.next_consultation_date} onChange={(e) => set("next_consultation_date", e.target.value)} />
          </Field>

          <Field label="Presencial ou online">
            <Select value={String(form.is_online)} onChange={(e) => set("is_online", Number(e.target.value))}>
              <option value={1}>Online</option>
              <option value={0}>Presencial</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Secao 3 - Informacoes medicas" right={<Pill tone="warn">sensivel</Pill>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <Field label="Doencas ativas">
            <TextArea value={form.diseases_active} onChange={(e) => set("diseases_active", e.target.value)} placeholder="" />
          </Field>
          <Field label="Doencas previas">
            <TextArea value={form.diseases_previous} onChange={(e) => set("diseases_previous", e.target.value)} placeholder="" />
          </Field>
          <Field label="Medicamentos em uso">
            <TextArea value={form.meds_current} onChange={(e) => set("meds_current", e.target.value)} placeholder="" />
          </Field>
          <Field label="Suplementacoes em uso">
            <TextArea value={form.supplements_current} onChange={(e) => set("supplements_current", e.target.value)} placeholder="" />
          </Field>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Informacoes adicionais">
              <TextArea value={form.notes_extra} onChange={(e) => set("notes_extra", e.target.value)} placeholder="Observacoes gerais..." />
            </Field>
          </div>
        </div>

        {create.isError && (
          <div style={{ marginTop: 12, color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((create.error as any)?.message)}</div>
        )}
      </Card>

      {submitted && errors && (
        <Card title="Campos obrigatorios" right={<Pill tone="warn">revise</Pill>}>
          <div style={{ display: "grid", gap: 6, color: "var(--muted)" }}>
            {Object.entries(errors).map(([k, v]) => (
              <div key={k}>
                <span style={{ fontFamily: "var(--mono)", color: "rgba(255,255,255,0.8)" }}>{k}</span>: {v}
              </div>
            ))}
          </div>
        </Card>
      )}
    </form>
  );
}
