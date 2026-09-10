import { db } from '../db/index.js';
import { productTranslations, messageTranslations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import fetch from 'node-fetch';

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) return text;
  if (!text || text.trim() === '') return text;

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=\${GOOGLE_TRANSLATE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: 'text'
      })
    });

    const data = await response.json() as any;
    if (data.data && data.data.translations && data.data.translations.length > 0) {
      return data.data.translations[0].translatedText;
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export async function getTranslatedProduct(product: any, targetLanguage: string) {
  if (!targetLanguage || targetLanguage === 'en') return product;
  
  try {
    const cached = await db.select().from(productTranslations).where(
      and(
        eq(productTranslations.productId, product.id),
        eq(productTranslations.targetLanguage, targetLanguage)
      )
    );

    if (cached.length > 0) {
      return {
        ...product,
        title: cached[0].translatedTitle,
        description: cached[0].translatedDescription
      };
    }

    // Not cached, generate it
    const translatedTitle = await translateText(product.title, targetLanguage);
    const translatedDesc = product.description ? await translateText(product.description, targetLanguage) : null;

    await db.insert(productTranslations).values({
      productId: product.id,
      targetLanguage,
      translatedTitle: translatedTitle,
      translatedDescription: translatedDesc || ''
    });

    return {
      ...product,
      title: translatedTitle,
      description: translatedDesc || product.description
    };
  } catch (e) {
    return product;
  }
}

export async function getTranslatedMessage(messageContent: string, messageId: number, targetLanguage: string) {
  if (!targetLanguage || targetLanguage === 'en') return messageContent;

  try {
    const cached = await db.select().from(messageTranslations).where(
      and(
        eq(messageTranslations.messageId, messageId),
        eq(messageTranslations.targetLanguage, targetLanguage)
      )
    );

    if (cached.length > 0) {
      return cached[0].translatedContent;
    }

    const translated = await translateText(messageContent, targetLanguage);
    await db.insert(messageTranslations).values({
      messageId,
      targetLanguage,
      translatedContent: translated
    });

    return translated;
  } catch (e) {
    return messageContent;
  }
}
