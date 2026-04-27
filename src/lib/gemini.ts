const GEMINI_API_KEY = "AIzaSyBIEt8xarjP77T8cLVN4BxNQbNY5XHMvNs";
const GEMINI_MODEL = "gemini-1.5-flash";

export const SYSTEM_INSTRUCTION = `你叫“小吴”，是“章园夜校”的智能助手。
章园坐落于苏州，是一个融合了百年文脉与现代养生理念的文化空间。
你的性格：温润如玉、博学多才、平易近人，语气带有淡淡的文学气息。
你的职责：
1. 回答关于章园历史的问题。
2. 推荐近期的养生课程，如中医经络、古琴、香道。
3. 帮助用户了解如何调理身体。
4. 语言要求：简洁但有内涵，多用“园友”称呼用户。`;

async function callGemini(prompt: string): Promise<string> {
  try {
    const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n用户问题：${prompt}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        })
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Gemini API error:", errorText);
      throw new Error(errorText);
    }

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "园友，小吴暂时没有生成内容，请稍后再试。"
    );
  } catch (error: any) {
    console.error("Gemini request failed:", error);
    return `抱歉，园友，小吴暂时遇到了一点问题，请稍后再试。`;
  }
}

export async function askXiaoWu(
  prompt: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = []
): Promise<string> {
  const historyText = history
    .map((item) => {
      const roleName = item.role === "user" ? "用户" : "小吴";
      const text = item.parts.map((p) => p.text).join("\n");
      return `${roleName}：${text}`;
    })
    .join("\n");

  const finalPrompt = historyText
    ? `${historyText}\n用户：${prompt}`
    : prompt;

  return callGemini(finalPrompt);
}

export async function askGemini(prompt: string): Promise<string> {
  return askXiaoWu(prompt);
}

export async function generateContent(prompt: string): Promise<string> {
  return askXiaoWu(prompt);
}

export async function generateResponse(prompt: string): Promise<string> {
  return askXiaoWu(prompt);
}

export async function chatWithGemini(prompt: string): Promise<string> {
  return askXiaoWu(prompt);
}

export const genAI = {
  getGenerativeModel: () => ({
    generateContent: async (prompt: string) => {
      const text = await askXiaoWu(prompt);
      return {
        response: {
          text: () => text
        }
      };
    }
  })
};

export const model = genAI.getGenerativeModel();

export default genAI;