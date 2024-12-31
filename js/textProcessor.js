class TextProcessor {
    constructor() {
        this.CACHE_NAME = 'lang-processor-cache';
        this.inputText = document.getElementById('inputText');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultContent = document.getElementById('resultContent');
        this.resultsStack = [];
        this.resultsMarkdown = [];
        this.resultsSources = [];
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
                content: {
                    text: content,
                    source: this.resultsSources[0] || 'No source'
                }
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
                    if ('caches' in window) {
                        const cache = await caches.open(this.CACHE_NAME);
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
            this.displayResult(result, true, this.currentSource);
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
            this.currentSource = text;
            return await response.text();
        }
        this.currentSource = 'No source';
        return text;
    }

    buildPrompt(task, content) {
        switch (task) {
            case 'translate':
                const inputLang = document.getElementById('inputLanguage').value;
                const outputLang = document.getElementById('outputLanguage').value;
                return `You are a precise translation engine. CRITICAL INSTRUCTIONS:
1. Output ONLY the translated content in clean Markdown
2. You MUST remove all ads, navigation elements, related articles, offers, and non-essential content
3. Translate from ${inputLang} to ${outputLang} with natural fluency, not word-for-word
4. Preserve 100% of the main content's meaning and information
5. Never add meta-commentary or explanatory text
6. Never start with phrases like "Here's the translation"

Content to translate:
${content}`;

            case 'summarize':
                return `You are a precise summarization engine. CRITICAL INSTRUCTIONS:
1. Output ONLY the summarized content in the original language
2. Remove all ads, navigation elements, related articles, and non-essential content  
3. Maintain the original language of the input text
4. Keep all key points and main ideas
5. Never add meta-commentary or explanatory text
6. Never start with phrases like "Here's the summary"

Content to summarize:
${content}`;

            case 'correct':
                const level = document.getElementById('correctionLevel').value;
                const style = document.getElementById('correctionStyle').value;
                return `You are a precise text correction engine. CRITICAL INSTRUCTIONS:
1. Output ONLY the corrected text
2. Apply ${level} correction level and ${style} writing style
3. Maintain the original language of the input text
4. Never add meta-commentary or explanatory text
5. Never start with phrases like "Here's the corrected version"

Content to correct:
${content}`;

            case 'explain':
                return `You are a precise explanation engine. CRITICAL INSTRUCTIONS:
1. Output ONLY a structured Markdown explanation
2. Maintain the original language of the input text
3. Analyze key points and provide detailed context
4. Never add meta-commentary outside the explanation
5. Never start with phrases like "Let me explain"

Content to explain:
${content}`;

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
                { role: "system", content: "You are a helpful text assistant. Complete the task without any extra prose. You must comply the task provided by the user carefully." },
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

    displayResult(markdownOutput, isNewResult = true, source = null) {
        if (this.isShareView) {
            let contentHtml = '';
            if (typeof markdownOutput === 'object' && markdownOutput.text) {
                contentHtml = markdownOutput.source !== 'No source' ? 
                    `<div class="text-xs text-gray-500">Source: <a class="underline text-gray-500 hover:text-blue-500" href="${markdownOutput.source}">${markdownOutput.source}</a></div>
                    ${marked.parse(markdownOutput.text)}` :
                    marked.parse(markdownOutput.text);
                this.resultContent.innerHTML = contentHtml;
            } else {
                this.resultContent.innerHTML = marked.parse(markdownOutput);
            }
            return;
        }

        const config = configManager.getConfig();
        const isShareEnabled = config.pocketJsonEndpoint;
        const sourceToDisplay = source || this.currentSource || 'No source';

        const sourceHtml = sourceToDisplay !== 'No source' ? 
            `<div class="text-xs text-gray-500 mb-2">Source: ${sourceToDisplay}</div>` : '';

        const resultHtml = `
            <div class="result-item bg-white shadow-lg rounded-2xl p-8 mb-6" data-result-index="${isNewResult ? 0 : this.resultsStack.length}">
                ${sourceHtml}
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
                    ${marked.parse(typeof markdownOutput === 'object' ? markdownOutput.text : markdownOutput)}
                </div>
            </div>`;

        if (isNewResult) {
            this.resultsStack.unshift(resultHtml);
            this.resultsMarkdown.unshift(typeof markdownOutput === 'object' ? markdownOutput.text : markdownOutput);
            this.resultsSources.unshift(sourceToDisplay);
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