import { ChevronUp, ChevronDown } from "lucide-react";

export function Move({ id, dir, action, disabled }: { id: number; dir: "up" | "down"; action: (f: FormData) => Promise<void>; disabled: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value={dir} />
      <button className="ibtn" disabled={disabled} title={dir === "up" ? "Sposta su" : "Sposta giù"} aria-label={dir === "up" ? "Sposta su" : "Sposta giù"}>
        {dir === "up" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </form>
  );
}
