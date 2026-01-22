import { Card, Pill } from "../components";

export default function FinancePage() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card title="Financeiro" right={<Pill tone="muted">MVP</Pill>}>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Nesta primeira versao:
          <ul>
            <li>Expectativa de recebimentos no mes (agregado)</li>
            <li>Pagamentos em atraso (contador)</li>
            <li>Lista: quem deve pagar quanto e quando</li>
          </ul>
          Ainda falta: cadastro/geracao automatica de cobranças por plano, e mensagens automaticas.
        </div>
      </Card>

      <Card title="Lista de cobrancas" right={<Pill tone="muted">stub</Pill>}>
        <div style={{ color: "var(--muted)" }}>Em seguida vou expor `/billing` na API e renderizar aqui.</div>
      </Card>
    </div>
  );
}
