chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type !== "SUMMARIZE_PAGE") return;

  (async () => {
    try {
      if (!req.content || req.content.length < 50) {
        sendResponse({
          success: false,
          error: "Not enough content to summarize"
        });
        return;
      }

      console.log("Sending request to Render backend...");
      console.log("Content length:", req.content.length);
      console.log("Mode:", req.mode);

      const response = await fetch(
        "https://ai-page-summarizer-doy6.onrender.com/summarize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: req.title,
            content: req.content.slice(0, 3000),
            url: req.url,
            mode: req.mode
          })
        }
      );

      const data = await response.json();
      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Server error while summarizing");
      }

      if (!data.success) {
        throw new Error(data.error || "Backend failed to summarize");
      }

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
        error: error.message || "Unexpected error"
      });
    }
  })();

  return true;
});