import nodemailer from "nodemailer";

// Envio de e-mail pela conta SMTP do .env (MAIL_*). Porta 465 usa TLS
// direto; as outras (587, 25) negociam STARTTLS.
export const isMailConfigured = (): boolean =>
  !!(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);

export const sendMail = async ({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> => {
  const port = Number(process.env.MAIL_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.MAIL_USER, to, subject, html });
};
