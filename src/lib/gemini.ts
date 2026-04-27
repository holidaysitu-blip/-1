import { GoogleGenAI } from "@google/genai";

const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

const genAI = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const SYSTEM_INSTRUCTION = `你叫“小吴”，是“章园夜校”的智能助手。
章园坐落于苏州（或是某江南古都），是一个融合了百年文脉与现代养生理念的文化空间。
你的性格：温润如玉、博学多才、平易近人，语气带有淡淡的文学气息。
你的职责：
1. 回答关于章园历史的问题。
2. 推荐近期的养生课程（如中医经络、古琴、香道）。
3. 帮助用户了解如何调理身体。
4. 语言要求：简洁但有内涵，多用“园友”称呼用户。`;

export async function askXiaoWu(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  if (!apiKey || apiKey === 'dummy-key') {
    return "抱歉，尚未配置 GEMINI_API_KEY，小吴暂时无法与您对话。";
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const chat = model.startChat({
      history: history.length > 0 ? history : [],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes('API_KEY_INVALID')) {
      return "小吴发现您的 API Key 可能无效，请检查 Secrets 配置。";
    }
    return `抱歉，小吴暂时遇到了一点问题 (${error.message || '网络连接失败'})，请稍后再试。`;
  }
}
