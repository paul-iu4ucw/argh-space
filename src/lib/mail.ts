import nodemailer, { type Transporter } from "nodemailer";
import { siteUrl } from "./seo";

let tx: Transporter | undefined;
function transport() {
  if (tx) return tx;
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) throw new Error("SMTP non configurato (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)");
  const port = Number(process.env.SMTP_PORT) || 465;
  return (tx = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type MailKind = "verify" | "reset" | "email" | "adminVerify" | "adminReset";
type Copy = { subject: string; intro: string; ask: string; button: string; note: string; ignore: string };

const common = {
  it: { hello: (n: string) => `Ciao ${n},`, fallback: "Il pulsante non funziona? Copia questo indirizzo nel browser:", sign: "A.R.G.H. – Astronomical Radio Ground Hub" },
  en: { hello: (n: string) => `Hi ${n},`, fallback: "The button doesn't work? Copy this address into your browser:", sign: "A.R.G.H. – Astronomical Radio Ground Hub" },
} as const;

const text: Record<"it" | "en", Record<MailKind, Copy>> = {
  it: {
    verify: {
      subject: "Conferma il tuo indirizzo email · A.R.G.H.",
      intro: "grazie per esserti registrato alla wiki di A.R.G.H., il radiotelescopio educativo che osserva la riga dell'idrogeno a 21 cm.",
      ask: "Per attivare il tuo account e poter commentare le pagine, conferma il tuo indirizzo email.",
      button: "Apri la pagina di conferma",
      note: "Il link ti porta a una pagina del sito dove dovrai premere il pulsante “Conferma email”: serve a evitare che programmi di posta o antivirus lo aprano per te. Il link vale 24 ore.",
      ignore: "Se non sei stato tu, ignora questo messaggio: senza conferma l'account non viene attivato e viene eliminato entro 48 ore dalla registrazione.",
    },
    reset: {
      subject: "Reimposta la tua password · A.R.G.H.",
      intro: "abbiamo ricevuto una richiesta per reimpostare la password del tuo account sulla wiki di A.R.G.H.",
      ask: "Premi il pulsante per scegliere una nuova password.",
      button: "Scegli una nuova password",
      note: "Il link ti porta a una pagina del sito dove potrai scrivere la nuova password. Vale 1 ora e si può usare una sola volta. Dopo il cambio verrai scollegato dagli altri dispositivi.",
      ignore: "Se non sei stato tu, ignora questo messaggio: la tua password resta quella di prima.",
    },
    email: {
      subject: "Conferma il nuovo indirizzo email · A.R.G.H.",
      intro: "hai chiesto di usare questo indirizzo email per il tuo account sulla wiki di A.R.G.H.",
      ask: "Conferma il nuovo indirizzo per completare il cambio.",
      button: "Conferma il nuovo indirizzo",
      note: "Il link ti porta a una pagina del sito dove dovrai premere il pulsante di conferma. Vale 24 ore. Finché non confermi, il tuo account continua a usare l'indirizzo di prima.",
      ignore: "Se non sei stato tu, ignora questo messaggio: l'indirizzo dell'account non cambia.",
    },
    adminVerify: {
      subject: "Conferma l'email dell'amministratore · A.R.G.H.",
      intro: "è stata richiesta la creazione dell'account amministratore del sito A.R.G.H. con questo indirizzo email.",
      ask: "Conferma l'indirizzo per attivare l'account e accedere all'area di gestione.",
      button: "Conferma e attiva l'account",
      note: "Il link ti porta a una pagina del sito dove dovrai premere il pulsante di conferma: serve a evitare che programmi di posta o antivirus lo aprano per te. Vale 24 ore.",
      ignore: "Se non sei stato tu, ignora questo messaggio: senza conferma l'account non viene attivato.",
    },
    adminReset: {
      subject: "Reimposta la password amministratore · A.R.G.H.",
      intro: "abbiamo ricevuto una richiesta per reimpostare la password dell'account amministratore di A.R.G.H.",
      ask: "Premi il pulsante per scegliere una nuova password.",
      button: "Scegli una nuova password",
      note: "Il link vale 1 ora e si può usare una sola volta. Dopo il cambio tutte le sessioni aperte vengono chiuse.",
      ignore: "Se non sei stato tu, ignora questo messaggio: la password resta quella di prima.",
    },
  },
  en: {
    verify: {
      subject: "Confirm your email address · A.R.G.H.",
      intro: "thanks for signing up to the A.R.G.H. wiki, the educational radio telescope that observes the 21 cm hydrogen line.",
      ask: "To activate your account and be able to comment on pages, please confirm your email address.",
      button: "Open the confirmation page",
      note: "The link takes you to a page on the website where you will need to press the “Confirm email” button: this stops mail programs or antivirus tools from opening it for you. The link is valid for 24 hours.",
      ignore: "If this wasn't you, just ignore this message: without confirmation the account stays inactive and is deleted within 48 hours of signing up.",
    },
    reset: {
      subject: "Reset your password · A.R.G.H.",
      intro: "we received a request to reset the password of your account on the A.R.G.H. wiki.",
      ask: "Press the button to choose a new password.",
      button: "Choose a new password",
      note: "The link takes you to a page on the website where you can type the new password. It is valid for 1 hour and can be used only once. After the change you will be signed out on your other devices.",
      ignore: "If this wasn't you, just ignore this message: your password stays as it was.",
    },
    email: {
      subject: "Confirm your new email address · A.R.G.H.",
      intro: "you asked to use this email address for your account on the A.R.G.H. wiki.",
      ask: "Confirm the new address to complete the change.",
      button: "Confirm the new address",
      note: "The link takes you to a page on the website where you will need to press the confirm button. It is valid for 24 hours. Until you confirm, your account keeps using the previous address.",
      ignore: "If this wasn't you, just ignore this message: the account address does not change.",
    },
    adminVerify: {
      subject: "Confirm the administrator email · A.R.G.H.",
      intro: "someone asked to create the A.R.G.H. site administrator account with this email address.",
      ask: "Confirm the address to activate the account and sign in to the management area.",
      button: "Confirm and activate the account",
      note: "The link takes you to a page on the website where you will need to press the confirm button. It is valid for 24 hours.",
      ignore: "If this wasn't you, just ignore this message: the account stays inactive without confirmation.",
    },
    adminReset: {
      subject: "Reset the administrator password · A.R.G.H.",
      intro: "we received a request to reset the password of the A.R.G.H. administrator account.",
      ask: "Press the button to choose a new password.",
      button: "Choose a new password",
      note: "The link is valid for 1 hour and can be used only once. After the change all open sessions are closed.",
      ignore: "If this wasn't you, just ignore this message: the password stays as it was.",
    },
  },
};

export function buildMail(kind: MailKind, name: string, link: string, lang: "it" | "en") {
  const T = text[lang][kind], C = common[lang];
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="only dark"><title>${esc(T.subject)}</title></head>
<body bgcolor="#050816" style="margin:0;padding:0;background:#050816;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(T.ask)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050816" style="background:#050816;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#0d1226" style="width:100%;max-width:560px;background:#0d1226;border:1px solid #1c2547;border-radius:20px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:#29b6f6;background-image:linear-gradient(90deg,#29b6f6,#8b6cff);">&nbsp;</td></tr>
    <tr><td align="center" bgcolor="#070b1a" style="padding:30px 24px 6px;background:#070b1a;"><img src="${siteUrl}/logo-mail.png" width="190" height="190" alt="A.R.G.H. – Astronomical Radio Ground Hub" style="display:block;width:190px;height:190px;border:0;outline:none;"></td></tr>
    <tr><td style="padding:26px 34px 8px;color:#e9eefc;">
      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#ffffff;">${esc(C.hello(name))}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#cfd8ee;">${esc(T.intro)}</p>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:#cfd8ee;">${esc(T.ask)}</p>
    </td></tr>
    <tr><td align="center" style="padding:20px 34px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#29b6f6" style="border-radius:999px;background:#29b6f6;background-image:linear-gradient(135deg,#29b6f6,#8b6cff);">
        <a href="${esc(link)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(T.button)}</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:0 34px 26px;">
      <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#9aa7c7;">${esc(T.note)}</p>
      <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#9aa7c7;">${esc(C.fallback)}</p>
      <p style="margin:0 0 14px;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${esc(link)}" style="color:#29b6f6;">${esc(link)}</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#9aa7c7;">${esc(T.ignore)}</p>
    </td></tr>
    <tr><td align="center" bgcolor="#070b1a" style="padding:18px 24px;border-top:1px solid #1c2547;background:#070b1a;font-size:12px;color:#6b7799;">${esc(C.sign)}<br><a href="${siteUrl}" style="color:#6b7799;">${siteUrl.replace(/^https?:\/\//, "")}</a></td></tr>
  </table>
</td></tr></table></body></html>`;
  const plain = `${C.hello(name)}\n\n${T.intro}\n${T.ask}\n\n${link}\n\n${T.note}\n${T.ignore}\n\n${C.sign}\n${siteUrl}`;
  return { subject: T.subject, html, text: plain };
}

export async function sendMail(kind: MailKind, to: string, name: string, link: string, lang: "it" | "en") {
  const { subject, html, text: plain } = buildMail(kind, name, link, lang);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transport().sendMail({ from: `"A.R.G.H." <${from}>`, to, subject, text: plain, html });
}

// compatibilità con il codice esistente
export const buildVerificationEmail = (name: string, link: string, lang: "it" | "en") => buildMail("verify", name, link, lang);
export const sendVerificationEmail = (to: string, name: string, link: string, lang: "it" | "en") => sendMail("verify", to, name, link, lang);

// --- novità (news ed eventi) ---
export type NewsMail = { kind: "news" | "event"; title: string; excerpt: string; url: string; when?: string; where?: string };
const newsText = {
  it: { news: "Novità", event: "Evento", read: "Leggi tutto", when: "Quando", where: "Dove", why: "Ricevi questo messaggio perché hai acconsentito a ricevere email su eventi e pubblicazioni di A.R.G.H.", unsub: "Disattiva queste email" },
  en: { news: "News", event: "Event", read: "Read more", when: "When", where: "Where", why: "You receive this message because you agreed to get emails about A.R.G.H. events and publications.", unsub: "Turn off these emails" },
} as const;

export function buildNewsMail(m: NewsMail, name: string, unsubUrl: string, lang: "it" | "en") {
  const T = newsText[lang], C = common[lang];
  const row = (k: string, v?: string) => (v ? `<p style="margin:0 0 4px;font-size:14px;color:#cfd8ee;"><b style="color:#fff;">${esc(k)}:</b> ${esc(v)}</p>` : "");
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title)}</title></head>
<body bgcolor="#050816" style="margin:0;padding:0;background:#050816;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(m.excerpt)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050816" style="background:#050816;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#0d1226" style="width:100%;max-width:560px;background:#0d1226;border:1px solid #1c2547;border-radius:20px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:#29b6f6;background-image:linear-gradient(90deg,#29b6f6,#8b6cff);">&nbsp;</td></tr>
    <tr><td align="center" bgcolor="#070b1a" style="padding:26px 24px 6px;background:#070b1a;"><img src="${siteUrl}/logo-mail.png" width="150" height="150" alt="A.R.G.H." style="display:block;width:150px;height:150px;border:0;"></td></tr>
    <tr><td style="padding:24px 34px 6px;color:#e9eefc;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#29b6f6;">${esc(m.kind === "event" ? T.event : T.news)}</p>
      <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:#ffffff;">${esc(m.title)}</h1>
      ${row(T.when, m.when)}${row(T.where, m.where)}
      <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:#cfd8ee;">${esc(m.excerpt)}</p>
    </td></tr>
    <tr><td align="center" style="padding:22px 34px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#29b6f6" style="border-radius:999px;background:#29b6f6;background-image:linear-gradient(135deg,#29b6f6,#8b6cff);">
        <a href="${esc(m.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(T.read)}</a>
      </td></tr></table>
    </td></tr>
    <tr><td align="center" bgcolor="#070b1a" style="padding:18px 24px;border-top:1px solid #1c2547;background:#070b1a;font-size:12px;line-height:1.6;color:#6b7799;">${esc(C.hello(name).replace(/,$/, ""))} · ${esc(T.why)}<br><a href="${esc(unsubUrl)}" style="color:#29b6f6;">${esc(T.unsub)}</a><br>${esc(C.sign)}</td></tr>
  </table>
</td></tr></table></body></html>`;
  const plain = `${m.title}\n${[m.when && `${T.when}: ${m.when}`, m.where && `${T.where}: ${m.where}`].filter(Boolean).join("\n")}\n\n${m.excerpt}\n\n${T.read}: ${m.url}\n\n${T.why}\n${T.unsub}: ${unsubUrl}\n\n${C.sign}`;
  return { subject: `${m.kind === "event" ? "📅" : "🛰️"} ${m.title} · A.R.G.H.`, html, text: plain };
}

export async function sendNewsMail(to: string, name: string, m: NewsMail, unsubUrl: string, lang: "it" | "en") {
  const { subject, html, text: plain } = buildNewsMail(m, name, unsubUrl, lang);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transport().sendMail({
    from: `"A.R.G.H." <${from}>`, to, subject, text: plain, html,
    headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
}
