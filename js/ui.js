class UIManager {
    constructor() {
        this.currentTask = '';
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.correctionOptions = document.getElementById('correctionOptions');
        this.processBtn = document.getElementById('processBtn');
        this.languageSelectors = document.querySelectorAll('.languageSelectors');
        this.taskInputs = document.querySelectorAll('input[name="task"]');
    }

    bindEvents() {
        this.taskInputs.forEach(input => {
            input.addEventListener('change', (e) => this.updateUI(e.target.value));
        });

        this.processBtn.addEventListener('click', () => {
            textProcessor.processText(this.currentTask);
        });
    }

    showLoading(task) {
        this.loadingMessage.textContent = `Processing ${task.toLowerCase()}...`;
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    updateUI(task) {
        this.currentTask = task;
        this.processBtn.classList.remove('hidden');

        switch (task) {
            case 'translate':
                this.correctionOptions.classList.add('hidden');
                this.languageSelectors.forEach(selector => selector.classList.remove('hidden'));
                break;
            case 'correct':
                this.correctionOptions.classList.remove('hidden');
                this.languageSelectors.forEach(selector => selector.classList.add('hidden'));
                break;
            case 'summarize':
                this.correctionOptions.classList.add('hidden');
                this.languageSelectors.forEach(selector => selector.classList.add('hidden'));
                break;
        }
    }
}

const uiManager = new UIManager();