// Calls Google's Gemini API for the student-facing help chatbot.
// Add GEMINI_API_KEY to your .env - that's the one key you said you'd add yourself.
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

async function askChatbot(message, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "The chatbot isn't configured yet. Add GEMINI_API_KEY to server/.env to enable it.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const contents = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [
          {
            text: "You are a helpful support assistant for EduPlatform, an online learning site. Answer student questions about courses, enrollment, payments and progress concisely.",
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
}

module.exports = { askChatbot };
