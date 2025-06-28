'use strict';

// Initialize the application
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const content = urlParams.get('content');
        const task = urlParams.get('task') || 'translate';
        const output = urlParams.get('output');

        if (!content) return;

        // Assuming TextProcessor is globally available as 'textProcessor'
        if (textProcessor.isValidUrl(content)) {
            document.getElementById('inputText').value = content;

            if (output) {
                const outputSelect = document.getElementById('outputLanguage');
                if (outputSelect) {
                    outputSelect.value = output;
                }
            }

            textProcessor.processText(task);
        }
    });
})();