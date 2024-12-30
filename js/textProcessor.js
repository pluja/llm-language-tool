class TextProcessor {
    constructor() {
        this.inputText = document.getElementById('inputText');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultContent = document.getElementById('resultContent');
    }

    async processText(task) {
        uiManager.showLoading(task);
        try {
            const content = await this.getContent();
            const prompt = this.buildPrompt(task, content);
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

    displayResult(markdownOutput) {
        this.resultContent.innerHTML = marked.parse(markdownOutput);
        this.resultContainer.classList.remove('hidden');
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