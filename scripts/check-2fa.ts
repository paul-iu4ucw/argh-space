// Verifica le funzioni 2FA senza database: npx tsx scripts/check-2fa.ts
import assert from "node:assert/strict";
process.env.AUTH_SECRET ||= "x".repeat(40);
process.env.DATABASE_URL ||= "postgres://u:p@localhost:5432/x"; // non si collega: si usano solo le funzioni pure
async function main() {
const { base32, hotp, matchTotp, newSecret, encrypt, decrypt, newRecoveryCodes, otpauthUrl } = await import("../src/lib/twofa");

// RFC 6238, secret "12345678901234567890" (SHA-1): t=59 → 94287082 (ultime 6 cifre 287082), t=1111111109 → 081804
const sec = base32(Buffer.from("12345678901234567890"));
assert.equal(hotp(sec, Math.floor(59 / 30)), "287082");
assert.equal(hotp(sec, Math.floor(1111111109 / 30)), "081804");
assert.equal(matchTotp(sec, "287082", 59_000), 1);
assert.equal(matchTotp(sec, "287082", 59_000 + 30_000), 1);   // tolleranza di un passo
assert.equal(matchTotp(sec, "287082", 59_000 + 90_000), null); // troppo vecchio
assert.equal(matchTotp(sec, "12345", 59_000), null);
const s = newSecret(); assert.match(s, /^[A-Z2-7]{32}$/);
assert.equal(decrypt(encrypt(s)), s);
assert.notEqual(encrypt(s), encrypt(s));
const r = newRecoveryCodes(); assert.equal(r.codes.length, 8); assert.match(r.codes[0], /^[a-z2-7]{4}-[a-z2-7]{4}$/);
assert.ok(otpauthUrl(s, "a@b.it").startsWith("otpauth://totp/A.R.G.H.%3Aa%40b.it?secret="));
console.log("2FA: tutti i controlli superati");
}
main();
