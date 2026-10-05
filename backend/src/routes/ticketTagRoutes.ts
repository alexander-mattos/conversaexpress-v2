import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketTagController from "../controllers/TicketTagController";

const ticketTagRoutes = express.Router();

// Antes de "/:ticketId/:tagId", senão "kanban" seria lido como tagId.
ticketTagRoutes.put("/ticket-tags/:ticketId/kanban", isAuth, TicketTagController.kanban);
ticketTagRoutes.put("/ticket-tags/:ticketId/:tagId", isAuth, TicketTagController.store);
ticketTagRoutes.delete("/ticket-tags/:ticketId", isAuth, TicketTagController.remove);

export default ticketTagRoutes;
