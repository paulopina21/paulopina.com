import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

type Note = { id: number; content: string; created_at: string };

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);

  async function loadHealth() {
    if (!API_URL) return;
    try {
      const r = await fetch(`${API_URL}/health`);
      const j = await r.json();
      setHealth(j);
    } catch {
      setHealth({ ok: false, message: "API unreachable" });
    }
  }

  async function loadNotes() {
    if (!API_URL) return;
    const r = await fetch(`${API_URL}/notes`);
    const j = await r.json();
    setNotes(j.results ?? []);
  }

  async function addNote() {
    if (!API_URL || !content.trim()) return;
    await fetch(`${API_URL}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    await loadNotes();
  }

  useEffect(() => {
    loadHealth();
    loadNotes();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Hello from paulopina.com</h1>

      {!API_URL && (
        <p style={{ color: "#c00" }}>
          Configure <code>VITE_API_URL</code> (ex: https://api-hello.paulopina.com)
        </p>
      )}

      {health && (
        <p style={{ color: health.ok ? "#080" : "#c00" }}>
          API Status: {health.ok ? "Online" : "Offline"} - {health.message}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder="Nova nota..."
          style={{ flex: 1, padding: 8, fontSize: 16 }}
        />
        <button onClick={addNote} style={{ padding: "8px 16px", fontSize: 16 }}>
          Salvar
        </button>
      </div>

      <ul style={{ marginTop: 24 }}>
        {notes.map((n) => (
          <li key={n.id} style={{ marginBottom: 8 }}>
            <b>#{n.id}</b> {n.content}{" "}
            <small style={{ color: "#666" }}>({n.created_at})</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
