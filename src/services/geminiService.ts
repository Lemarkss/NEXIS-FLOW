import { GoogleGenAI } from "@google/genai";
import { ChatMessage, ChatTone } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getChatResponse(
  history: ChatMessage[], 
  prompt: string, 
  context: { expenses: any[], projects: any[] },
  tone: ChatTone = 'formal'
) {
  const toneInstructions = {
    formal: "Use um tom profissional, sério e polido. Evite gírias e mantenha uma linguagem corporativa de alto nível.",
    informal: "Use um tom amigável, descontraído e casual. Pode usar uma linguagem mais leve e direta, como um colega de trabalho próximo.",
    criativo: "Seja inovador, inspirador e use analogias interessantes. Explore ideias fora da caixa e use um tom entusiástico."
  };

  const systemInstruction = `Você é a Nexis Flow AI, uma assistente sofisticada para organização financeira e gerenciamento de projetos profissionais. 
  Contexto dos dados do usuário:
  Despesas: ${JSON.stringify(context.expenses)}
  Projetos e Tarefas: ${JSON.stringify(context.projects.map(p => ({
    title: p.title,
    status: p.status,
    tasks: p.tasks || []
  })))}
  
  Estilo de resposta solicitado: ${toneInstructions[tone]}
  
  Forneça conselhos úteis sobre economia, organização e consultas de projetos. 
  Responda sempre em Português.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    config: {
      systemInstruction: systemInstruction
    }
  });

  return response.text || "Sinto muito, não consegui processar essa solicitação.";
}

export async function scanReceipt(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Analise este recibo e extraia os dados no formato JSON: { description: string, amount: number, category: string, date: string }. Categorias permitidas: Comida, Transporte, Moradia, Trabalho, Lazer, Outro. Se não tiver certeza da data, use a data atual (YYYY-MM-DD)." },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Erro ao processar JSON do Gemini:", e);
    return {};
  }
}
