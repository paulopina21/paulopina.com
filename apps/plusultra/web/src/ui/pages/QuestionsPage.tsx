import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Field, Pill, TextArea, TextInput } from "../components";
import { createQuestion } from "../api";

export default function QuestionsPage() {
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");

  const m = useMutation({
    mutationFn: (payload: any) => createQuestion(payload),
  });

  async function send() {
    await m.mutateAsync({ patient_id: patientId || null, category: "general", message });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card title="Duvidas" right={<Pill tone="muted">FAQ + WhatsApp stub</Pill>}>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          O paciente manda a duvida aqui. Se bater com um FAQ, o sistema retorna a resposta.
          <br />
          Se nao for FAQ, registramos uma mensagem pendente para o WhatsApp do Andre (fila interna).
        </div>
      </Card>

      <Card title="Enviar duvida">
        <div style={{ display: "grid", gap: 12, maxWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <Field label="Patient ID (opcional)" hint="se tiver">
              <TextInput value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="pat_..." />
            </Field>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
              <Button onClick={send} disabled={!message.trim() || m.isPending}>
                Enviar
              </Button>
            </div>
          </div>

          <Field label="Mensagem">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex: Como executar o agachamento?" />
          </Field>

          {m.data?.result?.matched_faq && (
            <Card title="Resposta automatica" right={<Pill tone="ok">FAQ</Pill>}>
              <div style={{ whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.86)", lineHeight: 1.6 }}>
                {m.data.result.matched_faq.answer_md}
              </div>
            </Card>
          )}

          {m.data && !m.data.result.matched_faq && (
            <Card title="Encaminhado" right={<Pill tone="warn">WhatsApp</Pill>}>
              <div style={{ color: "var(--muted)" }}>
                Nao encontramos FAQ. Mensagem foi para a fila de WhatsApp do Andre.
              </div>
            </Card>
          )}

          {m.isError && (
            <div style={{ color: "#ffb4b0", fontFamily: "var(--mono)" }}>{String((m.error as any)?.message)}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
