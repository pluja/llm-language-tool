/**
 * Prompt templates for each task.
 * Extracted from the original textProcessor.js for clean separation.
 */

function extractContent(content) {
  return content.split('Markdown Content:')[1] || content;
}

export function buildPrompt(task, content, options = {}) {
  switch (task) {
    case 'translate':
      return buildTranslatePrompt(content, options);
    case 'summarize':
      return buildSummarizePrompt(content);
    case 'correct':
      return buildCorrectPrompt(content, options);
    case 'explain':
      return buildExplainPrompt(content);
    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

function buildTranslatePrompt(content, { inputLang = 'auto', outputLang = 'english' } = {}) {
  const text = extractContent(content);
  return `You are an expert ${inputLang} to ${outputLang} translator with native-level proficiency in both languages. Your task is to provide a professional, accurate translation following these guidelines:

1. Maintain the original tone, style, and intent
2. Preserve all factual information and context
3. Adapt cultural references and idioms appropriately for ${outputLang} speakers
4. Use natural, fluent ${outputLang} that sounds native, not translated
5. Retain the original text structure and formatting (i.e. if the text has Markdown keep the Markdown formatting)
6. Handle technical terms, proper nouns, and specialized vocabulary correctly

YOU MUST reply with only the translation without any introductory phrases, explanations, title, source urls or other meta-commentary. The text is:

${text}`;
}

function buildSummarizePrompt(content) {
  const text = extractContent(content);
  return `You are an expert summarization specialist with deep expertise in content analysis and information distillation. Your task is to create a comprehensive yet concise summary that captures the essence and critical details of the provided text.

Requirements:
- Maintain the original language of the source text
- Deliver a maximum of two well-structured paragraphs. Keep it brief and concise.
- Preserve all essential facts, key arguments, and main themes
- Ensure factual accuracy and objective presentation
- Use clear, professional language with appropriate Markdown formatting
- Eliminate redundancy while maintaining informational completeness
- Focus on the most impactful and relevant content

Deliver the summary directly without any introductory phrases, meta-commentary, or explanatory text. Begin immediately with the summary content.

Text to summarize:

${text}`;
}

function buildCorrectPrompt(content, { level = 'medium', style = 'formal' } = {}) {
  const text = extractContent(content);
  return `You are an expert copywriter and proofreader with decades of experience in professional writing, editing, and content optimization. Your task is to meticulously review and enhance the provided text according to the specified correction level ${level} and writing style ${style}.

Correction Guidelines:
- Grammar, spelling, and punctuation must be flawless
- Sentence structure should be clear, concise, and impactful
- Vocabulary should be precise and contextually appropriate
- Tone and voice must align with the specified ${style} style
- Maintain the original language and intent of the source text
- Preserve any existing formatting, structure, and technical accuracy
- Eliminate redundancy, improve flow, and enhance readability
- Ensure consistency in terminology and style throughout
- The level refers to the level of allowed difference with the original text. 1 is only minor changes and 5 is the most changes.

Deliver only the corrected text without any introductory phrases, explanations, or meta-commentary. Begin immediately with the enhanced content.

Text to enhance:

${text}`;
}

function buildExplainPrompt(content) {
  const text = extractContent(content);
  return `You are an expert content analyst and educator with deep expertise in breaking down complex information into clear, comprehensive explanations. Your task is to provide a thorough, well-structured explanation that helps users fully understand the provided content.

Requirements:
- Respond in the same language as the source text
- Use clear, structured Markdown formatting with appropriate headings, bullet points, and emphasis
- Break down complex concepts into digestible components
- Provide relevant context, background information, and connections
- Identify and explain key themes, arguments, and implications
- Use examples or analogies when helpful for clarity
- Maintain academic rigor while ensuring accessibility
- Focus on the most important aspects that require explanation
- Avoid unnecessary jargon unless the content itself is technical

Deliver the explanation directly without any introductory phrases, meta-commentary, or explanatory text. Begin immediately with the structured explanation.

Content to explain:

${text}`;
}

/**
 * Build a vision prompt for image-based translation/processing.
 */
export function buildVisionPrompt(task, options = {}) {
  switch (task) {
    case 'translate':
      return `Extract all text from this image, preserving the original formatting as closely as possible using Markdown. Then translate the extracted text to ${options.outputLang || 'English'}. Return ONLY the translated text in Markdown format, no explanations.`;
    case 'summarize':
      return `Extract and summarize the content from this image. Return a concise summary in Markdown format, no explanations.`;
    case 'correct':
      return `Extract all text from this image and correct it with ${options.level || 'medium'} correction level in a ${options.style || 'formal'} style. Return ONLY the corrected text in Markdown format.`;
    case 'explain':
      return `Analyze and explain the content shown in this image. Provide a structured explanation in Markdown format.`;
    default:
      return `Describe and analyze the content of this image in detail using Markdown format.`;
  }
}
