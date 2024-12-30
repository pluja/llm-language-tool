class TextProcessor {
    constructor() {
        this.inputText = document.getElementById('inputText');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultContent = document.getElementById('resultContent');
        this.resultsStack = [];
        this.resultsMarkdown = [];
        this.isShareView = window.location.hash.includes('?share');

        if (this.isShareView) {
            this.setupShareView();
        }
        this.checkUrlHash();
    }

    setupShareView() {
        // Hide the config modal
        const modal = document.getElementById('modal');
        if (modal) modal.remove();

        // Hide the edit config button
        const editConfigBtn = document.getElementById('editConfigBtn');
        if (editConfigBtn) editConfigBtn.remove();

        // Replace the entire container content
        document.querySelector('.container').innerHTML = `
            <div class="bg-white shadow-lg rounded-2xl p-8">
                <div class="flex justify-between items-center mb-8">
                    <button id="viewFullApp" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                        View Full App
                    </button>
                    <h1 class="text-3xl font-bold text-gray-800">🤖 Shared Content</h1>
                </div>
                <div id="resultContent" class="prose lg:prose-lg">
                </div>
            </div>`;

        // Remove footer in share view
        const footer = document.querySelector('footer');
        if (footer) footer.remove();

        // Reassign resultContent since we replaced the DOM
        this.resultContent = document.getElementById('resultContent');

        // Add event listener for the "View Full App" button
        document.getElementById('viewFullApp').addEventListener('click', () => {
            const baseUrl = window.location.href.split('#')[0];
            const hash = window.location.hash.replace('?share', '');
            // Force page reload by setting window.location directly
            window.location.href = baseUrl + hash;
            // Force reload to ensure clean state
            window.location.reload();
        });
    }

    checkUrlHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            try {
                // Remove the ?share parameter if present
                const encodedContent = hash.replace('?share', '');
                const decodedContent = this.decodeShareContent(encodedContent);
                this.displayResult(decodedContent, true);
            } catch (error) {
                console.error('Error decoding shared content:', error);
            }
        }
    }

    encodeShareContent(text) {
        return btoa(encodeURIComponent(text));
    }

    decodeShareContent(encoded) {
        return decodeURIComponent(atob(encoded));
    }

    async processText(task, content = null) {
        uiManager.showLoading(task);
        try {
            const textContent = content || await this.getContent();
            const prompt = this.buildPrompt(task, textContent);
            const result = await this.callAPI(prompt);
            this.displayResult(result);
        } catch (error) {
            console.error('Error processing text:', error);
            alert('Error processing text. Please try again.');
        } finally {
            uiManager.hideLoading();
        }
    }

    async getContent() {
        const text = this.inputText.value.trim();
        if (!text) {
            throw new Error('Please enter some text to process');
        }

        if (this.isValidUrl(text)) {
            const response = await fetch(`https://r.jina.ai/${encodeURIComponent(text)}`);
            return await response.text();
        }
        return text;
    }

    buildPrompt(task, content) {
        switch (task) {
            case 'translate':
                const inputLang = document.getElementById('inputLanguage').value;
                const outputLang = document.getElementById('outputLanguage').value;

                return `You are an expert translation machine. You must reply with a MARKDOWN version of the INPUT content. YOU MUST REPLY WITH MARKDOWN ONLY, do not add anything extra, just the translated content in MD. Your translation must be high quality, not literal but adapt to ${outputLang} so it seems it was written in ${outputLang} rather than translated. NEVER OMIT ANY CONTENT FROM THE INPUT. Translate the following text from ${inputLang} to ${outputLang}.\n\n${content}`;

            case 'summarize':
                return `Provide a concise summary of this text in the same language as the input. Do not add anything extra, just the summarized content. You must ALWAYS use the same language as the input text: \n\n${content}`;

            case 'correct':
                const level = document.getElementById('correctionLevel').value;
                const style = document.getElementById('correctionStyle').value;
                return `Proofread and correct this text with ${level} level of changes and ${style} style. Reply only with the corrected text. Do not add anything extra, just the corrected content. You must ALWAYS use the same language as the input text: \n\n${content}`;

            case 'explain':
                return `Explain the following text in detail, analyzing its key points and providing context. Reply with a clear and structured MARKDOWN explanation. You must ALWAYS use the same language as the input text. Do not add any extra prose outside the explanation: \n\n${content}`;

            default:
                throw new Error('Invalid task');
        }
    }

    async callAPI(prompt) {
        const config = configManager.getConfig();
        if (!configManager.isConfigValid()) {
            throw new Error('Invalid API configuration');
        }

        const body = {
            model: config.modelId,
            messages: [
                { role: "system", content: "You are a helpful text assistant. Complete the task without any extra prose. Just reply what you are asked to." },
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!result.choices || !result.choices.length) {
            throw new Error('Invalid API response');
        }

        return result.choices[0].message.content;
    }

    displayResult(markdownOutput, isNewResult = true) {
        if (this.isShareView) {
            // In share view, just display the content without any buttons
            this.resultContent.innerHTML = marked.parse(markdownOutput);
            return;
        }

        const resultHtml = `
            <div class="result-item bg-white shadow-lg rounded-2xl p-8 mb-6" data-result-index="${isNewResult ? 0 : this.resultsStack.length}">
                <div class="flex gap-3 mb-4 justify-end">
                    <button class="action-btn bg-yellow-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-yellow-600 transition-all" data-action="share">
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
                <div class="result-content prose lg:prose-lg">
                    ${marked.parse(markdownOutput)}
                </div>
            </div>`;

        if (isNewResult) {
            this.resultsStack.unshift(resultHtml);
            this.resultsMarkdown.unshift(markdownOutput);
        }

        this.resultContent.innerHTML = this.resultsStack.join('');
        this.resultContainer.classList.remove('hidden');
        this.bindResultActions();
    }

    bindResultActions() {
        const actionButtons = this.resultContent.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                const resultItem = e.target.closest('.result-item');
                const resultIndex = parseInt(resultItem.dataset.resultIndex);

                switch (action) {
                    case 'share':
                        const markdownContent = this.resultsMarkdown[resultIndex];
                        const encodedContent = this.encodeShareContent(markdownContent);
                        // Always use the simple share URL
                        const shareUrl = `${window.location.origin}${window.location.pathname}#${encodedContent}?share`;
                        navigator.clipboard.writeText(shareUrl);
                        e.target.textContent = 'Copied!';
                        setTimeout(() => e.target.textContent = 'Share', 2000);
                        break;
                    case 'work':
                        this.inputText.value = this.resultsMarkdown[resultIndex];
                        this.inputText.focus();
                        break;
                    case 'summarize':
                        await this.processText('summarize', this.resultsMarkdown[resultIndex]);
                        break;
                    case 'explain':
                        await this.processText('explain', this.resultsMarkdown[resultIndex]);
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