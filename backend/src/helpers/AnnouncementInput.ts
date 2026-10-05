import AppError from "../errors/AppError";

export interface AnnouncementInput {
  title?: string;
  text?: string;
  priority?: number;
  status?: boolean;
}

// Só os campos editáveis vêm do corpo (antes o corpo inteiro ia para o
// modelo, inclusive companyId e mediaPath).
export const parseAnnouncement = (body: Record<string, unknown>, creating: boolean): AnnouncementInput => {
  const data: AnnouncementInput = {};
  if (body.title !== undefined || creating) data.title = String(body.title ?? "").trim();
  if (body.text !== undefined || creating) data.text = String(body.text ?? "").trim();
  if ((creating || body.title !== undefined) && !data.title) throw new AppError("ERR_ANNOUNCEMENT_REQUIRED", 400);
  if ((creating || body.text !== undefined) && !data.text) throw new AppError("ERR_ANNOUNCEMENT_REQUIRED", 400);
  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    if (![1, 2, 3].includes(priority)) throw new AppError("ERR_ANNOUNCEMENT_INVALID", 400);
    data.priority = priority;
  } else if (creating) data.priority = 3;
  if (body.status !== undefined) {
    if (![true, false, "true", "false"].includes(body.status as never)) throw new AppError("ERR_ANNOUNCEMENT_INVALID", 400);
    data.status = body.status === true || body.status === "true";
  } else if (creating) data.status = true;
  return data;
};
