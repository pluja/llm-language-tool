# LLM Language Tool 🌐

A lightweight, browser-based text processing tool powered by Large Language Models (LLMs). Process, translate, and analyze text directly in your browser without any server dependencies.

## ✨ Features

- **Text Processing**
  - Process text directly from input or fetch from URLs
  - Translation between multiple languages
  - Text summarization and correction
  - Translation explanations and summaries

- **Privacy & Flexibility**
  - 100% client-side processing
  - Configure your own LLM endpoints and API keys
  - No data stored or transmitted to third parties (other than your LLM providers, which can be local)

- **Developer Friendly**
  - Pure JavaScript and HTML implementation
  - Zero runtime dependencies
  - Modern UI with Tailwind CSS
  - URL parameter support for automation

## 🚀 Quick Start

### Using the Public Instance

Visit the  public instance hosted on Cloudflare Pages:

[https://languagetool.pluja.dev](https://languagetool.pluja.dev)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/pluja/llm-language-tool.git
   ```

2. Navigate to the project directory:
   ```bash
   cd llm-language-tool
   ```

3. Start a local server:
   ```bash
   # Using Python (recommended)
   python3 -m http.server 8000

   # Using Docker
   docker run --rm -p 8000:8000 -v $(pwd):/srv --workdir /srv python:3-alpine python -m http.server 8000 --bind 0.0.0.0
   ```

4. Open your browser and visit `http://localhost:8000`

## 🔧 Configuration

The tool supports various configuration options through the UI:
- LLM endpoint configuration
- API key management
- Language model
- Language preferences
- UI customization

## 🔍 URL Parameters

Automate tasks using URL parameters:

```
https://languagetool.pluja.dev?content=https://example.com&task=translate&output=spanish
```

Supported parameters:
- `content`: Text or URL to process
- `task`: Operation to perform (`translate` or `summarize`)
- `output`: Target language or output format

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript and HTML
- **Styling**: Tailwind CSS with plugins

## 👥 Contributing

Contributions are welcome! This project was initially created with the help of LLMs and has room for improvements and new features.

To contribute:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

## 💡 Inspiration

This project draws inspiration from:
- [Kagi Translate](https://translate.kagi.com)
- [Jina AI](https://r.jina.ai)

## 📄 License

MIT