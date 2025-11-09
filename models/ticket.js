import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String },
    body: { type: String, required: true },
    isAiGenerated: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    _id: false,
    timestamps: true,
  }
);

const followUpTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    suggestedAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    suggestedAssigneeName: { type: String },
    dueBy: { type: Date },
    notes: { type: String },
  },
  {
    _id: false,
  }
);

const similarTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    title: { type: String },
    rationale: { type: String },
  },
  {
    _id: false,
  }
);

const aiSuggestionSchema = new mongoose.Schema(
  {
    replyProposal: { type: String },
    followUpTasks: { type: [followUpTaskSchema], default: [] },
    similarTickets: { type: [similarTicketSchema], default: [] },
    confidenceScore: { type: Number },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  }
);

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: "TODO", required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  priority: String,
  deadline: Date,
  helpfulNotes: String,
  relatedSkills: { type: [String] },
  comments: { type: [commentSchema], default: [] },
  aiSuggestions: { type: aiSuggestionSchema, default: undefined },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Ticket", ticketSchema);
