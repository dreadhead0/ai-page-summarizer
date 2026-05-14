const summarizeBtn = document.getElementById("summarizeBtn");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const summaryEl = document.getElementById("summary");
const errorEl = document.getElementById("error");
const readingTimeEl = document.getElementById("readingTime");
const pageTitleEl = document.getElementById("pageTitle");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const wordCountEl = document.getElementById("wordCount");

const pageSpinner = document.getElementById("pageSpinner");
const fullBtn = document.getElementById("fullBtn");
const shortBtn = document.getElementById("shortBtn");

let selectedMode = "full"; 
let isSummarizing = false;
let isRequesting = false;

const moonIcon = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" fill="#22c55e"/></svg>`;
const sunIcon = `<svg width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#22c55e"/></svg>`;

function resetState() {
  isSummarizing = false;
  isRequesting = false;
  summarizeBtn.disabled = false;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sendMessageWithRetry(tabId, message, callback) {
  chrome.tabs.sendMessage(tabId, message, (res) => {
    if (chrome.runtime.lastError) {
      callback(null, chrome.runtime.lastError.message);
      return;
    }
    callback(res);
  });
}

async function summarizePage() {
  if (isSummarizing || isRequesting) return;

  isSummarizing = true;
  summarizeBtn.disabled = true;

  pageSpinner.classList.add("hidden");
  loading.classList.remove("hidden");
  result.classList.add("hidden");
  errorEl.classList.add("hidden");

  const tab = await getActiveTab();
  pageTitleEl.textContent = tab.title;
  pageTitleEl.classList.remove("hidden");

  const storage = await chrome.storage.local.get(["summaryCache"]);
  const cache = storage.summaryCache || {};
  const cacheKey = `${tab.url}_${selectedMode}`; 
  
  const cached = cache[cacheKey];
  if (cached) {
    summaryEl.textContent = cached.summary;
    readingTimeEl.textContent = cached.readingTime;
    wordCountEl.textContent = cached.wordCount;
    result.classList.remove("hidden");
    loading.classList.add("hidden");
    resetState();
    return;
  }

  await new Promise((r) => setTimeout(r, 150));

  sendMessageWithRetry(tab.id, { type: "PRSUM_RAW" }, (res, err) => {
    if (err || !res) {
      showError(err || "No response from content script");
      resetState();
      return;
    }

    const raw = res.raw;
    isRequesting = true;

    const timeout = setTimeout(() => {
      if (isRequesting) {
        showError("Request timed out");
        resetState();
      }
    }, 60000);

    chrome.runtime.sendMessage(
      {
        type: "SUMMARIZE_PAGE",
        title: raw.title,
        content: raw.rawText,
        url: raw.url,
        mode: selectedMode,
      },
      (response) => {
        clearTimeout(timeout);
        loading.classList.add("hidden");

        if (!response || !response.success) {
          showError(response?.error || "Failed to summarize");
          resetState();
          return;
        }

        function formatSummary(text) {
          if (!text || typeof text !== "string") return "⚠️ No summary available.";
          return text
            .replace(/\*\*/g, "")
            .replace(/^\s*[\*\+\-]\s*/gm, "• ")
            .replace(/^[A-Za-z\s]+:\s*/gm, "")
            .replace(/\n{2,}/g, "\n")
            .trim();
        }

        const cleanSummary = formatSummary(response.summary);
        summaryEl.textContent = cleanSummary;
        readingTimeEl.textContent = response.readingTime;

        const words = countWords(cleanSummary);
        wordCountEl.textContent = `${words} words`;

        const newCacheEntry = {
          summary: cleanSummary,
          readingTime: response.readingTime,
          wordCount: `${words} words`,
        };

        chrome.storage.local.get(["summaryCache"], (data) => {
          const updatedCache = data.summaryCache || {};
          updatedCache[cacheKey] = newCacheEntry; 
          chrome.storage.local.set({ summaryCache: updatedCache });
        });

        const sentences = cleanSummary
          .split("\n")
          .map((line) => line.replace("•", "").trim())
          .filter(Boolean)
          .slice(0, 4);

        chrome.tabs.sendMessage(tab.id, {
          type: "HIGHLIGHT",
          sentences,
        });

        result.classList.remove("hidden");
        resetState();
      },
    );
  });
}

function showError(msg) {
  loading.classList.add("hidden");
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(summaryEl.textContent);
  copyBtn.innerText = "Copied!";
  setTimeout(() => (copyBtn.innerText = "Copy"), 1500);
});

clearBtn.addEventListener("click", () => {
  summaryEl.textContent = "";
  result.classList.add("hidden");
});

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);
  themeIcon.innerHTML = isLight ? moonIcon : sunIcon;
}

chrome.storage.local.get(["theme"], (res) => {
  applyTheme(res.theme || "dark");
});

themeToggle.addEventListener("click", () => {
  const newTheme = document.body.classList.contains("light") ? "dark" : "light";
  chrome.storage.local.set({ theme: newTheme });
  applyTheme(newTheme);
});

fullBtn.addEventListener("click", () => {
  selectedMode = "full";
  fullBtn.classList.add("active");
  shortBtn.classList.remove("active");
});

shortBtn.addEventListener("click", () => {
  selectedMode = "short";
  shortBtn.classList.add("active");
  fullBtn.classList.remove("active");
});

summarizeBtn.addEventListener("click", summarizePage);

window.addEventListener("DOMContentLoaded", () => {
  pageSpinner.classList.remove("hidden");
  pageTitleEl.classList.add("hidden");
});