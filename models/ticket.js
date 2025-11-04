import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String},
    status: {type: String, default: "TODO", required: true},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    assignedTo: {type: mongoose.Schema.Types.ObjectId, ref: "User", default: null},
    priority: String,
    deadline: Date,
    helpfulNotes: String,
    relatedSkills: {type: [String]},
    createdAt: {type: Date, default: Date.now},
})

export default mongoose.model("Ticket", ticketSchema)