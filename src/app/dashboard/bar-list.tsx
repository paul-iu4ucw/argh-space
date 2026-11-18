/** Lista a barre orizzontali (al posto di una tabella): barra = occupazione media; ambra se il segnale cade nella banda protetta. */
export function BarList({ items, badgeIn, badgeOut }: { items: { key: number; label: string; pct: number; inBand: boolean; detail: string }[]; badgeIn: string; badgeOut: string }) {
  if (items.length === 0) return <p>—</p>;
  return (
    <ul className="dsh-bars">
      {items.map((it) => (
        <li key={it.key} title={it.detail}>
          <span className="bl-f">{it.label}</span>
          <span className="bl-n">{it.detail}</span>
          <span className={`badge ${it.inBand ? "draft" : ""}`}>{it.inBand ? badgeIn : badgeOut}</span>
          <span className="bl-bar" role="img" aria-label={`${it.pct.toFixed(0)}%`}><i className={it.inBand ? "prot" : "adj"} style={{ width: `${Math.max(2, Math.min(100, it.pct))}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}
