import { createHash, randomBytes } from "node:crypto";

// Chiavi API delle stazioni RFI: nel database si conserva solo l'hash.
export const newApiKey = () => `argh_rfi_${randomBytes(32).toString("base64url")}`;
export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
