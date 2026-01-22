import { useQuery } from "@tanstack/react-query";
import { Card, Pill } from "../components";
import { formatCentsBRL, getDashboard } from "../api";

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "brand" | "ok" | "warn" | "muted" }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
        {tone && <Pill tone={tone}>{tone}</Pill>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });

  const k = q.data?.kpis;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Visao geral do consultorio (dados reais do D1 quando disponiveis).
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <Stat label="Alunos ativos" value={k ? k.active_patients : "-"} tone="ok" />
          <Stat label="Aguardando feedback" value={k ? k.awaiting_feedback : "-"} tone="warn" />
          <Stat label="Aguardando consulta" value={k ? k.awaiting_consultation : "-"} tone="warn" />
          <Stat label="Pagamentos em atraso" value={k ? k.overdue_payments : "-"} tone="brand" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <Card
          title="Agenda (semana)"
          right={<Pill tone="muted">Google Calendar: em breve</Pill>}
        >
          <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Placeholder de agenda. Quando ligar Google Calendar, esta area mostra a semana, proximas consultas e
            blocos de feedback.
          </div>

          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridAutoFlow: "column",
                gridAutoColumns: "minmax(92px, 1fr)",
                minWidth: 7 * 102,
              }}
            >
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 90,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.16)",
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>D{i + 1}</div>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(79,209,197,0.20)" }} />
                <div style={{ height: 10, borderRadius: 999, background: "rgba(232,80,74,0.18)" }} />
              </div>
            ))}
            </div>
          </div>
        </Card>

        <Card title="Financeiro (mes)" right={<Pill tone="brand">Auto-mensagens: stub</Pill>}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Expectativa de recebimentos</div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {k ? formatCentsBRL(k.expected_receivables_cents) : "-"}
              </div>
            </div>
            <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              Aqui entram: quem deve pagar quanto e quando, inadimplentes, e gatilhos de mensagens.
            </div>

            <div style={{ marginTop: 4, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--faint)", fontSize: 12 }}>Status</span>
                <Pill tone="muted">MVP</Pill>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>
                <div style={{ width: "38%", height: "100%", borderRadius: 999, background: "rgba(232,80,74,0.55)" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {q.isError && (
        <Card title="Erro">
          <div style={{ color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((q.error as any)?.message)}</div>
        </Card>
      )}
    </div>
  );
}
