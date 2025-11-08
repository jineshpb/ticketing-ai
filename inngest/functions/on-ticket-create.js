import { inngest } from "../client.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import sendEmail from "../../utils/email.js";
import Ticket from "../../models/ticket.js";
import analyzeTicket from "../../utils/ai.js";

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

            const relatedSkills = await step.run("ai-processing", async () => {
                let skills = []
                if (aiResponse) {
                    await Ticket.findByIdAndUpdate(ticket._id, {
                        priority: ["low","medium", "high"].includes(aiResponse.priority) ? "medium" : aiResponse.priority,
                        helpfulNotes: aiResponse.helpfulNotes,
                        status: "IN_PROGRESS",
                        relatedSkills: skills,
                    })
                    skills = aiResponse.relatedSkills;
                }

                return skills;
            })

            const moderator = await step.run("assign-moderator", async () => {
                const moderatorUser = await User.findOne({
                    role: "moderator", 
                    skills: {
                        $elemMatch: {
                            $regex: relatedSkills.join("|"),
                            $options: "i",
                        },
                    }
                })
                if (moderatorUser) {
                    await Ticket.findByIdAndUpdate(ticket._id, {assignedTo: moderatorUser._id});
                    return moderatorUser;
                }

                const adminUser = await User.findOne({role: "admin"});
                if (!adminUser) {
                    throw new NonRetriableError("No moderator or admin available to assign.");
                }

                await Ticket.findByIdAndUpdate(ticket._id, {assignedTo: adminUser._id});
                return adminUser;
            });

            await step.run("send-email-notification", async () => {
                if (moderator) {
                    const finalTicket = await Ticket.findById(ticket._id)
                    const subject = `New ticket assigned to you`;
                    const message = `Hi, \n\n A new ticket has been assigned to you. Please review it and provide a solution.`;
                    await sendEmail(moderator.email, subject, message + `\n\nTicket: ${finalTicket.title}\n\nDescription: ${finalTicket.description}`);
                }
            })

            return {success: true}
        } catch (error) {
            console.error("error running step", error.message);
            return {success: false};
        }
    }
);