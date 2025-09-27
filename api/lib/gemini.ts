import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini API 設定
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface TranslationRequest {
  text: string
  targetLanguage: string
  sourceLanguage?: string
}

export interface TranslationResult {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

/**
 * テキストを指定言語に翻訳
 */
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text without any additional explanation or formatting:

${text}`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const translatedText = response.text().trim()
    
    return translatedText
  } catch (error) {
    console.error('Error translating text:', error)
    throw new Error('Failed to translate text')
  }
}

/**
 * 複数のテキストを一括翻訳
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    // テキストを番号付きリストとして結合
    const numberedTexts = texts.map((text, index) => `${index + 1}. ${text}`).join('\n')
    
    const prompt = `Translate the following numbered texts to ${targetLanguage}. Return only the translated texts in the same numbered format without any additional explanation:

${numberedTexts}`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const translatedContent = response.text().trim()
    
    // 番号付きリストから翻訳テキストを抽出
    const translatedTexts = translatedContent
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
    
    return translatedTexts
  } catch (error) {
    console.error('Error translating batch:', error)
    throw new Error('Failed to translate batch')
  }
}

/**
 * 言語を検出
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `Detect the language of the following text and return only the language code (e.g., 'en', 'ja', 'ko', 'zh'):

${text}`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const languageCode = response.text().trim().toLowerCase()
    
    return languageCode
  } catch (error) {
    console.error('Error detecting language:', error)
    return 'en' // デフォルトは英語
  }
}

/**
 * サポートされている言語のリスト
 */
export const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'zh': '中文',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'ru': 'Русский'
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES