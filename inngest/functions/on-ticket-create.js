import { inngest } from "../client";
import User from "../../models/user";
import { NonRetriableError } from "inngest";
import SendmailTransport from "nodemailer/lib/sendmail-transport";
import Ticket from "../../models/ticket";
import analyzeTicket from "../../utils/ai";

export const onTicketCreated = inngest.createFunction(
    {id: "on-ticket-created",},
    {event: "ticket/created"},
    async ({event, step}) => {

        try {
            
            const {ticketId} = event.data;
            //fetch ticket from DB

            const ticket = await step.run("fetch-ticket", async () => {
                const ticketObject = await Ticket.findById(ticketId);
                if (!ticketObject) {
                    throw new NonRetriableError("Ticket not found");
                }
                return ticketObject;
            })

            //update ticket status

            await step.run("update-ticket-status", async () => {
                await Ticket.findByIdAndUpdate(ticketId, {status: "TODO"});
            })

            //analyze ticket
            const aiResponse = await analyzeTicket(ticket);

            await step.run("ai-processing", async () => {
                let skills = []
                if (aiResponse) {
                    await Ticket.findByIdAndUpdate(ticket._id, {
                        priority: ["low","medium", "high"].includes(aiResponse.priority) ? "medium" : "low",
                    })
                }
            })

            
        } catch (error) {
            
        }
      
    }
)