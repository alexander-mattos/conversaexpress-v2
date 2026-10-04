import { Request, Response } from "express";
import DashboardDataService, { DashboardData, Params } from "../services/ReportService/DashbardDataService";
import { TicketsAttendance } from "../services/ReportService/TicketsAttendance";
import { TicketsDayService } from "../services/ReportService/TicketsDayService";
import AppError from "../errors/AppError";

type IndexQuery = {
  initialDate: string;
  finalDate: string;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validateDates = ({ initialDate, finalDate }: IndexQuery): void => {
  if (!DATE_REGEX.test(initialDate || "") || !DATE_REGEX.test(finalDate || "")) {
    throw new AppError("ERR_INVALID_DATE", 400);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const params: Params = req.query;
  const { companyId } = req.user;
  let daysInterval = 3;

  const dashboardData: DashboardData = await DashboardDataService(
    companyId,
    params
  );
  return res.status(200).json(dashboardData);
};

export const reportsUsers = async (req: Request, res: Response): Promise<Response> => {

  const { initialDate, finalDate } = req.query as IndexQuery;
  const { companyId } = req.user;
  validateDates({ initialDate, finalDate });

  const { data } = await TicketsAttendance({ initialDate, finalDate, companyId });

  return res.json({ data });

}

export const reportsDay = async (req: Request, res: Response): Promise<Response> => {

  const { initialDate, finalDate } = req.query as IndexQuery;
  const { companyId } = req.user;
  validateDates({ initialDate, finalDate });

  const { count, data } = await TicketsDayService({ initialDate, finalDate, companyId });

  return res.json({ count, data });

}
