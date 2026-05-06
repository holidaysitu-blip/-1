type ChatMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

async function callQwen(prompt: string, history: ChatMessage[] = []): Promise<string> {
  try {
    const res = await fetch('/.netlify/functions/qwen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, history }),
    });

    const data = await res.json();

    return data.text || data.answer || data.message || data.reply || data.error || '抱歉，小吴暂时无法回复，请稍后再试。';
  } catch (error) {
    console.error('Qwen Error:', error);
    return '抱歉，小吴暂时遇到了一点问题，请稍后再试。';
  }
}

export async function askXiaoWu(prompt: string, history: ChatMessage[] = []): Promise<string> {
  return callQwen(prompt, history);
}

export async function askGemini(prompt: string): Promise<string> {
  return callQwen(prompt);
}

export async function generateContent(prompt: string): Promise<string> {
  return callQwen(prompt);
}

export async function generateResponse(prompt: string): Promise<string> {
  return callQwen(prompt);
}

export async function chatWithGemini(prompt: string): Promise<string> {
  return callQwen(prompt);
}
