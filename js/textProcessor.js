class TextProcessor {
    constructor() {
        // Add CACHE_NAME as a class property
        this.CACHE_NAME = 'lang-processor-cache';
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
        const modal = document.getElementById('modal');
        if (modal) modal.remove();

        const editConfigBtn = document.getElementById('editConfigBtn');
        if (editConfigBtn) editConfigBtn.remove();

        document.querySelector('.container').innerHTML = `
            <div class="bg-white shadow-lg rounded-2xl p-8">
                <div class="flex justify-between items-center mb-8">
                    <button id="viewFullApp" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                        View Full App
                    </button>
                    <h1 class="text-xl font-bold text-gray-800">Shared Content</h1>
                </div>
                <div id="resultContent" class="prose lg:prose-lg">
                </div>
            </div>`;

        const footer = document.querySelector('footer');
        if (footer) footer.remove();

        this.resultContent = document.getElementById('resultContent');

        document.getElementById('viewFullApp').addEventListener('click', async (e) => {
            e.preventDefault();
            const newHash = window.location.hash.replace('?share', '');
            window.location.hash = newHash;

            try {
                // Clear cache and force reload
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                }
                if ('caches' in window) {
                    await caches.delete(this.CACHE_NAME);
                }
            } catch (error) {
                console.warn('Cache clearing failed:', error);
            }

            window.location.reload(true);
        });
    }

    async createGist(content, description = 'Shared content') {
        try {
            const config = configManager.getConfig();
            const pjEndpoint = config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';
            const pjApiKey = config.pocketJsonApiKey;

            const headers = {
                'Content-Type': 'application/json',
            };

            if (pjApiKey) {
                headers['X-API-Key'] = pjApiKey;
            }

            const requestBody = {
                content: content
            };

            const queryParams = pjApiKey ? '?expiry=never' : '';
            const response = await fetch(`${pjEndpoint}${queryParams}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`PocketJSON API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                expiresAt: data.expires_at,
                endpoint: pjEndpoint
            };
        } catch (error) {
            console.error('Error creating share:', error);
            throw error;
        }
    }

    async getGistContent(id, endpoint) {
        try {
            const config = configManager.getConfig();
            const pjEndpoint = endpoint || config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';

            const cleanEndpoint = pjEndpoint.replace(/\/+$/, '');
            const response = await fetch(`${cleanEndpoint}/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.statusText}`);
            }
            const data = await response.json();
            return data.content;
        } catch (error) {
            console.error('Error fetching shared content:', error);
            return null;
        }
    }

    async checkUrlHash() {
        const hash = window.location.hash.slice(1);
        if (!hash) return;

        try {
            if (hash.startsWith('share=')) {
                try {
                    // Only try to clear cache if it's available
                    if ('caches' in window) {
                        const cache = await caches.open(this.CACHE_NAME);
                        // Only try to delete if it's a valid cache URL
                        if (window.location.href.startsWith('http')) {
                            await cache.delete(window.location.href);
                        }
                    }
                } catch (error) {
                    console.warn('Cache operation failed:', error);
                }

                const parts = hash.split('?')[0];
                const [shareId, endpoint] = parts.replace('share=', '').split('@');
                const decodedEndpoint = endpoint ? decodeURIComponent(endpoint) : null;
                const content = await this.getGistContent(shareId, decodedEndpoint);

                if (content) {
                    this.displayResult(content, true);
                    if (this.isShareView) {
                        const viewLink = document.createElement('div');
                        viewLink.className = 'mt-2 text-sm text-gray-600';
                        const timestamp = new Date().toLocaleDateString();
                        viewLink.innerHTML = `<span>Shared content (${timestamp})</span>`;
                        this.resultContent.firstChild.appendChild(viewLink);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading shared content:', error);
        }
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
            this.resultContent.innerHTML = marked.parse(markdownOutput);
            return;
        }

        const config = configManager.getConfig();
        const isShareEnabled = config.pocketJsonEndpoint;

        const resultHtml = `
            <div class="result-item bg-white shadow-lg rounded-2xl p-8 mb-6" data-result-index="${isNewResult ? 0 : this.resultsStack.length}">
                <div class="flex gap-3 mb-4 justify-end">
                    <button class="action-btn bg-yellow-500 text-white px-2 py-1 text-sm rounded-lg hover:bg-yellow-600 transition-all ${!isShareEnabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                            data-action="share" 
                            ${!isShareEnabled ? 'disabled title="PocketJSON endpoint not configured"' : ''}>
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
                        const btn = e.target;

                        btn.textContent = 'Creating share...';
                        btn.disabled = true;

                        try {
                            const share = await this.createGist(markdownContent);
                            const shareUrl = `${window.location.origin}${window.location.pathname}#share=${share.id}@${encodeURIComponent(share.endpoint)}`;
                            const finalShareUrl = `${shareUrl}?share`;
                            await navigator.clipboard.writeText(finalShareUrl);
                            btn.textContent = 'Copied!';

                            const expiryInfo = document.createElement('span');
                            if (share.expiresAt) {
                                const expDate = new Date(share.expiresAt).toLocaleDateString();
                                expiryInfo.innerHTML = ` (expires: ${expDate})`;
                            } else {
                                expiryInfo.innerHTML = ` (never expires)`;
                            }
                            btn.parentNode.insertBefore(expiryInfo, btn.nextSibling);
                        } catch (error) {
                            btn.textContent = 'Error!';
                            console.error('Share failed:', error);
                        } finally {
                            btn.disabled = false;
                            setTimeout(() => {
                                if (btn.textContent.includes('Copied') || btn.textContent.includes('Error')) {
                                    btn.textContent = 'Share';
                                }
                            }, 2000);
                        }
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