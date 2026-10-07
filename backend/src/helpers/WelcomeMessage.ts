// Textos de boas-vindas da empresa nova (e-mail e WhatsApp). A senha só
// entra quando foi gerada pelo sistema (criação pelo super).
export interface WelcomeData {
  companyName: string;
  email: string;
  planName: string;
  planValue: number;
  users: number;
  connections: number;
  queues: number;
  dueDate?: string | null;
  loginUrl: string;
  password?: string;
}

const brl = (value: number): string =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const day = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const escapeHtml = (value: string): string =>
  String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export const welcomeText = (d: WelcomeData): string => {
  const due = day(d.dueDate);
  return [
    `Olá, *${d.companyName}*! Seja bem-vindo(a) ao ConversaExpress. 🎉`,
    "",
    "*Seus dados de acesso*",
    `Login: ${d.email}`,
    ...(d.password ? [`Senha provisória: ${d.password}`, "_Troque a senha no primeiro acesso, em Perfil._"] : []),
    `Acesse: ${d.loginUrl}`,
    "",
    `*Plano ${d.planName}* — ${brl(d.planValue)}/mês`,
    `Usuários: ${d.users} · Conexões: ${d.connections} · Filas: ${d.queues}`,
    ...(due ? [`Período de teste até ${due}.`] : [])
  ].join("\n");
};

export const welcomeHtml = (d: WelcomeData): string => {
  const due = day(d.dueDate);
  const e = escapeHtml;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#666">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;
  return `<!DOCTYPE html><html lang="pt"><body style="margin:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:24px 12px">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#ad2ce2;color:#fff;padding:20px 24px;font-size:20px;font-weight:700">Bem-vindo(a) ao ConversaExpress</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 16px">Olá, <strong>${e(d.companyName)}</strong>! Sua conta foi criada.</p>
<h3 style="margin:16px 0 8px;color:#ad2ce2">Dados de acesso</h3>
<table cellpadding="0" cellspacing="0" role="presentation">
${row("Login:&nbsp;", e(d.email))}
${d.password ? row("Senha provisória:&nbsp;", e(d.password)) : ""}
</table>
${d.password ? `<p style="margin:8px 0;color:#666;font-size:13px">Troque a senha no primeiro acesso, em Perfil.</p>` : ""}
<p style="margin:20px 0"><a href="${e(d.loginUrl)}" style="background:#ad2ce2;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">Acessar o sistema</a></p>
<h3 style="margin:16px 0 8px;color:#ad2ce2">Plano ${e(d.planName)}</h3>
<table cellpadding="0" cellspacing="0" role="presentation">
${row("Valor:&nbsp;", `${brl(d.planValue)}/mês`)}
${row("Usuários:&nbsp;", String(d.users))}
${row("Conexões:&nbsp;", String(d.connections))}
${row("Filas:&nbsp;", String(d.queues))}
${due ? row("Teste até:&nbsp;", due) : ""}
</table>
</td></tr></table></td></tr></table></body></html>`;
};

// Telefone do formulário para o formato do WhatsApp: só dígitos e DDI 55
// quando vier só DDD + número.
export const whatsappNumber = (phone?: string | null): string | null => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return null;
};
