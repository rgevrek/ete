// The sign-in mail, by SMTP_URL (the platform's Stalwart: smtps://no-reply%40rgevrek.de:…@mail.rgevrek.de:465).
// Without SMTP_URL (development) the link is written to the log.

import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | undefined;

export async function sendLink(to: string, link: string): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL is not set");
    console.log(`sign-in link for ${to}: ${link}`);
    return;
  }
  transport ??= nodemailer.createTransport(url);
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "ETE <no-reply@rgevrek.de>",
    to,
    subject: "ETE: Giriş bağlantınız",
    text:
      `Risale-i Nur ETE okuyucusuna giriş için bu bağlantıyı açın (15 dakika geçerlidir, bir kez kullanılır):\n\n` +
      `${link}\n\nBu girişi siz istemediyseniz bu e-postayı silebilirsiniz.\n`,
    html:
      `<p>Risale-i Nur ETE okuyucusuna giriş için:</p>` +
      `<p><a href="${link}">Giriş yap</a></p>` +
      `<p style="color:#666">Bağlantı 15 dakika geçerlidir ve bir kez kullanılır. Bu girişi siz istemediyseniz bu e-postayı silebilirsiniz.</p>`,
  });
}
