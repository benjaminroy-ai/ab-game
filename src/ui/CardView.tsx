import { CARDS } from "../engine/data";
import type { Card } from "../engine/types";

const TAGS: Record<string, string> = { social: "Social", ia: "IA", espace: "Espace", energie: "Énergie", conso: "Conso" };

export function CardView({ id, onClick, disabled, selected, hint }: { id: string; onClick?: () => void; disabled?: boolean; selected?: boolean; hint?: string }) {
  const c: Card = CARDS[id];
  const cls = `card card-${c.kind}${selected ? " selected" : ""}${disabled ? " disabled" : ""}${onClick ? " clickable" : ""}`;
  return (
    <button className={cls} onClick={onClick} disabled={!onClick} title={hint}>
      <div className="card-kind">{c.kind === "projet" ? "🚀 Projet" : c.kind === "coup" ? "🗡️ Coup bas" : "⚡ Flash"}</div>
      <div className="card-name">{c.name}</div>
      {c.kind === "projet" && (
        <>
          <div className="card-cost">
            <span>💰 {c.capital}</span>
            {c.genie > 0 && <span>🔬 {c.genie}</span>}
            {c.minTech > 1 && <span className="muted">Tech {c.minTech}+</span>}
          </div>
          <div className="card-gain">
            <span title="Présence dans la région">📍 {c.presence}</span>
            <span title="Points d'hégémonie">⭐ {c.points}</span>
            {c.income > 0 && <span title="Revenu annuel">💵 +{c.income}</span>}
          </div>
          <div className="card-tags">{c.tags.map((t) => TAGS[t]).join(" · ")}{c.regions ? " · Golfe uniquement" : ""}</div>
        </>
      )}
      {c.kind === "coup" && (
        <>
          <div className="card-text">{c.text}</div>
          <div className="card-risk">Coût : 1 Ami · Risque de fuite {"🔥".repeat(c.risk)}</div>
        </>
      )}
      {c.kind === "flash" && <div className="card-text">{c.text}</div>}
      <div className="card-flavor">« {c.flavor.replace(/^« | »$/g, "")} »</div>
      {hint && <div className="card-hint">{hint}</div>}
    </button>
  );
}
