import { createAgent, gemini } from "@inngest/agent-kit";

const parseAgentOutput = (raw) => {
  if (!raw) {
    return null;
  }

  try {
    const fencedMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i);
    const jsonCandidate = fencedMatch ? fencedMatch[1] : raw.trim();
    let parsed = JSON.parse(jsonCandidate);

    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }

    return parsed;
  } catch (error) {
    console.error(
      "Moderator assist agent failed to parse JSON:",
      error.message
    );
    console.error("Raw moderator assist response:", raw);
    return null;
  }
};

const buildCommentDigest = (comments = [], useFullHistory = false) => {
  if (!comments.length) {
    return "No prior comments available.";
  }

  const history = useFullHistory ? comments : comments.slice(-5);

  const formatted = history
    .map((comment, index) => {
      const authorLabel =
        comment?.role || comment?.author?.email || "participant";
      const body = comment?.body || "";
      return `${index + 1}. ${authorLabel}: ${body}`;
    })
    .join("\n");

  if (!formatted) {
    return "Comment content missing.";
  }

  return `Recent comments:\n${formatted}`;
};

const runModeratorAssistAgent = async ({ ticket, comments }) => {
  if (!ticket) {
    return null;
  }

  const includeAllComments =
    ticket?.status !== "RESOLVED" &&
    Array.isArray(comments) &&
    comments.length > 0;

  try {
    const moderatorAgent = createAgent({
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
      }),
      name: "Moderator Assistance Agent",
      system: `
                You support human moderators handling technical support tickets.

                Always respond with raw JSON only. Do not include markdown or additional prose.
            `,
    });

    const response = await moderatorAgent.run(`
            You assist moderators resolving tickets. Return a strict JSON object with these fields:
            {
                "replyProposal": "Suggested message to send back to the ticket author. Keep it actionable and empathetic.",
                "followUpTasks": [
                    {
                        "title": "Short task title",
                        "suggestedAssigneeId": "Optional MongoDB ObjectId string for a suggested assignee if available",
                        "suggestedAssigneeName": "Optional name for the suggested assignee",
                        "dueBy": "ISO date string deadline if you can infer one",
                        "notes": "Additional implementation guidance"
                    }
                ],
                "similarTickets": [
                    {
                        "ticketId": "Optional ticket identifier if referenced",
                        "title": "Ticket title if known",
                        "rationale": "Why this ticket is relevant"
                    }
                ],
                "confidenceScore": 0.0-1.0 number representing confidence in replyProposal,
                "generatedAt": "ISO timestamp for when this was created"
            }

            Ticket context:
            - Title: ${ticket.title || "N/A"}
            - Description: ${ticket.description || "N/A"}
            - Priority: ${ticket.priority || "unspecified"}
            - Status: ${ticket.status || "unspecified"}
            - Helpful notes: ${ticket.helpfulNotes || "none"}

            ${buildCommentDigest(comments, includeAllComments)}

            If you cannot provide part of the response, return null for that field.
        `);

    const rawContent = response?.output?.[0]?.content;
    const parsed = parseAgentOutput(rawContent);

    if (!parsed) {
      return null;
    }

    if (!parsed.generatedAt) {
      parsed.generatedAt = new Date().toISOString();
    }

    return parsed;
  } catch (error) {
    console.error("Moderator assist agent execution error:", error.message);
    return null;
  }
};

export default runModeratorAssistAgent;
