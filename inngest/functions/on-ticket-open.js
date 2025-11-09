import { NonRetriableError } from "inngest";
import mongoose from "mongoose";
import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import runModeratorAssistAgent from "../../utils/moderatorAssistAgent.js";
import sendEmail from "../../utils/email.js";

const sanitizeDate = (value) => {
  if (!value) {
    return undefined;
  }

  const coerced = new Date(value);
  if (Number.isNaN(coerced.getTime())) {
    return undefined;
  }

  return coerced;
};

const sanitizeFollowUpTasks = (tasks) => {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .filter((task) => task && task.title)
    .map((task) => ({
      title: task.title,
      suggestedAssigneeId: task.suggestedAssigneeId,
      suggestedAssigneeName: task.suggestedAssigneeName,
      dueBy: sanitizeDate(task.dueBy),
      notes: task.notes,
    }));
};

const sanitizeSimilarTickets = (tickets) => {
  if (!Array.isArray(tickets)) {
    return [];
  }

  return tickets
    .filter((item) => item && (item.ticketId || item.title || item.rationale))
    .map((item) => ({
      ticketId: item.ticketId,
      title: item.title,
      rationale: item.rationale,
    }));
};

const normalizeSuggestions = (suggestions) => {
  if (!suggestions) {
    return null;
  }

  const confidenceScore = Number.isFinite(Number(suggestions.confidenceScore))
    ? Number(suggestions.confidenceScore)
    : undefined;

  return {
    replyProposal: suggestions.replyProposal || null,
    followUpTasks: sanitizeFollowUpTasks(suggestions.followUpTasks),
    similarTickets: sanitizeSimilarTickets(suggestions.similarTickets),
    confidenceScore:
      typeof confidenceScore === "number" &&
      confidenceScore >= 0 &&
      confidenceScore <= 1
        ? confidenceScore
        : undefined,
    generatedAt: sanitizeDate(suggestions.generatedAt) || new Date(),
  };
};

export const onTicketOpened = inngest.createFunction(
  { id: "on-ticket-opened" },
  { event: "ticket/opened" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data || {};
      if (!ticketId) {
        throw new NonRetriableError(
          "ticketId is required for moderator assistance."
        );
      }

      const ticket = await step.run("load-ticket", async () => {
        const ticketDoc = await Ticket.findById(ticketId).lean();
        if (!ticketDoc) {
          throw new NonRetriableError(
            "Ticket not found for moderator assistance."
          );
        }

        return ticketDoc;
      });

      if (ticket.status === "RESOLVED") {
        return {
          success: true,
          message: "Ticket already resolved; moderator assistance skipped.",
        };
      }

      const agentSuggestions = await runModeratorAssistAgent({
        ticket,
        comments: ticket.comments || [],
      });

      const suggestions = normalizeSuggestions(agentSuggestions);

      if (!suggestions) {
        return {
          success: true,
          message: "No moderator suggestions generated.",
        };
      }

      const updatedTicket = await step.run(
        "persist-moderator-suggestions",
        async () => {
          const updatePayload = {
            $set: {
              aiSuggestions: suggestions,
              status: "RESOLVED",
            },
          };

          if (suggestions.replyProposal) {
            const timestamp = new Date();
            updatePayload.$push = {
              comments: {
                commentId: new mongoose.Types.ObjectId(),
                role: "ai-assistant",
                body: suggestions.replyProposal,
                isAiGenerated: true,
                metadata: {
                  followUpTasks: suggestions.followUpTasks,
                  similarTickets: suggestions.similarTickets,
                  confidenceScore: suggestions.confidenceScore,
                },
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            };
          }

          return await Ticket.findByIdAndUpdate(ticketId, updatePayload, {
            new: true,
          });
        }
      );

      await step.run("notify-assigned-moderator", async () => {
        if (!updatedTicket?.assignedTo) {
          return null;
        }

        const moderator = await Ticket.populate(updatedTicket, {
          path: "assignedTo",
          select: "email",
        });

        if (!moderator?.assignedTo?.email) {
          return null;
        }

        const subject = "AI suggestions ready for your ticket";
        const message = `Hi,

AI-generated assistance is available for the ticket "${updatedTicket.title}".

Suggested reply:
${suggestions.replyProposal || "No reply suggestion provided."}

Please review the ticket dashboard for follow-up tasks and related tickets.`;

        await sendEmail(moderator.assignedTo.email, subject, message);
        return true;
      });

      return { success: true };
    } catch (error) {
      console.error("Moderator assistance function failed:", error.message);
      return { success: false };
    }
  }
);
