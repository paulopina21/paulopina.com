import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Field, Pill, Select, TextArea, TextInput } from "../components";
import { calcPatient, fmtIsoDate, getPatient, updatePatient } from "../api";

export default function PatientDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(String(id)),
    enabled: !!id,
  });

  const [draft, setDraft] = useState<any>(null);

  const patient = q.data?.result;
  const form = draft || patient;

  const calc = useMutation({ mutationFn: (payload: any) => calcPatient(payload) });

  // compute on load so metrics don't look broken
  useEffect(() => {
    if (!patient) return;
    calc.mutate({
      birth_date: patient.birth_date,
      sex: patient.sex,
      height_cm: Number(patient.height_cm),
      weight_kg: Number(patient.weight_kg),
      activity_factor: Number(patient.activity_factor ?? 1.55),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const save = useMutation({
    mutationFn: (payload: any) => updatePatient(String(id), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      setDraft(null);
    },
  });

  const metrics = calc.data?.result;

  const statusPill = useMemo(() => {
    if (!patient) return null;
    return Number(patient.is_active) === 1 ? <Pill tone="ok">ativo</Pill> : <Pill tone="muted">inativo</Pill>;
  }, [patient]);

  function set(key: string, value: any) {
    setDraft((s: any) => ({ ...(s || patient || {}), [key]: value }));
  }

  async function recompute() {
    if (!form) return;
    const payload = {
      birth_date: form.birth_date,
      sex: form.sex,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      activity_factor: Number(form.activity_factor),
    };
    await calc.mutateAsync(payload);
  }

  async function onSave() {
    if (!draft) return;
    await save.mutateAsync(draft);
  }

  async function toggleActive() {
    if (!patient) return;
    await save.mutateAsync({ is_active: Number(patient.is_active) === 1 ? 0 : 1 });
  }

  if (q.isLoading) {
    return (
      <Card title="Carregando...">
        <div style={{ color: "var(--muted)" }}>Buscando paciente.</div>
      </Card>
    );
  }

  if (q.isError || !patient) {
    return (
      <Card title="Nao encontrado">
        <div style={{ color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((q.error as any)?.message || "")}</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/patients">
            <Button variant="ghost">Voltar</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 20, fontWeight: 950 }}>{patient.name}</div>
            {statusPill}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Prox venc: {fmtIsoDate(patient.next_due_date)} | Prox consulta: {fmtIsoDate(patient.next_consultation_date)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 20, fontWeight: 950 }}>{patient.name}</div>
              {statusPill}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Prox venc: {fmtIsoDate(patient.next_due_date)} | Prox consulta: {fmtIsoDate(patient.next_consultation_date)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <Button variant="ghost" onClick={toggleActive}>
              {Number(patient.is_active) === 1 ? "Desativar" : "Ativar"}
            </Button>
            <Button variant="ghost" onClick={recompute}>
              Recalcular
            </Button>
            <div style={{ gridColumn: "span 2" }}>
              <Button onClick={onSave} disabled={!draft || save.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
          <Button onClick={onSave} disabled={!draft || save.isPending}>
            Salvar
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>
        <Card title="Basico">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Field label="Nome">
              <TextInput value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Nascimento">
              <TextInput type="date" value={form.birth_date || ""} onChange={(e) => set("birth_date", e.target.value)} />
            </Field>
            <Field label="Sexo">
              <Select value={form.sex || "male"} onChange={(e) => set("sex", e.target.value)}>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </Select>
            </Field>
            <Field label="E-mail">
              <TextInput value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Telefone">
              <TextInput value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Cidade/UF">
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 84px", gap: 10 }}>
                <TextInput value={form.city || ""} onChange={(e) => set("city", e.target.value)} />
                <TextInput value={form.state || ""} onChange={(e) => set("state", e.target.value)} maxLength={2} />
              </div>
            </Field>
            <Field label="Altura (cm)">
              <TextInput value={String(form.height_cm ?? "")} onChange={(e) => set("height_cm", e.target.value)} />
            </Field>
            <Field label="Peso (kg)">
              <TextInput value={String(form.weight_kg ?? "")} onChange={(e) => set("weight_kg", e.target.value)} />
            </Field>
            <Field label="Atividade">
              <Select value={String(form.activity_factor ?? 1.55)} onChange={(e) => set("activity_factor", Number(e.target.value))}>
                <option value={1.2}>Sedentario (1.2)</option>
                <option value={1.375}>Leve (1.375)</option>
                <option value={1.55}>Moderado (1.55)</option>
                <option value={1.725}>Intenso (1.725)</option>
                <option value={1.9}>Atleta (1.9)</option>
              </Select>
            </Field>

            <div style={{ gridColumn: "span 2", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill tone="muted">IMC: {metrics?.bmi ? metrics.bmi.toFixed(1) : "-"}</Pill>
              <Pill tone="muted">GEB: {metrics?.geb ? Math.round(metrics.geb) : "-"}</Pill>
              <Pill tone="muted">GET: {metrics?.get ? Math.round(metrics.get) : "-"}</Pill>
            </div>
          </div>
        </Card>

        <Card title="Acompanhamento">
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Objetivo">
              <TextInput value={form.goal_current || ""} onChange={(e) => set("goal_current", e.target.value)} />
            </Field>
            <Field label="Modalidade">
              <TextInput value={form.modality || ""} onChange={(e) => set("modality", e.target.value)} />
            </Field>
            <Field label="Dieta desejada">
              <TextInput value={form.diet_preference || ""} onChange={(e) => set("diet_preference", e.target.value)} />
            </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <Field label="Inicio">
                <TextInput type="date" value={form.plan_start_date || ""} onChange={(e) => set("plan_start_date", e.target.value)} />
              </Field>
              <Field label="Prox vencimento">
                <TextInput type="date" value={form.next_due_date || ""} onChange={(e) => set("next_due_date", e.target.value)} />
              </Field>
            </div>

            <Field label="Prox consulta">
              <TextInput
                type="date"
                value={form.next_consultation_date || ""}
                onChange={(e) => set("next_consultation_date", e.target.value)}
              />
            </Field>

            <Field label="Online?">
              <Select value={String(form.is_online ?? 1)} onChange={(e) => set("is_online", Number(e.target.value))}>
                <option value={1}>Online</option>
                <option value={0}>Presencial</option>
              </Select>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <Field label="Divisao treino">
                <TextInput value={form.training_split || ""} onChange={(e) => set("training_split", e.target.value)} />
              </Field>
              <Field label="Horario">
                <TextInput value={form.training_time || ""} onChange={(e) => set("training_time", e.target.value)} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <Field label="Descanso">
                <TextInput value={form.training_rest || ""} onChange={(e) => set("training_rest", e.target.value)} />
              </Field>
              <Field label="Cadencia">
                <TextInput value={form.training_cadence || ""} onChange={(e) => set("training_cadence", e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Medico" right={<Pill tone="warn">privado</Pill>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <Field label="Doencas ativas">
            <TextArea value={form.diseases_active || ""} onChange={(e) => set("diseases_active", e.target.value)} />
          </Field>
          <Field label="Doencas previas">
            <TextArea value={form.diseases_previous || ""} onChange={(e) => set("diseases_previous", e.target.value)} />
          </Field>
          <Field label="Medicamentos">
            <TextArea value={form.meds_current || ""} onChange={(e) => set("meds_current", e.target.value)} />
          </Field>
          <Field label="Suplementos">
            <TextArea value={form.supplements_current || ""} onChange={(e) => set("supplements_current", e.target.value)} />
          </Field>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Notas">
              <TextArea value={form.notes_extra || ""} onChange={(e) => set("notes_extra", e.target.value)} />
            </Field>
          </div>
        </div>

        {save.isError && (
          <div style={{ marginTop: 12, color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((save.error as any)?.message)}</div>
        )}
      </Card>

      <Card title="Protocolos" right={<Pill tone="muted">em breve</Pill>}>
        <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Proxima etapa: criacao/clone de protocolos, dieta (refeicoes/opcoes/itens), treino (exercicios) e
          export para PDF/app do paciente.
        </div>
      </Card>
    </div>
  );
}
