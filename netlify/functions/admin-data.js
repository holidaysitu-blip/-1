import { createClient } from '@supabase/supabase-js';
import { WECHAT_NEWS_USER, noteToWechatNews } from './_shared/wechat-news.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfxssdnqxtfrpqelbndm.supabase.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'guwuxuanyexiao';
const PROJECT_KEYWORDS = ['古吴轩章园', '夜校', '中医', '经络', '魔碗', '书法', '书写', '雅活', '美学', '活动'];
const MEMBER_USER = 'member-profile';
const CAT_LINK_USER = 'xunmao-link';
const MARKET_ITEM_USER = 'market-item';
const MARKET_FAVORITE_PREFIX = 'market-favorite:';
const TEXT_FIXES = [
  ['涓尰鍏荤敓', '中医养生'],
  ['鍥藉浜烘枃', '国学人文'],
  ['缇庡闆呮椿', '美学雅活'],
  ['鑼堕亾棣欓亾', '茶道香道'],
  ['鐞存涔︾敾', '琴棋书画'],
  ['鎵嬩綔浣撻獙', '手作体验'],
  ['娲诲姩浣撻獙', '活动体验'],
  ['鍙ゅ惔杞╃珷鍥?', '古吴轩章园'],
  ['澶滄牎绌洪棿', '夜校空间'],
  ['路', ' · '],
];

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

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('Netlify 环境变量缺少 SUPABASE_SECRET_KEY');

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function safeSelect(table, query) {
  const { data, error } = await query;
  if (error) return { table, data: [], error: error.message };
  return { table, data: data || [], error: null };
}

function hasProjectKeyword(...values) {
  const text = values.filter(Boolean).join(' ');
  return PROJECT_KEYWORDS.some((keyword) => text.includes(keyword));
}

function cleanText(value = '') {
  let text = String(value || '');
  for (const [bad, good] of TEXT_FIXES) {
    text = text.split(bad).join(good);
  }
  return text
    .replace(/中医[�?]+养?生/g, '中医养生')
    .replace(/美学[�?]+活/g, '美学雅活')
    .replace(/魏碑书法[�?]+门/g, '魏碑书法入门')
    .replace(/章园[�?]+夜校空间/g, '章园 · 夜校空间')
    .replace(/周[�?]+(?=\s*[0-9])/g, '周六')
    .replace(/\s*·\s*/g, ' · ')
    .trim();
}

function cleanCourse(course = {}) {
  if (!course) return course;
  return {
    ...course,
    title: cleanText(course.title),
    description: cleanText(course.description),
    instructor: cleanText(course.instructor),
    category: cleanText(course.category),
    date_info: cleanText(course.date_info),
    location: cleanText(course.location),
    tag: cleanText(course.tag),
  };
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

function parseMember(note) {
  const extra = parseJson(note.content, {});
  return {
    id: note.id,
    name: note.title,
    phone: note.course_name,
    created_at: note.created_at,
    ...extra,
    points: 0,
    coupons: 0,
    wallet: 0,
  };
}

function parseMarketItem(note) {
  const payload = parseJson(note.content, {});
  const imageUrls = Array.isArray(payload.image_urls)
    ? payload.image_urls.filter((item) => typeof item === 'string' && item.trim())
    : [];
  const imageUrl = String(payload.image_url || '').trim();
  return {
    id: note.id,
    name: note.title,
    description: String(payload.description || ''),
    price: Number(payload.price || 0),
    image_url: imageUrl || imageUrls[0] || '',
    image_urls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
    tag: String(payload.tag || ''),
    status: payload.status === 'hidden' ? 'hidden' : 'published',
    created_at: note.created_at,
  };
}

function parseMarketFavorite(note) {
  const payload = parseJson(note.content, {});
  const imageUrls = Array.isArray(payload.image_urls)
    ? payload.image_urls.filter((item) => typeof item === 'string' && item.trim())
    : [];
  const imageUrl = String(payload.image_url || '').trim();
  return {
    id: note.id,
    user_id: note.user_id,
    item_id: String(payload.item_id || String(note.course_name || '').replace(MARKET_FAVORITE_PREFIX, '')),
    name: String(payload.name || note.title || ''),
    description: String(payload.description || ''),
    price: Number(payload.price || 0),
    image_url: imageUrl || imageUrls[0] || '',
    image_urls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
    tag: String(payload.tag || ''),
    created_at: note.created_at,
  };
}

async function loadAdminData(supabase) {
  const [coursesResult, registrationsResult, notesResult, favoritesResult] = await Promise.all([
    safeSelect('courses', supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(300)),
    safeSelect('registrations', supabase.from('registrations').select('*, courses(id, title, date_info)').order('created_at', { ascending: false }).limit(500)),
    safeSelect('notes', supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(1500)),
    safeSelect('favorites', supabase.from('favorites').select('*, courses(id, title)').order('created_at', { ascending: false }).limit(500)),
  ]);

  const courses = coursesResult.data.map(cleanCourse).filter((course) =>
    hasProjectKeyword(course.title, course.description, course.category, course.location, course.tag)
  );
  const courseIds = new Set(courses.map((course) => course.id));

  const registrations = registrationsResult.data.filter((row) => {
    if (row.course_id && courseIds.has(row.course_id)) return true;
    return hasProjectKeyword(row.user_name, row.courses?.title);
  }).map((row) => ({ ...row, courses: cleanCourse(row.courses) }));

  const members = notesResult.data.filter((note) => note.user_id === MEMBER_USER).map(parseMember);
  const market_items = notesResult.data.filter((note) => note.user_id === MARKET_ITEM_USER).map(parseMarketItem);
  const wechat_news = notesResult.data.filter((note) => note.user_id === WECHAT_NEWS_USER).map(noteToWechatNews);
  const market_favorites = notesResult.data
    .filter((note) => String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX))
    .map(parseMarketFavorite);
  const notes = notesResult.data.filter((note) =>
    note.user_id !== MEMBER_USER &&
    note.user_id !== CAT_LINK_USER &&
    note.user_id !== MARKET_ITEM_USER &&
    note.user_id !== WECHAT_NEWS_USER &&
    !String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX)
  );

  const favorites = favoritesResult.data.filter((favorite) => {
    if (favorite.course_id && courseIds.has(favorite.course_id)) return true;
    return hasProjectKeyword(favorite.courses?.title);
  }).map((favorite) => ({ ...favorite, courses: cleanCourse(favorite.courses) }));

  return {
    members,
    registrations,
    courses,
    notes,
    favorites,
    market_items,
    wechat_news,
    market_favorites,
    generated_at: new Date().toISOString(),
    filters: {
      project: '古吴轩章园',
      hidden_non_project_rows: {
        registrations: registrationsResult.data.length - registrations.length,
        notes: notesResult.data.length - notes.length - members.length - market_items.length - wechat_news.length - market_favorites.length,
        favorites: favoritesResult.data.length - favorites.length,
      },
    },
    errors: [coursesResult, registrationsResult, notesResult, favoritesResult].filter((result) => result.error),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'POST') return jsonResponse({ error: '只支持 POST 请求' }, 405);

  try {
    const body = JSON.parse(event.body || '{}');
    if (body.password !== ADMIN_PASSWORD) return jsonResponse({ error: '密码错误' }, 401);
    return jsonResponse(await loadAdminData(getSupabase()));
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : '后台数据加载失败' }, 500);
  }
}
