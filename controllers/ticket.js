import mongoose from "mongoose";
import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });
    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString() || null,
      },
    });
    return res.status(201).json({
      message: "Ticket created and processing started successfully",
      ticket: newTicket,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to create ticket and process it",
      details: error.message,
    });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    if (user.role !== "user") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      tickets = await Ticket.find({ createdBy: user._id })
        .select("title description status createdAt")
        .sort({ createdAt: -1 });
    }
    return res.status(200).json(tickets);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: "Failed to get tickets", details: error.message });
  }
};

const buildTicketQueryForUser = (user, ticketId) => {
  if (user.role !== "user") {
    return Ticket.findById(ticketId)
      .populate("assignedTo", ["email", "_id"])
      .populate("comments.author", ["email", "_id"]);
  }

  return Ticket.findOne({
    createdBy: user._id,
    _id: ticketId,
  })
    .select(
      "title description status createdAt helpfulNotes relatedSkills priority aiSuggestions comments assignedTo createdBy"
    )
    .populate("assignedTo", ["email", "_id"])
    .populate("comments.author", ["email", "_id"]);
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    const ticket = await buildTicketQueryForUser(user, req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    return res.status(200).json(ticket);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to get ticket",
      details: error.message,
    });
  }
};

export const notifyTicketOpened = async (req, res) => {
  try {
    const user = req.user;
    const ticket = await buildTicketQueryForUser(user, req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === "RESOLVED") {
      return res.status(200).json({
        message: "Ticket already resolved. Moderator assistance skipped.",
      });
    }

    await inngest.send({
      name: "ticket/opened",
      data: {
        ticketId: ticket._id.toString(),
        openedBy: user._id.toString(),
      },
    });

    return res
      .status(202)
      .json({ message: "Moderator assistance triggered for ticket." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to notify ticket opened",
      details: error.message,
    });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowedStatuses = ["TODO", "IN_PROGRESS", "RESOLVED"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const isOwner = ticket.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to update status." });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("assignedTo", ["email", "_id"])
      .populate("comments.author", ["email", "_id"]);

    return res.status(200).json(updatedTicket);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to update ticket status",
      details: error.message,
    });
  }
};

export const addTicketComment = async (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Comment body is required." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const isOwner = ticket.createdBy.toString() === req.user._id.toString();
    const isElevated =
      req.user.role === "admin" || req.user.role === "moderator";

    if (!isOwner && !isElevated) {
      return res.status(403).json({ error: "Not authorized to comment." });
    }

    const timestamp = new Date();
    const commentId = new mongoose.Types.ObjectId();
    const commentPayload = {
      commentId,
      author: req.user._id,
      role: req.user.role,
      body: body.trim(),
      isAiGenerated: false,
      metadata: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: commentPayload } },
      { new: true }
    )
      .populate("assignedTo", ["email", "_id"])
      .populate("comments.author", ["email", "_id"]);

    return res.status(201).json(updatedTicket);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to add comment",
      details: error.message,
    });
  }
};

export const updateAiSuggestionDecision = async (req, res) => {
  try {
    const { decision } = req.body || {};
    const { id: ticketId, commentId } = req.params;

    const allowedDecisions = ["accepted", "rejected"];
    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({ error: "Invalid decision value." });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket identifier." });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: "Invalid comment identifier." });
    }

    const moderatorRoles = ["admin", "moderator"];
    if (!moderatorRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to review AI responses." });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const targetComment = ticket.comments.find(
      (entry) => entry.commentId?.toString() === commentId
    );

    if (!targetComment || !targetComment.isAiGenerated) {
      return res.status(400).json({
        error: "Only AI-generated suggestions can be accepted or rejected.",
      });
    }

    targetComment.metadata = targetComment.metadata || {};
    targetComment.metadata.decision = decision;
    targetComment.metadata.decisionBy = req.user._id;
    targetComment.metadata.decisionAt = new Date();

    if (decision === "rejected") {
      ticket.status = "IN_PROGRESS";
    }

    ticket.markModified("comments");
    await ticket.save();
    await ticket.populate([
      { path: "assignedTo", select: "email _id" },
      { path: "comments.author", select: "email _id" },
    ]);

    return res.status(200).json(ticket);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Failed to update AI suggestion decision",
      details: error.message,
    });
  }
};
