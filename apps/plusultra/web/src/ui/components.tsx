import { NavLink } from "react-router-dom";

export function Pill({ children, tone }: { children: React.ReactNode; tone?: "brand" | "ok" | "warn" | "muted" }) {
  const bg =
    tone === "brand"
      ? "rgba(232,80,74,0.18)"
      : tone === "ok"
        ? "rgba(53,208,127,0.14)"
        : tone === "warn"
          ? "rgba(243,179,58,0.14)"
          : "rgba(255,255,255,0.10)";

  const brd =
    tone === "brand"
      ? "rgba(232,80,74,0.30)"
      : tone === "ok"
        ? "rgba(53,208,127,0.26)"
        : tone === "warn"
          ? "rgba(243,179,58,0.26)"
          : "rgba(255,255,255,0.14)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${brd}`,
        background: bg,
        color: "rgba(255,255,255,0.86)",
        fontSize: 12,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Card({ title, right, children }: { title?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--panel)",
        border: "1px solid var(--stroke)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
        animation: "fadeUp 320ms ease both",
      }}
    >
      {(title || right) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontWeight: 650, letterSpacing: 0.3 }}>{title}</div>
          <div>{right}</div>
        </header>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant,
  onClick,
  type,
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const isPrimary = variant !== "ghost";
  return (
    <button
      type={type || "button"}
      disabled={disabled}
      onClick={onClick}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        borderRadius: 12,
        padding: "10px 12px",
        border: isPrimary ? "1px solid rgba(232,80,74,0.55)" : "1px solid rgba(255,255,255,0.12)",
        background: isPrimary
          ? "linear-gradient(180deg, rgba(232,80,74,0.95), rgba(232,80,74,0.70))"
          : "rgba(255,255,255,0.06)",
        color: isPrimary ? "rgba(10,12,18,0.96)" : "rgba(255,255,255,0.90)",
        fontWeight: 650,
        letterSpacing: 0.2,
        boxShadow: isPrimary ? "0 10px 24px rgba(232,80,74,0.22)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", fontWeight: 650 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--faint)" }}>{hint}</div>}
      </div>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
      }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
      }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
        resize: "vertical",
        minHeight: 96,
      }}
    />
  );
}

export function NavItem({
  to,
  label,
  badge,
}: {
  to: string;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }: { isActive: boolean }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        color: isActive ? "rgba(10,12,18,0.96)" : "rgba(255,255,255,0.88)",
        background: isActive
          ? "linear-gradient(180deg, rgba(79,209,197,0.95), rgba(79,209,197,0.70))"
          : "transparent",
        border: isActive ? "1px solid rgba(79,209,197,0.55)" : "1px solid transparent",
        boxShadow: isActive ? "0 12px 30px rgba(79,209,197,0.18)" : "none",
        textDecoration: "none",
      })}
    >
      <span style={{ fontWeight: 650, letterSpacing: 0.2 }}>{label}</span>
      {badge}
    </NavLink>
  );
}
