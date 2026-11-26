"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadImage } from "./upload-image";

/** Foto di copertina: carica subito il file, l'indirizzo viene salvato insieme al resto del modulo. */
export function CoverInput({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError("");
    try { setUrl(await uploadImage(file)); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="coverin">
      <input type="hidden" name="cover" value={url} />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="Anteprima della copertina" />}
      <button type="button" className="btn ghost" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={15} /> {busy ? "Caricamento…" : url ? "Cambia foto" : "Carica foto"}</button>
      {url && <button type="button" className="btn ghost" onClick={() => setUrl("")}><Trash2 size={15} /> Togli</button>}
      {error && <p className="flash err">{error}</p>}
      <p className="meta">Dopo il caricamento premi «Salva modifiche».</p>
    </div>
  );
}
