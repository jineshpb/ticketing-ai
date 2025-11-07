import { inngest } from "../client.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import sendEmail from "../../utils/email.js";


export const onUserSignup = inngest.createFunction(
    {id: "on-user-signup", retries: 2},
    {event: "user/signup"},
    async ({event, step}) => {

        try {
            const {email} = event.data;
            const user = await step.run("get-user-email", async () => {
                const userObject = await User.findOne({email});
                if (!userObject) {
                    throw new NonRetriableError("User no longer exists in the database");
                }
                return userObject;
            });

            const emailResult = await step.run("send-welcome-email", async ()=>{
                try {
                    const subject = `Welcome to the app`
                    const message = `Hi, 
                    \n\n
                    Thanks for signing up. We are glad to have you onboard!
                    `

                    const info = await sendEmail(user.email, subject, message);
                    return { 
                        success: true, 
                        messageId: info?.messageId || 'test-mode',
                        to: user.email 
                    };
                } catch (emailError) {
                    // Email sending is not critical - log but don't fail the function
                    console.error("Failed to send welcome email:", emailError.message);
                    return { 
                        success: false, 
                        error: emailError.message 
                    };
                }
            })

            return {
                success: true,
                emailSent: emailResult?.success || false,
                emailResult
            }
        } catch (error) {
            console.error("error runing step", error.message);
            return { success: false}
        }
    }
);