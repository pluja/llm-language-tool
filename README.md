# llm-language-tool

This is a simple tool that allows you to work with text via LLMs. Here's the feature list:

- Paste a text to work with it, or paste a URL to fetch and work with its content
- Translate text from and to any languages
- Summarize and correct texts
- Explain and summarize translations

There is no backend, all happens on the client side via JS. It has no dependencies, it's pure JS and HTML.

## Public instance

A public instance is hosted with Cloudflare Pages:

https://llm-language-tool.pages.dev

## Run locally

1. Clone this repo:

```
git clone https://github.com/pluja/llm-language-tool.git
```

2. Navigate into the folder: `cd llm-language-tool`

3. Run it via a simple python3 http server:

```
python3 -m http.server 8000
```

or via docker:

```
docker run --rm -p 8000:8000 -v $(pwd):/srv --workdir /srv python:3-alpine python -m http.server 8000 --bind 0.0.0.0
```

## Contribute

Contributions are very welcome, this is a very simple version I made in a few hours with the help of LLMs. This can be futher improved with more features and better UI. For now, this is my version, but feel free to open a PR!

## Inspired by

Here are some resources that inspired this project:

- https://translate.kagi.com
- https://r.jina.ai