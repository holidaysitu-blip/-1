import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfxssdnqxtfrpqelbndm.supabase.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'guwuxuanyexiao';
const PROJECT_KEYWORDS = ['章园', '夜校', '中医', '经络', '魔碗', '书法', '书写', '雅活', '美学', '活动'];
const MEMBER_USER = 'member-profile';
const CAT_LINK_USER = 'xunmao-link';
const MARKET_ITEM_USER = 'market-item';
const MARKET_FAVORITE_PREFIX = 'market-favorite:';

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

  const courses = coursesResult.data.filter((course) =>
    hasProjectKeyword(course.title, course.description, course.category, course.location, course.tag)
  );
  const courseIds = new Set(courses.map((course) => course.id));

  const registrations = registrationsResult.data.filter((row) => {
    if (row.course_id && courseIds.has(row.course_id)) return true;
    return hasProjectKeyword(row.user_name, row.courses?.title);
  });

  const members = notesResult.data.filter((note) => note.user_id === MEMBER_USER).map(parseMember);
  const market_items = notesResult.data.filter((note) => note.user_id === MARKET_ITEM_USER).map(parseMarketItem);
  const market_favorites = notesResult.data
    .filter((note) => String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX))
    .map(parseMarketFavorite);
  const notes = notesResult.data.filter((note) =>
    note.user_id !== MEMBER_USER &&
    note.user_id !== CAT_LINK_USER &&
    note.user_id !== MARKET_ITEM_USER &&
    !String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX)
  );

  const favorites = favoritesResult.data.filter((favorite) => {
    if (favorite.course_id && courseIds.has(favorite.course_id)) return true;
    return hasProjectKeyword(favorite.courses?.title);
  });

  return {
    members,
    registrations,
    courses,
    notes,
    favorites,
    market_items,
    market_favorites,
    generated_at: new Date().toISOString(),
    filters: {
      project: '章园夜校',
      hidden_non_project_rows: {
        registrations: registrationsResult.data.length - registrations.length,
        notes: notesResult.data.length - notes.length - members.length - market_items.length - market_favorites.length,
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
