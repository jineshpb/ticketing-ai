import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/user";
import ticketRoutes from "./routes/ticket";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { onUserSignup } from "./inngest/functions/on-signup";
import { onTicketCreated } from "./inngest/functions/on-ticket-create"

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/inngest", serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
}))

mongoose
    .connect(process.env.MONGO_URI)
    .then(()=>{
        console.log("Connected to MongoDB 😃");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} 😃`);
        });

    })
    .catch((err) => console.log(err));