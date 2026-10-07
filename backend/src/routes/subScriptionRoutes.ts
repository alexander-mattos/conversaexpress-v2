import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = express.Router();
subscriptionRoutes.post("/subscription", isAuth, SubscriptionController.createSubscription);
// Webhook do Asaas, autenticado pelo cabeçalho asaas-access-token.
subscriptionRoutes.post("/subscription/webhook", SubscriptionController.webhook);

export default subscriptionRoutes;
