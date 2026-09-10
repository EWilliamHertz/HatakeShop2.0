import { Resend } from "resend";
import Stripe from 'stripe';
import EasyPostClient from '@easypost/api';
import { GoogleGenAI } from "@google/genai";

export const resend = new Resend(process.env.RESEND_API_KEY || "process.env.RESEND_API_KEY");

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateEmbedding(text: string) {
  if (!text) return null;
  try {
    const aiResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    return aiResponse.embeddings[0].values;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
}

let stripeClient: Stripe | null = null;
export function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-08-26.dahlia' as any });
  }
  return stripeClient;
}

let easypostClient: any = null;
export function getEasyPost() {
  if (!easypostClient) {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) throw new Error('EASYPOST_API_KEY environment variable is required for live freight calculation.');
    easypostClient = new EasyPostClient(key);
  }
  return easypostClient;
}
