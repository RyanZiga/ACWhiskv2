import React, { useState, useRef, useEffect } from "react"
import { Bot, Send, Loader2, Sparkles, X } from "lucide-react"

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// 🔹 Cache the valid model once fetched
let cachedGeminiModel: string | null = null

// ✅ Fetch valid model dynamically
async function getSupportedGeminiModel(): Promise<string> {
  if (cachedGeminiModel) return cachedGeminiModel

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + GEMINI_API_KEY
    )
    const data = await response.json()

    if (!data.models) throw new Error("No models returned from Gemini API")

    const available = data.models.filter((m: any) =>
      m.supportedGenerationMethods?.includes("generateContent")
    )

    console.log("✅ Available Gemini models:", available.map((m: any) => m.name))

    const preferred =
      available.find((m: any) => m.name.includes("gemini-2.0-flash")) ||
      available.find((m: any) => m.name.includes("gemini-1.5-flash")) ||
      available.find((m: any) => m.name.includes("gemini-pro")) ||
      available[0]

    cachedGeminiModel = preferred?.name || "models/gemini-1.5-flash"
    return cachedGeminiModel
  } catch (error) {
    console.error("❌ Error fetching Gemini models:", error)
    return "models/gemini-1.5-flash" // fallback
  }
}

// ✅ Get response from Gemini API
async function fetchGeminiResponse(userMessage: string): Promise<string> {
  try {
    const model = await getSupportedGeminiModel()
    console.log("💬 Using Gemini model:", model)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      console.error("Gemini API Error Details:", err)
      throw new Error(err.error?.message || "Unknown Gemini API error")
    }

    const data = await response.json()
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text

    return aiResponse || "Sorry, I couldn't generate a response."
  } catch (error: any) {
    console.error("Error getting response:", error)

    if (
      error.message.includes("not found") ||
      error.message.includes("unsupported") ||
      error.message.includes("unavailable")
    ) {
      return "⚠️ Gemini model is temporarily unavailable. Please switch to FAQ mode or try again later."
    }

    return "An unexpected error occurred. Please try again later."
  }
}

// ✅ Simple local fallback FAQ dataset
const FAQS = [
  {
    question: "How do I boil an egg?",
    answer: "Place eggs in boiling water for 6–10 minutes depending on desired firmness.",
    keywords: ["egg", "boil", "cooking egg"],
  },
  {
    question: "How do I cook rice perfectly?",
    answer: "Use a 1:2 rice-to-water ratio, bring to a boil, then simmer for 18 minutes.",
    keywords: ["rice", "cook", "boil rice"],
  },
]

function findBestAnswer(query: string) {
  const lower = query.toLowerCase()
  return (
    FAQS.find(
      (faq) =>
        faq.question.toLowerCase().includes(lower) ||
        faq.keywords.some((k) => lower.includes(k))
    )?.answer || null
  )
}

// ✅ Main Chatbot Component
export default function ChatBot() {
  const [messages, setMessages] = useState<{ type: "user" | "bot"; text: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setMessages((m) => [...m, { type: "user", text: userMessage }])
    setInput("")
    setIsLoading(true)

    let botReply: string

    if (aiEnabled) {
      botReply = await fetchGeminiResponse(userMessage)
    } else {
      const faqAnswer = findBestAnswer(userMessage)
      botReply =
        faqAnswer ||
        "I couldn’t find an answer for that. Try rephrasing or enable AI mode."
    }

    setMessages((m) => [...m, { type: "bot", text: botReply }])
    setIsLoading(false)
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <span>Chef's AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="p-4 h-80 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl max-w-[80%] ${
                  msg.type === "user"
                    ? "ml-auto bg-blue-100 text-right"
                    : "bg-gray-100 text-left"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="animate-spin" size={16} /> typing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex items-center gap-2">
            <input
              className="flex-1 border rounded-lg p-2 text-sm"
              placeholder="Type a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Toggle AI */}
          <div className="p-2 text-center text-xs text-gray-500">
            <label className="flex justify-center items-center gap-2">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={() => setAiEnabled((v) => !v)}
              />
              Use Gemini AI
            </label>
          </div>
        </div>
      )}
    </>
  )
}
