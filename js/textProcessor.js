class TextProcessor {
    constructor() {
        this.inputText = document.getElementById('inputText');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultContent = document.getElementById('resultContent');
        this.resultsStack = [];
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
        const resultHtml = `
            <div class="result-item bg-white shadow-lg rounded-2xl p-8 mb-6">
                <div class="flex gap-3 mb-4 justify-end">
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
            // Add new result to the stack
            this.resultsStack.unshift(resultHtml);
        }

        // Display all results
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
                const resultContent = resultItem.querySelector('.result-content');
                const plainText = resultContent.textContent.trim();

                switch (action) {
                    case 'work':
                        this.inputText.value = plainText;
                        this.inputText.focus();
                        break;
                    case 'summarize':
                        await this.processText('summarize', plainText);
                        break;
                    case 'explain':
                        // Add 'explain' to buildPrompt's supported tasks
                        await this.processText('explain', plainText);
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