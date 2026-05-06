const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = process.env.QWEN_MODEL || 'qwen-plus';

const SYSTEM_PROMPT = `
你是古吴轩章园店 / 古吴轩章园项目的智能咨询助手，名字叫“小吴”。

职责：
1. 优先回答与古吴轩章园店、古吴轩章园、课程活动、报名咨询、课程体验、文创活动、苏州文化、古吴轩章园历史相关的问题。
2. 你已经开启联网搜索。遇到最新资讯、日期、开放时间、天气、近期活动、价格变化等可能变化的信息时，先结合联网搜索结果回答。
3. 不编造具体日期、价格、名额、地址、老师、课程安排、优惠、联系人。搜索不到明确资料时，要说明“这个信息目前没有查到明确说明，建议联系工作人员确认。”
4. 如果用户问今天日期、近期资讯或实时信息，必须以当前真实日期和联网搜索结果为准。
5. 回答必须使用简体中文。
6. 回答要简短、清楚、像真实工作人员，不要长篇发挥。
7. 如果用户问报名方式，引导用户点击页面上的报名、预约或提交信息按钮。
`;

function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .map((item) => {
      const role = item?.role === 'model' || item?.role === 'assistant' ? 'assistant' : 'user';
      const content =
        item?.content ||
        item?.text ||
        item?.parts?.map((part) => part?.text || '').join('\n') ||
        '';

      return {
        role,
        content: String(content).trim(),
      };
    })
    .filter((item) => item.content);
}

function cleanAnswer(answer) {
  if (!answer || typeof answer !== 'string') {
    return '这个信息目前没有查到明确说明，建议联系工作人员确认。';
  }

  return answer.trim();
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse({ error: '只支持 POST 请求' }, 405);
  }

  try {
    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return jsonResponse({ error: '未配置 QWEN_API_KEY 或 DASHSCOPE_API_KEY。' }, 500);
    }

    const payload = JSON.parse(event.body || '{}');
    const prompt = payload.prompt || payload.message || payload.input || '';

    if (!String(prompt).trim()) {
      return jsonResponse({ error: '请输入问题。' }, 400);
    }

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...normalizeHistory(payload.history),
      {
        role: 'user',
        content: String(prompt),
      },
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: 900,
        enable_thinking: false,
        enable_search: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(
        {
          error: data?.error?.message || data?.message || 'Qwen 接口请求失败。',
          status: response.status,
        },
        response.status
      );
    }

    const answer = cleanAnswer(data?.choices?.[0]?.message?.content || data?.output?.text);

    return jsonResponse({
      text: answer,
      answer,
      message: answer,
      reply: answer,
      model: MODEL,
      web_search: true,
      usage: data?.usage,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error.message || '服务器错误。',
      },
      500
    );
  }
}
