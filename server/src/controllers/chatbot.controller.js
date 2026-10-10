const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const { askChatbot } = require("../services/chatbot.service");

// POST /api/chatbot  { message, history? }
const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  if (!message) throw new ApiError(400, "message is required");
  const reply = await askChatbot(message, history || []);
  sendResponse(res, 200, "Chatbot reply", { reply });
});

module.exports = { chat };
