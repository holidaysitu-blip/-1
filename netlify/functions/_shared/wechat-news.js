import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfxssdnqxtfrpqelbndm.supabase.co';
export const WECHAT_NEWS_USER = 'wechat-official-news';

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('Netlify 环境变量缺少 SUPABASE_SECRET_KEY');

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

function normalizeText(value = '') {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(value = '') {
  return normalizeText(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

export function noteToWechatNews(note = {}) {
  const payload = parseJson(note.content, {});
  return {
    id: note.id,
    title: note.title || payload.title || '',
    publishedAt: payload.publishedAt || payload.published_at || '',
    sourceUrl: payload.sourceUrl || payload.source_url || '',
    summary: payload.summary || '',
    content: payload.content || '',
    origin: payload.origin || 'manual',
    syncedAt: payload.syncedAt || payload.synced_at || note.created_at || '',
    created_at: note.created_at,
  };
}

export function sanitizeWechatNews(input = {}) {
  const title = normalizeText(input.title);
  const sourceUrl = normalizeText(input.sourceUrl || input.source_url);
  const summary = normalizeText(input.summary);
  const content = normalizeText(input.content);
  const publishedAt = normalizeText(input.publishedAt || input.published_at);
  const origin = normalizeText(input.origin || 'manual') || 'manual';

  if (!title) throw new Error('请填写公众号消息标题');
  if (!content && !summary && !sourceUrl) throw new Error('请填写公众号正文、摘要或来源链接');

  return {
    title,
    sourceUrl,
    summary: summary || content.slice(0, 180),
    content,
    publishedAt,
    origin,
    syncedAt: new Date().toISOString(),
  };
}

function serializeWechatNews(item) {
  return JSON.stringify({
    sourceUrl: item.sourceUrl,
    summary: item.summary,
    content: item.content,
    publishedAt: item.publishedAt,
    origin: item.origin,
    syncedAt: item.syncedAt,
  });
}

export async function listWechatNews(supabase, limit = 200) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', WECHAT_NEWS_USER)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`读取公众号消息失败：${error.message}`);
  return (data || []).map(noteToWechatNews);
}

export async function upsertWechatNews(supabase, input = {}) {
  const payload = sanitizeWechatNews(input);
  const row = {
    user_id: WECHAT_NEWS_USER,
    title: payload.title,
    content: serializeWechatNews(payload),
    course_name: payload.sourceUrl || payload.publishedAt || '古吴轩公众号',
  };

  const id = String(input.id || '').trim();
  let query;
  if (id) {
    query = supabase.from('notes').update(row).eq('id', id).eq('user_id', WECHAT_NEWS_USER).select('*').single();
  } else if (payload.sourceUrl) {
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', WECHAT_NEWS_USER)
      .eq('course_name', payload.sourceUrl)
      .maybeSingle();
    query = existing?.id
      ? supabase.from('notes').update(row).eq('id', existing.id).select('*').single()
      : supabase.from('notes').insert(row).select('*').single();
  } else {
    query = supabase.from('notes').insert(row).select('*').single();
  }

  const { data, error } = await query;
  if (error) throw new Error(`保存公众号消息失败：${error.message}`);
  return noteToWechatNews(data);
}

export async function deleteWechatNews(supabase, id) {
  const newsId = String(id || '').trim();
  if (!newsId) throw new Error('缺少公众号消息 ID');
  const { error } = await supabase.from('notes').delete().eq('id', newsId).eq('user_id', WECHAT_NEWS_USER);
  if (error) throw new Error(`删除公众号消息失败：${error.message}`);
}

function findFirst(patterns, text) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return '';
}

export async function importWechatArticleUrl(url) {
  const parsed = new URL(String(url || '').trim());
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('公众号链接必须以 http:// 或 https:// 开头');

  const response = await fetch(parsed.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GuwuxuanZhangyuanBot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`读取公众号链接失败：HTTP ${response.status}`);

  const html = await response.text();
  const title = findFirst(
    [
      /var\s+msg_title\s*=\s*['"]([^'"]+)['"]/i,
      /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ],
    html
  );
  const publishedAt = findFirst([/var\s+ct\s*=\s*['"]?(\d{10})['"]?/i, /id=["']publish_time["'][^>]*>([\s\S]*?)<\/[^>]+>/i], html);
  const contentHtml = html.match(/id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<script/i)?.[1] || html;
  const content = stripHtml(contentHtml).slice(0, 12000);

  return sanitizeWechatNews({
    title: title || parsed.hostname,
    sourceUrl: parsed.toString(),
    publishedAt: /^\d{10}$/.test(publishedAt) ? new Date(Number(publishedAt) * 1000).toISOString().slice(0, 10) : publishedAt,
    summary: content.slice(0, 220),
    content,
    origin: 'manual-url',
  });
}

async function fetchWechatAccessToken() {
  const appId = process.env.WECHAT_APP_ID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appId || !secret) throw new Error('缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET');

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.errmsg || '获取微信 access_token 失败');
  return data.access_token;
}

function articleFromNewsItem(item = {}, origin = 'wechat-api') {
  const url = item.url || item.content_source_url || item.source_url || '';
  return sanitizeWechatNews({
    title: item.title || '古吴轩公众号消息',
    sourceUrl: url,
    publishedAt: item.update_time ? new Date(Number(item.update_time) * 1000).toISOString().slice(0, 10) : '',
    summary: stripHtml(item.digest || item.content || '').slice(0, 220),
    content: stripHtml(item.content || item.digest || '').slice(0, 12000),
    origin,
  });
}

async function postWechatJson(path, token, body) {
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/${path}?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.errcode && data.errcode !== 0) throw new Error(data.errmsg || `微信接口 ${path} 失败`);
  return data;
}

export async function syncWechatNewsFromApi(supabase, options = {}) {
  const token = await fetchWechatAccessToken();
  const count = Math.min(Number(options.count || 20), 20);
  const attempts = [
    { path: 'freepublish/batchget', body: { offset: 0, count, no_content: 0 }, origin: 'wechat-freepublish' },
    { path: 'draft/batchget', body: { offset: 0, count, no_content: 0 }, origin: 'wechat-draft' },
    { path: 'material/batchget_material', body: { type: 'news', offset: 0, count }, origin: 'wechat-material' },
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const data = await postWechatJson(attempt.path, token, attempt.body);
      const list = Array.isArray(data.item) ? data.item : [];
      const articles = [];
      for (const item of list) {
        const newsItems = item.content?.news_item || item.news_item || [];
        for (const newsItem of newsItems) articles.push(articleFromNewsItem(newsItem, attempt.origin));
      }
      if (articles.length === 0) continue;

      const saved = [];
      for (const article of articles) saved.push(await upsertWechatNews(supabase, article));
      return { ok: true, source: attempt.origin, synced: saved.length, items: saved, errors };
    } catch (error) {
      errors.push(`${attempt.path}: ${error.message}`);
    }
  }

  return { ok: false, synced: 0, items: [], errors };
}

export function selectRelevantWechatNews(items, prompt, maxItems = 5) {
  const words = String(prompt || '')
    .toLowerCase()
    .split(/[^\u4e00-\u9fa5a-z0-9]+/i)
    .filter((word) => word.length >= 2);

  return [...items]
    .map((item) => {
      const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 2 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || String(b.item.publishedAt || b.item.created_at).localeCompare(String(a.item.publishedAt || a.item.created_at)))
    .slice(0, maxItems)
    .map((entry) => entry.item);
}
