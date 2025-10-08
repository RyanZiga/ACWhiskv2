import React, { useState } from "react";

// ✅ Put your Gemini API key in your .env file like this:
// VITE_GEMINI_API_KEY=your_api_key_here
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- Utility: Automatically detect supported Gemini model ---
let cachedModel: string | null = null;

async function getSupportedGeminiModel(): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    const data = await res.json();

    if (!data.models) throw new Error("No models found");

    const available = data.models.filter((m: any) =>
      m.supportedGenerationMethods?.includes("generateContent")
    );

    console.log(
      "✅ Gemini models available:",
      available.map((m: any) => m.name)
    );

    const preferred =
      available.find((m: any) => m.name.includes("gemini-2.0-flash")) ||
      available.find((m: any) => m.name.includes("gemini-1.5-flash")) ||
      available[0];

    cachedModel = preferred?.name || "models/gemini-1.5-flash";
    return cachedModel;
  } catch (error) {
    console.error("❌ Error fetching Gemini models:", error);
    return "models/gemini-1.5-flash"; // fallback
  }
}

// --- Main ChatBot Component ---
const ChatBot: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const model = await getSupportedGeminiModel();
      console.log("Using Gemini model:", model);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userMessage.text }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 512,
            },
          }),
        }
      );

      const data = await res.json();
      const replyText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "⚠️ Gemini didn’t return a response.";

      setMessages((prev) => [...prev, { role: "bot", text: replyText }]);
    } catch (err: any) {
      console.error("Gemini error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            "⚠️ Gemini API error: " +
            (err.message || "Unknown error, please try again later."),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-3">🤖 Gemini ChatBot</h2>
      <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-md ${
              m.role === "user"
                ? "bg-blue-100 text-right"
                : "bg-gray-100 text-left"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
