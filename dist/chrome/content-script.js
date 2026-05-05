console.log("PRSum content script loaded:", location.href);

function extractMainContent() {
  // Try to target main content containers first
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".content",
    ".post",
    ".article",
  ];

  let content = "";

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      content = el.innerText;
      break;
    }
  }

  if (!content) {
    const paragraphs = Array.from(document.querySelectorAll("p"));

    const filtered = paragraphs
      .map((p) => p.innerText.trim())
      .filter(
        (text) =>
          text.length > 80 &&
          !/cookie|subscribe|sign up|advertisement|privacy|terms/i.test(text),
      );

    content = filtered.join("\n\n");
  }

  return cleanText(content);
}

function cleanText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(
      /(cookie|subscribe|sign up|advertisement|privacy policy|terms of service)/gi,
      "",
    )
    .replace(/©.*?\d{4}/g, "") 
    .trim();
}

function highlightText(sentences) {
  if (!sentences || !sentences.length) return;

  const escaped = sentences
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);

  if (escaped.length === 0) return;

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );

  const nodesToReplace = [];
  let node;

  while ((node = walker.nextNode())) {
    const parent = node.parentNode;
    if (!parent) continue;

    const tag = parent.tagName.toLowerCase();
    if (["script", "style", "textarea", "noscript", "mark"].includes(tag))
      continue;

    if (regex.test(node.nodeValue)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;

    const span = document.createElement("span");
    span.innerHTML = node.nodeValue.replace(regex, (match) => {
      return `<mark style="
        background: rgba(34,197,94,0.35);
        padding: 2px;
        border-radius: 4px;
      ">${match}</mark>`;
    });

    parent.replaceChild(span, node);
  });
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("Message received:", req.type);

  if (req.type === "PRSUM_RAW") {
    try {
      const content = extractMainContent();
      sendResponse({
        ok: true,
        raw: {
          title: document.title,
          url: location.href,
          rawText: content,
        },
      });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true;
  }

  if (req.type === "HIGHLIGHT") {
    try {
    
      highlightText(req.sentences || []);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});