// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // The managers are already instantiated in their respective files
    const urlParams = new URLSearchParams(window.location.search);

    const content = urlParams.get('content');
    const task = urlParams.get('task');
    const output = urlParams.get('output');

    if (content) {
        // Assuming TextProcessor is globally available as 'textProcessor'
        if (textProcessor.isValidUrl(content)) {
            // Set the input text field with the URL
            document.getElementById('inputText').value = content;

            // Set the output language if provided
            if (output) {
                const outputSelect = document.getElementById('outputLanguage');
                if (outputSelect) {
                    outputSelect.value = output;
                }
            }

            // Process with the specified task
            textProcessor.processText(task || 'translate');
        }
    }
});