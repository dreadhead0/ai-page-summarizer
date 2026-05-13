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
app.use(express.json({limit: "1mb" }));

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

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Summarizer backend is running"
  });
});

app.post("/summarize", async (req, res) => {
  const { url, mode, content, title } = req.body;

  // Keyed by URL + Mode so you can switch modes without hitting the 5s block
  const requestKey = `${url}_${mode}`;
  if (isDuplicate(requestKey)) {
    return res.json({
      summary: "Processing... (Rate limited within 5s)"
    });
  }

  try {
    if (!content || content.length < 50) {
      return res.json({
        success: true,
        summary: "⚠️ Not enough content to summarize",
        readingTime: "—",
        source: "empty"
      });
    }

    function cleanPageText(text) {
      return text
        .replace(/\s+/g, " ")
        .replace(/cookie|subscribe|sign up|advertisement/gi, "")
        .replace(/[^a-zA-Z0-9.,!?•\s]/g, "")
        .trim()
        .slice(0, 2500); 
    }

    const cleanedContent = cleanPageText(content);

    // --- ENFORCED MODE LOGIC ---
    let modeInstruction = "";
    if (mode === "short") {
      modeInstruction = "Provide EXACTLY 3 short, punchy bullet points. Focus only on the absolute core message.";
    } else {
      modeInstruction = "Provide a DETAILED summary with 6 to 8 comprehensive bullet points. Include key facts, data, and nuances.";
    }

    const prompt = `
You are a precision summarizer. 

TASK: ${modeInstruction}

RULES:
- Use "•" as the bullet symbol.
- Start each point on a new line.
- NO bolding (**), NO headings, NO "Here is your summary" intro.
- NO markdown characters other than the bullets.

CONTENT:
${cleanedContent}
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

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
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1 // Forces the model to be more literal/strict
        })
      }
    );

    const data = await response.json();
    clearTimeout(timeout);

    if (!response.ok) {
      const isQuota = data?.error?.code === 429;
      return res.status(200).json({
        success: true,
        summary: isQuota ? "⚠️ AI quota reached." : "⚠️ AI request failed.",
        readingTime: "—",
        source: "api-error"
      });
    } 

    const summary = data.choices[0]?.message?.content;
    if (!summary) throw new Error("No summary text returned");

    return res.json({
      success: true,
      summary: summary.trim(),
      readingTime: estimateReadingTime(content),
      source: "groq"
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.json({
      success: false,
      error: err.message || "Server Error"
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});