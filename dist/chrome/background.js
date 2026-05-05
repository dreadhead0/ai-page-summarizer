chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type !== "SUMMARIZE_PAGE") return;

  (async () => {
    try {
      // Basic validation
      if (!req.content || req.content.length < 50) {
        return sendResponse({
          success: false,
          error: "Not enough content to summarize"
        });
      }

      const response = await fetch("http://localhost:3000/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: req.title,
          content: req.content,
          url: req.url,
          mode: req.mode   
        })
      });

      if (!response.ok) {
        throw new Error("Server error while summarizing");
      }

      const data = await response.json();

      sendResponse({
        success: true,
        summary: data.summary,
        readingTime: data.readingTime,
        source: data.source
      });

    } catch (error) {
      console.error("Background error:", error);

      sendResponse({
        success: false,
        error: error.message || "Unexpected error occurred"
      });
    }
  })();

  return true; 
});