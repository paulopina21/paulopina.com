import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavItem, Pill } from "./components";

function Topbar({ onMenu }: { onMenu: () => void }) {
  const loc = useLocation();
  const title =
    loc.pathname === "/"
      ? "Home"
      : loc.pathname.startsWith("/patients")
        ? "Pacientes"
        : loc.pathname.startsWith("/finance")
          ? "Financeiro"
          : loc.pathname.startsWith("/calendar")
            ? "Calendario"
            : loc.pathname.startsWith("/questions")
              ? "Duvidas"
              : "Plus Ultra";

  return (
    <header className="pu-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button
          className="pu-menuBtn"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          aria-label="Menu"
        >
          <span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>≡</span>
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: 0.4, whiteSpace: "nowrap" }}>{title}</div>
          <Pill tone="muted">Andre</Pill>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Pill tone="brand">Plus Ultra</Pill>
      </div>
    </header>
  );
}

export default function RootLayout() {
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [loc.pathname]);

  return (
    <div className="pu-shell">
      <div className="pu-overlay" data-open={navOpen ? "true" : "false"} onClick={() => setNavOpen(false)} />

      <aside className="pu-sidebar" data-open={navOpen ? "true" : "false"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 950, letterSpacing: 0.6 }}>PLUS ULTRA</div>
          <button
            className="pu-menuBtn"
            onClick={(e) => {
              e.stopPropagation();
              setNavOpen(false);
            }}
            aria-label="Fechar menu"
          >
            <span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>×</span>
          </button>
        </div>
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>v0</span>
          <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>
            ERP de consultoria esportiva. Sem login por enquanto.
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          <NavItem to="/" label="Home" />
          <NavItem to="/patients" label="Pacientes" />
          <NavItem to="/finance" label="Financeiro" />
          <NavItem to="/calendar" label="Calendario" badge={<Pill tone="muted">stub</Pill>} />
          <NavItem to="/questions" label="Duvidas" />
        </nav>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Atalhos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill tone="muted">N novo paciente</Pill>
              <Pill tone="muted">/ buscar</Pill>
            </div>
          </div>
        </div>
      </aside>

      <main className="pu-main">
        <Topbar onMenu={() => setNavOpen(true)} />
        <div className="pu-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

