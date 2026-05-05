process.stdout.setMaxListeners(0);
process.stdin.resume();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const recentRequests = new Map();

async function fetchWithRetry(url, options, retries = 2) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries === 0) throw err;
    return fetchWithRetry(url, options, retries - 1);
  }
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function estimateReadingTime(text) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

function isDuplicate(key) {
  const now = Date.now();

  if (recentRequests.has(key)) {
    const lastTime = recentRequests.get(key);
    if (now - lastTime < 5000) return true;
  }

  recentRequests.set(key, now);
  return false;
}

app.post("/summarize", async (req, res) => {

  const { url } = req.body;

if (isDuplicate(url)) {
  return res.json({
    summary: "Duplicate request blocked (cached within 5s)"
  });
}

 try {
    const { title, content, url, mode } = req.body;

    if (!content || content.length < 50) {
  return res.json({
    summary: "⚠️ Not enough content to summarize",
    readingTime: "—",
    source: "empty"
  });
}

    function cleanPageText(text) {
  return text
    .replace(/\s+/g, " ")                // collapse spaces
    .replace(/cookie|subscribe|sign up|advertisement/gi, "")
    .replace(/[^a-zA-Z0-9.,!?•\s]/g, "") // remove junk symbols
    .trim()
    .slice(0, 2500);                    // HARD LIMIT (VERY IMPORTANT)
}

    function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const cleanedContent = cleanPageText(content);

const prompt = `
You are a clean summarizer.

RULES:
- Use ONLY this format:
• Point 1
• Point 2
• Point 3

- NO asterisks (*)
- NO plus signs (+)
- NO headings like "Overview"
- NO markdown (**)

${req.body.mode === "short"
  ? "- EXACTLY 3 bullet points"
  : "- 5 to 7 clear bullet points"}

CONTENT:
${cleanedContent}
`;

const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 25000); // 25s safety buffer

const response = await fetch(
  "https://api.groq.com/openai/v1/chat/completions",
  {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    })
  }
);

const data = await response.json();

if (!response.ok) {
  console.error("Groq API Error:", data);

  const isQuota = data?.error?.code === 429;

  return res.status(200).json({
    summary: isQuota
      ? "⚠️ AI quota reached. Try again soon."
      : "⚠️ AI request failed. Please try again.",
    readingTime: "—",
    source: "api-error"
  });
} 
console.log("✅ GROQ RESPONSE:", data);

if (!data.choices || data.choices.length === 0) {
  throw new Error("No choices returned from Groq");
}

const summary = data.choices[0]?.message?.content;

if (!summary) {
  throw new Error("No summary text returned");
}

   return res.json({
  summary,
  readingTime: estimateReadingTime(content),
  wordCount: countWords(content),
  source: "groq"
});

  } catch (err) {
    console.error("🔥 GROQ ERROR:", err);

    if (err.name === "AbortError") {
  return res.json({
    summary: "⚠️ Request took too long. Try again.",
    readingTime: "—",
    source: "timeout"
  });
}

    const fallbackSummary = `
- This page contains informational content.
- AI summary is temporarily unavailable.
- Key idea: ${req.body.title || "No title provided"}.
- Try again later for full AI-generated insights.
`;

    return res.json({
      summary: fallbackSummary,
      readingTime: estimateReadingTime(req.body.content || ""),
      source: "fallback",
      error: err.message
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});