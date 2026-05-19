import { getServiceSupabase, listWechatNews, selectRelevantWechatNews } from './_shared/wechat-news.js';

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = process.env.QWEN_MODEL || 'qwen-plus';
const KNOWLEDGE_USER = 'knowledge-item';

const SYSTEM_PROMPT = `
你是“古吴轩章园”的智能咨询助手，名字叫“小吴”。
回答规则：
1. 优先回答古吴轩章园、夜校课程、活动、报名、雅集、寻猫记、苏州文化相关问题。
2. 涉及最新消息、活动时间、课程安排、价格、名额、报名状态、地点、老师、优惠等可能变化的信息时，必须优先依据“古吴轩公众号资料库”或后台课程/活动资料回答。
3. 不允许为了显得聪明而编造。没有在官方上下文中查到明确资料时，必须直接说“未在古吴轩章园官方资料库中查到明确资料，需工作人员人工确认。”
4. 不要编造日期、价格、名额、地址、老师、联系方式、课程安排、优惠券或报名承诺。没有资料时就说没有查到明确说明，并建议联系工作人员确认。
5. 如果使用了公众号资料库，回答末尾必须列出来源，格式为“来源：古吴轩公众号｜日期｜标题/链接”。
6. 如果使用后台课程/活动资料，回答末尾列出“来源：后台课程资料｜课程标题”。
7. 必须使用简体中文，回答简短、清楚、像真实工作人员。
8. 如果用户问报名方式，引导用户使用页面上的报名、预约或提交信息按钮。`;

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

function wordsFrom(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .split(/[^\u4e00-\u9fa5a-z0-9]+/i)
    .filter((word) => word.length >= 2);
}

function selectRelevantItems(items, prompt, maxItems = 5) {
  const words = wordsFrom(prompt);
  return [...items]
    .map((item) => {
      const haystack = `${item.title || ''} ${item.name || ''} ${item.category || ''} ${item.description || ''} ${item.content || ''} ${item.optionsText || ''}`.toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 2 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')))
    .slice(0, maxItems)
    .map((entry) => entry.item);
}

function buildTimeContext(payload = {}) {
  const serverNow = new Date();
  const clientTime = String(payload.client_time_text || payload.client_time || '').trim();
  const clientTimezone = String(payload.client_timezone || '').trim();
  const chinaTime = serverNow.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    weekday: 'long',
  });

  return [
    `当前时间信息：`,
    clientTime ? `用户设备时间：${clientTime}${clientTimezone ? `（${clientTimezone}）` : ''}` : '',
    `服务器北京时间：${chinaTime}（Asia/Shanghai）`,
    `如果用户询问现在时间、今天日期、星期几或相对时间，请直接依据以上时间回答，不要说无法获取实时信息。`,
  ].filter(Boolean).join('\n');
}

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

async function loadOfficialContext(prompt) {
  try {
    const supabase = getServiceSupabase();
    const [coursesResult, knowledgeResult] = await Promise.all([
      supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(120),
      supabase.from('notes').select('*').eq('user_id', KNOWLEDGE_USER).order('created_at', { ascending: false }).limit(120),
    ]);

    if (coursesResult.error) throw new Error(coursesResult.error.message);
    if (knowledgeResult.error) throw new Error(knowledgeResult.error.message);

    const optionsResult = await supabase.from('course_options').select('*').order('created_at', { ascending: true }).limit(300);
    const options = optionsResult.error ? [] : optionsResult.data || [];

    const optionsByCourse = new Map();
    for (const option of options) {
      const list = optionsByCourse.get(option.course_id) || [];
      list.push(option);
      optionsByCourse.set(option.course_id, list);
    }

    const courses = (coursesResult.data || []).map((course) => {
      const options = optionsByCourse.get(course.id) || [];
      return {
        ...course,
        options,
        optionsText: options.map((option) => `${option.name} ${option.date_info} ¥${option.price || course.price} 名额${option.quota || '待定'} ${option.status}`).join('；'),
      };
    });

    const knowledge = (knowledgeResult.data || []).map((note) => {
      const payload = parseJson(note.content, {});
      return {
        id: note.id,
        title: note.title,
        content: payload.content || note.content || '',
        source: payload.source || '后台资料库',
        sourceUrl: payload.sourceUrl || '',
        created_at: note.created_at,
      };
    });

    return {
      courses: selectRelevantItems(courses, prompt, 6),
      knowledge: selectRelevantItems(knowledge, prompt, 4),
    };
  } catch (error) {
    console.warn('Load official context failed:', error.message);
    return { courses: [], knowledge: [] };
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

function buildOfficialContext(context = { courses: [], knowledge: [] }) {
  const courseRows = (context.courses || []).map((course, index) => {
    const options = (course.options || [])
      .map((option) => `${option.name || '班次'} / ${option.date_info || course.date_info || '时间待定'} / ¥${option.price || course.price || 0} / 名额${option.quota || '待定'} / ${option.status === 'closed' ? '暂停报名' : '可报名'}`)
      .join('；') || '暂无班次';
    return `【课程${index + 1}】标题：${course.title}\n分类：${course.category || ''}\n价格：¥${course.price || 0}\n时间：${course.date_info || ''}\n地点：${course.location || ''}\n老师：${course.instructor || ''}\n介绍：${course.description || ''}\n跳转链接：${course.registration_url || '无'}\n班次：${options}`;
  });

  const knowledgeRows = (context.knowledge || []).map((item, index) => {
    return `【资料${index + 1}】标题：${item.title}\n来源：${item.source}${item.sourceUrl ? ` / ${item.sourceUrl}` : ''}\n内容：${String(item.content || '').slice(0, 1600)}`;
  });

  if (!courseRows.length && !knowledgeRows.length) {
    return '后台官方资料库：当前没有匹配到可确认的课程、活动或资料。';
  }

  return [
    '后台官方资料库（只把以下内容视为古吴轩章园后台可确认资料）：',
    courseRows.join('\n\n'),
    knowledgeRows.join('\n\n'),
  ].filter(Boolean).join('\n\n');
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

    const [officialNews, officialContext] = await Promise.all([
      loadWechatContext(prompt),
      loadOfficialContext(prompt),
    ]);
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'system',
        content: buildWechatContext(officialNews),
      },
      {
        role: 'system',
        content: buildOfficialContext(officialContext),
      },
      {
        role: 'system',
        content: buildTimeContext(payload),
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
        enable_search: false,
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
      qwen_connected: true,
      web_search: false,
      official_news_count: officialNews.length,
      official_course_count: officialContext.courses.length,
      official_knowledge_count: officialContext.knowledge.length,
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
