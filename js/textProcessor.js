'use strict';

class TextProcessor {
  constructor() {
    this.CACHE_NAME = "lang-processor-cache";
    this.inputText = document.getElementById("inputText");
    this.resultContainer = document.getElementById("resultContainer");
    this.resultContent = document.getElementById("resultContent");
    this.resultsStack = [];
    this.resultsMarkdown = [];
    this.resultsSources = [];
    this.isShareView = window.location.hash.includes("?share");

    if (this.isShareView) {
      this.setupShareView();
    }
    this.checkUrlHash();
  }

  setupShareView() {
    const modal = document.getElementById("modal");
    if (modal) modal.remove();

    const editConfigBtn = document.getElementById("editConfigBtn");
    if (editConfigBtn) editConfigBtn.remove();

    document.querySelector(".container").innerHTML = `
            <div class="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
                <div class="flex justify-between items-center mb-8">
                    <div class="flex gap-3 items-center">
                        <button id="viewFullApp" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                            View Full App
                        </button>
                        <button id="theme-toggle-public" type="button" class="p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700">
                            <span id="theme-toggle-dark-icon-public" class="hidden text-lg">🌙</span>
                            <span id="theme-toggle-light-icon-public" class="hidden text-lg">☀️</span>
                        </button>
                    </div>
                    <h1 class="text-xl font-bold text-gray-800 dark:text-gray-200">Shared Content</h1>
                </div>
                <div id="resultContent" class="prose lg:prose-lg dark:prose-invert">
                </div>
            </div>`;

    const footer = document.querySelector("footer");
    if (footer) footer.remove();

    this.resultContent = document.getElementById("resultContent");

    document.getElementById("viewFullApp").addEventListener("click", async (e) => {
      e.preventDefault();
      const newHash = window.location.hash.replace("?share", "");
      window.location.hash = newHash;

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
        }
        if ("caches" in window) {
          await caches.delete(this.CACHE_NAME);
        }
      } catch (error) {
        console.warn("Cache clearing failed:", error);
      }

      window.location.reload(true);
    });

    // Initialize theme toggle for public view
    if (configManager && configManager.themeManager) {
        const tm = configManager.themeManager;
        tm.themeToggleBtn = document.getElementById("theme-toggle-public");
        tm.themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon-public");
        tm.themeToggleLightIcon = document.getElementById("theme-toggle-light-icon-public");
        tm.init();
    }
  }

  async createGist(content, description = "Shared content") {
    try {
      const config = configManager.getConfig();
      const pjEndpoint = config.pocketJsonEndpoint || "https://pocketjson.pluja.dev";
      const pjApiKey = config.pocketJsonApiKey;

      const headers = {
        "Content-Type": "application/json",
      };

      if (pjApiKey) {
        headers["X-API-Key"] = pjApiKey;
      }

      const requestBody = {
        content: {
          text: content,
          source: this.resultsSources[0] || "No source",
        },
      };

      const queryParams = pjApiKey ? "?expiry=never" : "";
      const response = await fetch(`${pjEndpoint}${queryParams}`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`PocketJSON API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        expiresAt: data.expires_at,
        endpoint: pjEndpoint,
      };
    } catch (error) {
      console.error("Error creating share:", error);
      throw error;
    }
  }

  async getGistContent(id, endpoint) {
    try {
      const config = configManager.getConfig();
      const pjEndpoint = endpoint || config.pocketJsonEndpoint || "https://pocketjson.pluja.dev";

      const cleanEndpoint = pjEndpoint.replace(/\/+$/, "");
      const response = await fetch(`${cleanEndpoint}/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error("Error fetching shared content:", error);
      return null;
    }
  }

  async checkUrlHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    try {
      if (hash.startsWith("share=")) {
        try {
          if ("caches" in window) {
            const cache = await caches.open(this.CACHE_NAME);
            if (window.location.href.startsWith("http")) {
              await cache.delete(window.location.href);
            }
          }
        } catch (error) {
          console.warn("Cache operation failed:", error);
        }

        const parts = hash.split("?")[0];
        const [shareId, endpoint] = parts.replace("share=", "").split("@");
        const decodedEndpoint = endpoint ? decodeURIComponent(endpoint) : null;
        const content = await this.getGistContent(shareId, decodedEndpoint);

        if (content) {
          this.displayResult(content, true);
          if (this.isShareView) {
            const viewLink = document.createElement("div");
            viewLink.className = "mt-2 text-sm text-gray-600";
            const timestamp = new Date().toLocaleDateString();
            viewLink.innerHTML = `<span>Shared content (${timestamp})</span>`;
            this.resultContent.firstChild.appendChild(viewLink);
          }
        }
      }
    } catch (error) {
      console.error("Error loading shared content:", error);
    }
  }

  async processText(task, content = null) {
    uiManager.showLoading(task);
    try {
      const textContent = content || (await this.getContent());
      const prompt = this.buildPrompt(task, textContent);
      const result = await this.callAPI(prompt);
      this.displayResult(result, true, this.currentSource);
    } catch (error) {
      console.error("Error processing text:", error);
      alert("Error processing text. Please try again.");
    } finally {
      uiManager.hideLoading();
    }
  }

  async getContent() {
    const text = this.inputText.value.trim();
    if (!text) {
      throw new Error("Please enter some text to process");
    }

    if (this.isValidUrl(text)) {
      const response = await fetch(`https://r.jina.ai/${encodeURIComponent(text)}`);
      this.currentSource = text;
      return await response.text();
    }
    this.currentSource = "No source";
    return text;
  }

  buildPrompt(task, content) {
    switch (task) {
      case "translate":
        const inputLang = document.getElementById("inputLanguage").value;
        const outputLang = document.getElementById("outputLanguage").value;
        const prompt = `You are an expert ${inputLang} to ${outputLang} translator with native-level proficiency in both languages. Your task is to provide a professional, accurate translation following these guidelines:

1. Maintain the original tone, style, and intent
2. Preserve all factual information and context
3. Adapt cultural references and idioms appropriately for ${outputLang} speakers
4. Use natural, fluent ${outputLang} that sounds native, not translated
5. Retain the original text structure and formatting (i.e. if the text has Markdown keep the Markdown formatting)
6. Handle technical terms, proper nouns, and specialized vocabulary correctly

YOU MUST reply with only the translation without any introductory phrases, explanations, title, source urls or other meta-commentary. The text is:

${content.split('Markdown Content:')[1] || content}`;
        return prompt;

      case "summarize":
        return `You are an expert summarization specialist with deep expertise in content analysis and information distillation. Your task is to create a comprehensive yet concise summary that captures the essence and critical details of the provided text.

Requirements:
- Maintain the original language of the source text
- Deliver a maximum of two well-structured paragraphs. Keep it brief and concise.
- Preserve all essential facts, key arguments, and main themes
- Ensure factual accuracy and objective presentation
- Use clear, professional language with appropriate Markdown formatting
- Eliminate redundancy while maintaining informational completeness
- Focus on the most impactful and relevant content

Deliver the summary directly without any introductory phrases, meta-commentary, or explanatory text. Begin immediately with the summary content.

Text to summarize:

${content.split('Markdown Content:')[1] || content}`;

      case "correct":
        const level = document.getElementById("correctionLevel").value;
        const style = document.getElementById("correctionStyle").value;
        return `You are an expert copywriter and proofreader with decades of experience in professional writing, editing, and content optimization. Your task is to meticulously review and enhance the provided text according to the specified correction level ${level} and writing style ${style}.

Correction Guidelines:
- Grammar, spelling, and punctuation must be flawless
- Sentence structure should be clear, concise, and impactful
- Vocabulary should be precise and contextually appropriate
- Tone and voice must align with the specified ${style} style
- Maintain the original language and intent of the source text
- Preserve any existing formatting, structure, and technical accuracy
- Eliminate redundancy, improve flow, and enhance readability
- Ensure consistency in terminology and style throughout
- The level refers to the level of allowed difference with the original text. 1 is only minor changes and 5 is the most changes.

Deliver only the corrected text without any introductory phrases, explanations, or meta-commentary. Begin immediately with the enhanced content.

Text to enhance:

${content.split('Markdown Content:')[1] || content}`;

      case "explain":
        return `You are an expert content analyst and educator with deep expertise in breaking down complex information into clear, comprehensive explanations. Your task is to provide a thorough, well-structured explanation that helps users fully understand the provided content.

Requirements:
- Respond in the same language as the source text
- Use clear, structured Markdown formatting with appropriate headings, bullet points, and emphasis
- Break down complex concepts into digestible components
- Provide relevant context, background information, and connections
- Identify and explain key themes, arguments, and implications
- Use examples or analogies when helpful for clarity
- Maintain academic rigor while ensuring accessibility
- Focus on the most important aspects that require explanation
- Avoid unnecessary jargon unless the content itself is technical

Deliver the explanation directly without any introductory phrases, meta-commentary, or explanatory text. Begin immediately with the structured explanation.

Content to explain:

${content.split('Markdown Content:')[1] || content}`;

      default:
        throw new Error("Invalid task");
    }
  }

  async callAPI(prompt) {
    const config = configManager.getConfig();
    if (!configManager.isConfigValid()) {
      throw new Error("Invalid API configuration");
    }

    const endpoint = configManager.getApiEndpoint('chat/completions');
    if (!endpoint) {
      throw new Error("Invalid API endpoint");
    }

    const body = {
      model: config.modelId,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful text assistant. Complete the task without any extra prose. You must comply the task provided by the user carefully.",
        },
        { role: "user", content: prompt },
      ],
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!result.choices || !result.choices.length) {
      throw new Error("Invalid API response");
    }

    return result.choices[0].message.content;
  }

  displayResult(markdownOutput, isNewResult = true, source = null) {
    if (this.isShareView) {
      let contentHtml = "";
      if (typeof markdownOutput === "object" && markdownOutput.text) {
        contentHtml =
          markdownOutput.source !== "No source"
            ? `<div class="text-xs text-gray-500">Source: <a class="underline text-gray-500 hover:text-blue-500" href="${
                markdownOutput.source
              }">${markdownOutput.source}</a></div>
                    ${marked.parse(markdownOutput.text)}`
            : marked.parse(markdownOutput.text);
        this.resultContent.innerHTML = contentHtml;
      } else {
        this.resultContent.innerHTML = marked.parse(markdownOutput);
      }
      return;
    }

    const config = configManager.getConfig();
    const isShareEnabled = config.pocketJsonEndpoint;
    const sourceToDisplay = source || this.currentSource || "No source";

    const sourceHtml =
      sourceToDisplay !== "No source"
        ? `<div class="text-xs text-gray-500 mb-2">Source: ${sourceToDisplay}</div>`
        : "";

    const resultHtml = `
            <div class="result-item bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 mb-6" data-result-index="${
              isNewResult ? 0 : this.resultsStack.length
            }">
                ${sourceHtml}
                <div class="flex gap-3 mb-4 justify-end">
                    <button class="action-btn bg-yellow-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-yellow-600 transition-all ${
                      !isShareEnabled ? "opacity-50 cursor-not-allowed" : ""
                    }" 
                            data-action="share" 
                            ${!isShareEnabled ? 'disabled title="PocketJSON endpoint not configured"' : ""}>
                        Share
                    </button>
                    <button class="action-btn bg-blue-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-blue-600 transition-all" data-action="work">
                        Work with result
                    </button>
                    <button class="action-btn bg-green-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-green-600 transition-all" data-action="summarize">
                        Summarize
                    </button>
                    <button class="action-btn bg-purple-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-purple-600 transition-all" data-action="explain">
                        Explain
                    </button>
                </div>
                <div class="result-content prose lg:prose-lg dark:prose-invert">
                    ${marked.parse(typeof markdownOutput === "object" ? markdownOutput.text : markdownOutput)}
                </div>
            </div>`;

    if (isNewResult) {
      this.resultsStack.unshift(resultHtml);
      this.resultsMarkdown.unshift(typeof markdownOutput === "object" ? markdownOutput.text : markdownOutput);
      this.resultsSources.unshift(sourceToDisplay);
    }

    this.resultContent.innerHTML = this.resultsStack.join("");
    this.resultContainer.classList.remove("hidden");
    this.bindResultActions();
  }

  bindResultActions() {
    const actionButtons = this.resultContent.querySelectorAll(".action-btn");
    actionButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const action = e.target.dataset.action;
        const resultItem = e.target.closest(".result-item");
        const resultIndex = parseInt(resultItem.dataset.resultIndex);

        switch (action) {
          case "share":
            const markdownContent = this.resultsMarkdown[resultIndex];
            const btn = e.target;

            btn.textContent = "Creating share...";
            btn.disabled = true;

            try {
              const share = await this.createGist(markdownContent);
              const shareUrl = `${window.location.origin}${window.location.pathname}#share=${
                share.id
              }@${encodeURIComponent(share.endpoint)}`;
              const finalShareUrl = `${shareUrl}?share`;
              await navigator.clipboard.writeText(finalShareUrl);
              btn.textContent = "Copied!";

              const expiryInfo = document.createElement("span");
              if (share.expiresAt) {
                const expDate = new Date(share.expiresAt).toLocaleDateString();
                expiryInfo.innerHTML = ` (expires: ${expDate})`;
              } else {
                expiryInfo.innerHTML = ` (never expires)`;
              }
              btn.parentNode.insertBefore(expiryInfo, btn.nextSibling);
            } catch (error) {
              btn.textContent = "Error!";
              console.error("Share failed:", error);
            } finally {
              btn.disabled = false;
              setTimeout(() => {
                if (btn.textContent.includes("Copied") || btn.textContent.includes("Error")) {
                  btn.textContent = "Share";
                }
              }, 2000);
            }
            break;

          case "work":
            this.inputText.value = this.resultsMarkdown[resultIndex];
            this.inputText.focus();
            break;

          case "summarize":
            await this.processText("summarize", this.resultsMarkdown[resultIndex]);
            break;

          case "explain":
            await this.processText("explain", this.resultsMarkdown[resultIndex]);
            break;
        }
      });
    });
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

const textProcessor = new TextProcessor();
