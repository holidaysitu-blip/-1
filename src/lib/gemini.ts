type ChatMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

async function callQwen(prompt: string, history: ChatMessage[] = []): Promise<string> {
  try {
    const now = new Date();
    const res = await fetch('/.netlify/functions/qwen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history,
        client_time: now.toISOString(),
        client_time_text: now.toLocaleString('zh-CN', { hour12: false, weekday: 'long' }),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      console.error('Qwen API Error:', data.error || res.statusText);
      return '小吴当前没有成功连接到千问接口，请检查 QWEN_API_KEY / DASHSCOPE_API_KEY 和服务端日志。';
    }

    return data.text || data.answer || data.message || data.reply || '千问接口已返回，但没有生成有效内容。';
  } catch (error) {
    console.error('Qwen Error:', error);
    return '小吴当前没有成功连接到千问接口，请检查网络、函数部署或服务端配置。';
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
