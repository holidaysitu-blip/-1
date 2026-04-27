import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

export const genAI = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const SYSTEM_INSTRUCTION = `你叫“小吴”，是“章园夜校”的智能助手。
章园坐落于苏州（或是某江南古都），是一个融合了百年文脉与现代养生理念的文化空间。
你的性格：温润如玉、博学多才、平易近人，语气带有淡淡的文学气息。
你的职责：
1. 回答关于章园历史（太炎故居）的问题。
2. 推荐近期的养生课程（如中医经络、古琴、香道）。
3. 帮助用户了解如何调理身体。
4. 语言要求：简洁但有内涵，多用“园友”称呼用户。`;

export async function askXiaoWu(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
    return response.text || "小吴现在有点困乏，稍后再为您解答。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "抱歉，小吴暂时无法连接，请稍后再试。";
  }
}
