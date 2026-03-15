import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getChatResponse(history: ChatMessage[], prompt: string, context: { expenses: any[], projects: any[] }) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: `Você é a Nexis Flow AI, uma assistente sofisticada para organização financeira e gerenciamento de projetos profissionais. 
        Contexto dos dados do usuário:
        Despesas: ${JSON.stringify(context.expenses)}
        Projetos: ${JSON.stringify(context.projects)}
        
        Forneça conselhos concisos, profissionais e úteis sobre economia, organização e consultas de projetos. 
        Sempre seja encorajadora e sofisticada em seu tom. Responda sempre em Português.` }]
      },
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
  });

  const result = await model;
  return result.text || "Sinto muito, não consegui processar essa solicitação.";
}
