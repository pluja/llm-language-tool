'use strict';

class UIManager {
    constructor() {
        this.currentTask = 'translate';
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
        this.taskInputs.forEach((input) => {
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

        const isTranslate = task === 'translate';
        const isCorrect = task === 'correct';

        // Toggle correction options
        this.correctionOptions.classList.toggle('hidden', !isCorrect);

        // Toggle language selectors
        this.languageSelectors.forEach((selector) => {
            selector.classList.toggle('hidden', !isTranslate);
        });
    }
}

const uiManager = new UIManager();