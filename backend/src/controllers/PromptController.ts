import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import { assertExistsInCompany } from "../helpers/CompanyAccess";
import CreatePromptService from "../services/PromptServices/CreatePromptService";
import DeletePromptService from "../services/PromptServices/DeletePromptService";
import ListPromptsService from "../services/PromptServices/ListPromptsService";
import ShowPromptService from "../services/PromptServices/ShowPromptService";
import UpdatePromptService from "../services/PromptServices/UpdatePromptService";
import Queue from "../models/Queue";
import Whatsapp from "../models/Whatsapp";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

// A fila de transferência do prompt precisa ser da empresa.
const assertPromptQueue = async (queueId: unknown, req: Request): Promise<void> => {
  if (queueId) await assertExistsInCompany(Queue, queueId, req.user);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;
  const { prompts, count, hasMore } = await ListPromptsService({ searchParam, pageNumber, companyId });

  return res.status(200).json({ prompts, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, apiKey, prompt, maxTokens, temperature, queueId, maxMessages, model } = req.body;
  await assertPromptQueue(queueId, req);
  const promptTable = await CreatePromptService({ name, apiKey, prompt, maxTokens, temperature, queueId, maxMessages, companyId, model });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("prompt", {
    action: "update",
    prompt: promptTable
  });

  return res.status(200).json(promptTable);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const { companyId } = req.user;
  const prompt = await ShowPromptService({ promptId, companyId });

  return res.status(200).json(prompt);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const promptData = req.body;
  const { companyId } = req.user;
  await assertPromptQueue(promptData.queueId, req);

  const prompt = await UpdatePromptService({ promptData, promptId, companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("prompt", {
    action: "update",
    prompt
  });

  return res.status(200).json(prompt);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const { companyId } = req.user;

  // Em uso numa conexão: antes respondia 200 e a tela tirava o item da lista.
  const inUse = await Whatsapp.count({ where: { promptId: +promptId, companyId } });
  if (inUse > 0) throw new AppError("ERR_PROMPT_IN_USE", 400);

  await DeletePromptService(promptId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("prompt", {
    action: "delete",
    intelligenceId: +promptId
  });

  return res.status(200).json({ message: "Prompt deleted" });
};
