# LLM LangTool

A privacy-focused, client-side only text processing tool powered by Large Language Models. Translate, summarize, correct, and explain text using any OpenAI-compatible API.

**Public instance:** [langtool.pluja.dev](https://langtool.pluja.dev)

## Features

- **Translate** text between multiple languages with auto-detection
- **Summarize** long articles and documents
- **Correct** grammar and style with configurable intensity
- **Explain** complex content in structured breakdowns
- **Process URLs** by fetching and extracting content automatically
- **Photo/Vision support** upload or capture images for translation
- **Streaming responses** watch results generate in real-time
- **Result history** browse and restore previous results
- **Shareable links** self-contained URLs with no external dependencies
- **Dark mode** with system preference detection
- **PWA-ready** install as a standalone app
- **Zero backend** everything runs and stores locally in your browser. No accounts, no databases, no server infrastructure.

## Privacy First

All processing happens in your browser. Your text and API keys never pass through any intermediary server. You connect directly to your chosen LLM provider. Settings, history, and preferences are stored in your browser's localStorage; nothing is ever sent to a backend.

## Setup

### Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Configuration

1. Open Settings (gear icon)
2. Enter your OpenAI-compatible API endpoint (e.g., `https://api.openai.com/v1`)
3. Enter your API key
4. Select a model from the dropdown

The app works with any OpenAI-compatible provider:
- [OpenAI](https://openai.com)
- [ppq.ai](https://ppq.ai)
- [nano-gpt.com](https://nano-gpt.com)
- [Ollama](https://ollama.ai) (local)
- Any self-hosted compatible API

### URL Content Fetching

To fetch content from URLs, you need a Jina AI Reader API key:
1. Get a free key at [jina.ai/reader](https://jina.ai/reader)
2. Add it in Settings under "URL Reader"

## Usage

### Basic Flow

1. Select a task: Translate, Summarize, or Correct
2. Paste text or a URL into the input area
3. For translation, choose the target language
4. Click Send or press Ctrl+Enter
5. View the result and take further actions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Process text |
| `Ctrl+,` | Open settings |
| `Escape` | Close panels |

### Working with Results

Each result provides quick actions:
- **Copy** - Copy to clipboard
- **Share** - Generate a shareable URL
- **Summarize** - Create a summary of the result
- **Explain** - Get a detailed explanation
- **Edit** - Load the result back into the input for refinement

### Sharing Results

Click Share on any result to generate a self-contained URL. The content is compressed and encoded directly in the URL hash. No external service needed. For large content, the app falls back to PocketJSON storage.

### Settings Sharing

Click "Share Settings" in the settings panel to generate a URL that pre-configures the app with your API settings. Useful for onboarding team members or syncing across devices.

## Building for Production

```bash
npm run build
```

Output goes to the `dist/` directory. Deploy to any static hosting service.

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`

## Development

Built with:
- [Svelte 5](https://svelte.dev) - UI framework with runes reactivity
- [Vite](https://vite.dev) - Build tool
- [Tailwind CSS v4](https://tailwindcss.com) - Styling

Project structure:

```
src/
  lib/
    components/    # Svelte UI components
    stores/        # Reactive state (config, ui, history)
    utils/         # API, prompts, sharing logic
  app.css          # Tailwind config and custom styles
  App.svelte       # Main application
  main.js          # Entry point
```

## License

MIT
