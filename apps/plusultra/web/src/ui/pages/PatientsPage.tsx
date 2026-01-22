import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, Pill, TextInput, Button } from "../components";
import { fmtIsoDate, listPatients } from "../api";

function PatientCard({ p }: { p: any }) {
  const inactive = Number(p.is_active) !== 1;
  return (
    <Link to={`/patients/${p.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: inactive ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.14)",
          display: "grid",
          gap: 8,
          transition: "transform 120ms ease, border-color 120ms ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{p.name}</div>
          <Pill tone={inactive ? "muted" : "ok"}>{inactive ? "inativo" : "ativo"}</Pill>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone="muted">plano: {p.plan_type}</Pill>
          {p.modality && <Pill tone="muted">{p.modality}</Pill>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>Prox venc.</div>
            <div style={{ fontWeight: 750 }}>{fmtIsoDate(p.next_due_date)}</div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>Prox consulta</div>
            <div style={{ fontWeight: 750 }}>{fmtIsoDate(p.next_consultation_date)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PatientsPage() {
  const q = useQuery({ queryKey: ["patients"], queryFn: listPatients });
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const items = q.data?.results || [];

  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase();
    return items
      .filter((p: any) => (showInactive ? true : Number(p.is_active) === 1))
      .filter((p: any) => (ql ? String(p.name || "").toLowerCase().includes(ql) : true));
  }, [items, query, showInactive]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card
        title="Pacientes"
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)", fontSize: 12 }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Mostrar inativos
            </label>
            <Link to="/patients/new">
              <Button>Novo paciente</Button>
            </Link>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <TextInput placeholder="Buscar por nome..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Pill tone="muted">{filtered.length} resultados</Pill>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {q.isLoading && <Card title="Carregando..."><div style={{ color: "var(--muted)" }}>Buscando pacientes...</div></Card>}
        {q.isError && (
          <Card title="Erro">
            <div style={{ color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((q.error as any)?.message)}</div>
          </Card>
        )}
        {filtered.map((p: any) => (
          <PatientCard key={p.id} p={p} />
        ))}
        {!q.isLoading && filtered.length === 0 && (
          <Card title="Sem pacientes">
            <div style={{ color: "var(--muted)" }}>Crie seu primeiro paciente para comecar.</div>
          </Card>
        )}
      </div>
    </div>
  );
}
