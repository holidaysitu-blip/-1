import { getServiceSupabase, listWechatNews, selectRelevantWechatNews } from './_shared/wechat-news.js';

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = process.env.QWEN_MODEL || 'qwen-plus';

const SYSTEM_PROMPT = `
你是“古吴轩章园”的智能咨询助手，名字叫“小吴”。
回答规则：
1. 优先回答古吴轩章园、夜校课程、活动、报名、雅集、寻猫记、苏州文化相关问题。
2. 涉及最新消息、活动时间、课程安排、价格、名额、报名状态、地点、老师、优惠等可能变化的信息时，必须优先依据“古吴轩公众号资料库”或后台课程/活动资料回答。
3. 如果公众号资料库没有明确资料，可以使用联网搜索补充，但必须明确写出：“未在古吴轩公众号资料库中查到，以下为网络补充信息，需人工确认。”不能把网络补充说成公众号官方确认。
4. 不要编造日期、价格、名额、地址、老师、联系方式、课程安排、优惠券或报名承诺。没有资料时就说没有查到明确说明，并建议联系工作人员确认。
5. 如果使用了公众号资料库，回答末尾必须列出来源，格式为“来源：古吴轩公众号｜日期｜标题/链接”。
6. 必须使用简体中文，回答简短、清楚、像真实工作人员。
7. 如果用户问报名方式，引导用户使用页面上的报名、预约或提交信息按钮。`;

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

async function loadWechatContext(prompt) {
  try {
    const supabase = getServiceSupabase();
    const news = await listWechatNews(supabase, 80);
    return selectRelevantWechatNews(news, prompt, 5);
  } catch (error) {
    console.warn('Load wechat news failed:', error.message);
    return [];
  }
}

function buildWechatContext(items = []) {
  if (!items.length) {
    return '古吴轩公众号资料库：当前没有匹配到可确认的公众号资料。';
  }

  const rows = items.map((item, index) => {
    const date = item.publishedAt || item.created_at || '未标注日期';
    const source = item.sourceUrl || item.title;
    const body = [item.summary, item.content].filter(Boolean).join('\n').slice(0, 1800);
    return `【资料${index + 1}】标题：${item.title}\n日期：${date}\n来源：${source}\n内容：${body}`;
  });

  return `古吴轩公众号资料库（只把以下内容视为官方公众号资料）：\n${rows.join('\n\n')}`;
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

    const officialNews = await loadWechatContext(prompt);
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'system',
        content: buildWechatContext(officialNews),
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
        temperature: 0.15,
        top_p: 0.7,
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
      official_news_count: officialNews.length,
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
