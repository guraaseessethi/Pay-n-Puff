export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="ah">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="acts">{actions}</div>}
    </div>
  );
}

export function Kpi({ k, v, d, tone }: { k: string; v: React.ReactNode; d?: React.ReactNode; tone?: "up" | "bad" | "" }) {
  return (
    <div className="pn kpi">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {d && <div className={`d ${tone ?? ""}`}>{d}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <p className="muted" role="status">
      Loading demo data…
    </p>
  );
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
}
