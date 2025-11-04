import { inngest } from "../client";
import User from "../../models/user";
import { NonRetriableError } from "inngest";
import SendmailTransport from "nodemailer/lib/sendmail-transport";


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

            await step.run("send-welcome-email", async ()=>{
                const subject = `Welcome to the app`
                const message = `Hi, 
                \n\n
                Thanks for signing up. We are glad to have you onboard!
                `

                await SendmailTransport(user.email, subject, message)
            })

            return {success: true}
        } catch (error) {
            console.error("error runing step", error.message);
            return { success: false}
        }
    }
);