import { Card, Pill } from "../components";

export default function CalendarPage() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card title="Calendario" right={<Pill tone="muted">Google Calendar: stub</Pill>}>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Vou deixar esta tela como placeholder ate ligarmos a integracao.
          <br />
          Quando conectar, teremos:
          <ul>
            <li>Semana (grid)</li>
            <li>Eventos (consultas, feedbacks)</li>
            <li>Atalhos para criar eventos</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
