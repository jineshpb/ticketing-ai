import express from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  createTicket,
  getTickets,
  getTicket,
  notifyTicketOpened,
  updateTicketStatus,
  addTicketComment,
  updateAiSuggestionDecision,
} from "../controllers/ticket.js";

const router = express.Router();

router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);
router.post("/:id/open", authenticate, notifyTicketOpened);
router.patch("/:id/status", authenticate, updateTicketStatus);
router.post("/:id/comments", authenticate, addTicketComment);
router.patch(
  "/:id/comments/:commentId/decision",
  authenticate,
  updateAiSuggestionDecision
);

export default router;
