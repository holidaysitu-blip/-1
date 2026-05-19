import { createClient } from '@supabase/supabase-js';
import {
  deleteWechatNews,
  importWechatArticleUrl,
  listWechatNews,
  syncWechatNewsFromApi,
  upsertWechatNews,
} from './_shared/wechat-news.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfxssdnqxtfrpqelbndm.supabase.co';
const ADMIN_PASSWORD = process.env.CONTENT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'guwuxuanyexiao';
const IMAGE_BUCKET = process.env.ADMIN_IMAGE_BUCKET || 'night-school-images';
const PROJECT_KEYWORDS = ['古吴轩章园', '夜校', '中医', '经络', '魔碗', '书法', '书写', '雅活', '美学', '活动'];
const CAT_LINK_USER = 'xunmao-link';
const MARKET_ITEM_USER = 'market-item';
const CATEGORY_USER = 'content-category';
const SITE_URL = 'https://cheerly-elf-832745.netlify.app';
const DEFAULT_CATEGORIES = ['中医养生', '国学人文', '美学雅活', '茶道香道', '琴棋书画', '手作体验', '活动体验'];
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
  return {
    ...course,
    title: cleanText(course.title),
    description: cleanText(course.description),
    instructor: cleanText(course.instructor),
    category: cleanText(course.category),
    date_info: cleanText(course.date_info),
    location: cleanText(course.location),
    tag: cleanText(course.tag),
    registration_url: String(course.registration_url || '').trim(),
  };
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

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('Netlify 环境变量缺少 SUPABASE_SECRET_KEY');

  return createClient(SUPABASE_URL, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function hasProjectKeyword(...values) {
  const text = values.filter(Boolean).join(' ');
  return PROJECT_KEYWORDS.some((keyword) => text.includes(keyword));
}

function sanitizeCourse(course = {}) {
  const payload = {
    title: cleanText(course.title),
    description: cleanText(course.description),
    price: Number(course.price || 0),
    instructor: cleanText(course.instructor),
    category: cleanText(course.category),
    image_url: String(course.image_url || '').trim(),
    date_info: cleanText(course.date_info),
    location: cleanText(course.location),
    tag: cleanText(course.tag) || null,
    registration_url: String(course.registration_url || '').trim(),
  };

  if (!payload.title) throw new Error('请填写标题');
  if (!payload.category) throw new Error('请填写分类');
  if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error('价格不正确');

  return payload;
}

function createSlug(value = '') {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'content'}-${Date.now().toString(36)}`;
}

function parseCatContent(content = '') {
  try {
    const payload = JSON.parse(content);
    return {
      content_type: payload.content_type === 'html' ? 'html' : 'url',
      target_url: String(payload.target_url || ''),
      html_code: String(payload.html_code || ''),
    };
  } catch {
    return {
      content_type: 'url',
      target_url: String(content || ''),
      html_code: '',
    };
  }
}

function sanitizeCatLink(link = {}) {
  const title = String(link.title || '').trim();
  const content_type = link.content_type === 'url' ? 'url' : 'html';
  const slug = String(link.slug || '').trim() || createSlug(title);
  const html_code = String(link.html_code || '').trim();
  const target_url = String(link.target_url || link.url || '').trim();

  if (!title) throw new Error('请填写名称');

  if (content_type === 'url') {
    if (!target_url) throw new Error('请填写网址');
    let parsed;
    try {
      parsed = new URL(target_url);
    } catch {
      throw new Error('网址格式不正确，请以 https:// 或 http:// 开头');
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('网址只支持 http 或 https');
    return {
      title,
      slug,
      content_type,
      target_url: parsed.toString(),
      html_code: '',
    };
  }

  if (!html_code) throw new Error('请粘贴 HTML/代码内容');
  if (html_code.length > 900000) throw new Error('代码内容太长，请控制在约 900KB 以内');

  return {
    title,
    slug,
    content_type,
    target_url: '',
    html_code,
  };
}

function serializeCatContent(link) {
  return JSON.stringify({
    content_type: link.content_type,
    target_url: link.target_url,
    html_code: link.html_code,
  });
}

function noteToLink(note) {
  const content = parseCatContent(note.content);
  return {
    id: note.id,
    title: note.title,
    slug: note.course_name,
    qr_url: `${SITE_URL}/cat-story/${encodeURIComponent(note.course_name)}`,
    created_at: note.created_at,
    ...content,
  };
}

function parseMarketContent(content = '') {
  try {
    const payload = JSON.parse(content || '{}');
    const imageUrls = Array.isArray(payload.image_urls)
      ? payload.image_urls.filter((item) => typeof item === 'string' && item.trim())
      : [];
    const imageUrl = String(payload.image_url || '').trim();
    return {
      description: String(payload.description || ''),
      price: Number(payload.price || 0),
      image_url: imageUrl || imageUrls[0] || '',
      image_urls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
      tag: String(payload.tag || ''),
      status: payload.status === 'hidden' ? 'hidden' : 'published',
    };
  } catch {
    return {
      description: String(content || ''),
      price: 0,
      image_url: '',
      tag: '',
      status: 'published',
    };
  }
}

function noteToMarketItem(note) {
  return {
    id: note.id,
    name: note.title,
    created_at: note.created_at,
    ...parseMarketContent(note.content),
  };
}

function sanitizeMarketItem(item = {}) {
  let imageUrls = [];
  try {
    const parsed = JSON.parse(String(item.image_url || ''));
    if (Array.isArray(parsed)) imageUrls = parsed.filter((value) => typeof value === 'string' && value.trim());
  } catch {
    imageUrls = String(item.image_url || '').trim() ? [String(item.image_url || '').trim()] : [];
  }
  const payload = {
    name: String(item.name || item.title || '').trim(),
    description: String(item.description || '').trim(),
    price: Number(item.price || 0),
    image_url: String(item.image_url || '').trim(),
    image_urls: imageUrls,
    tag: String(item.tag || '').trim(),
    status: item.status === 'hidden' ? 'hidden' : 'published',
  };

  if (!payload.name) throw new Error('请填写雅集内容名称');
  if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error('雅集价格不正确');
  return payload;
}

function serializeMarketItem(item) {
  return JSON.stringify({
    description: item.description,
    price: item.price,
    image_url: item.image_url,
    image_urls: item.image_urls,
    tag: item.tag,
    status: item.status,
  });
}

async function listCourses(supabase) {
  const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(`读取内容失败：${error.message}`);

  return (data || []).map(cleanCourse).filter((course) =>
    hasProjectKeyword(course.title, course.description, course.category, course.location, course.tag)
  );
}

async function listCatLinks(supabase) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', CAT_LINK_USER)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`读取寻猫记内容失败：${error.message}`);
  return (data || []).map(noteToLink);
}

async function listMarketItems(supabase, includeHidden = true) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', MARKET_ITEM_USER)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`读取雅集内容失败：${error.message}`);
  const items = (data || []).map(noteToMarketItem);
  return includeHidden ? items : items.filter((item) => item.status !== 'hidden');
}

async function listCategories(supabase) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', CATEGORY_USER)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`读取分类失败：${error.message}`);
  const saved = (data || []).map((note) => ({ id: note.id, name: note.title, created_at: note.created_at }));
  if (saved.length > 0) return saved;
  return DEFAULT_CATEGORIES.map((name) => ({ id: name, name, created_at: null }));
}

async function savedCategoryRows(supabase) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', CATEGORY_USER)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`读取分类失败：${error.message}`);
  return data || [];
}

async function seedCategories(supabase, names) {
  if (names.length === 0) return [];
  const rows = names.map((name) => ({
    user_id: CATEGORY_USER,
    title: name,
    content: JSON.stringify({ type: 'category' }),
    course_name: '课程/活动分类',
  }));
  const { data, error } = await supabase.from('notes').insert(rows).select('*');
  if (error) throw new Error(`保存分类失败：${error.message}`);
  return (data || []).map((note) => ({ id: note.id, name: note.title, created_at: note.created_at }));
}

async function upsertCatLink(supabase, link) {
  const payload = sanitizeCatLink(link);
  const row = {
    user_id: CAT_LINK_USER,
    title: payload.title,
    content: serializeCatContent(payload),
    course_name: payload.slug,
  };

  const id = String(link?.id || '').trim();
  const query = id
    ? supabase.from('notes').update(row).eq('id', id).select('*').single()
    : supabase.from('notes').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) throw new Error(`保存寻猫记内容失败：${error.message}`);
  return noteToLink(data);
}

async function upsertMarketItem(supabase, item) {
  const payload = sanitizeMarketItem(item);
  const row = {
    user_id: MARKET_ITEM_USER,
    title: payload.name,
    content: serializeMarketItem(payload),
    course_name: '雅集',
  };

  const id = String(item?.id || '').trim();
  const query = id
    ? supabase.from('notes').update(row).eq('id', id).eq('user_id', MARKET_ITEM_USER).select('*').single()
    : supabase.from('notes').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) throw new Error(`保存雅集内容失败：${error.message}`);
  return noteToMarketItem(data);
}

async function upsertCategory(supabase, category = {}) {
  const name = String(category.name || '').trim();
  if (!name) throw new Error('请填写分类名称');
  const id = String(category.id || '').trim();
  if (DEFAULT_CATEGORIES.includes(id)) {
    const saved = await savedCategoryRows(supabase);
    if (saved.length === 0) {
      const names = DEFAULT_CATEGORIES.map((item) => (item === id ? name : item));
      const categories = await seedCategories(supabase, names);
      return categories.find((item) => item.name === name) || categories[0];
    }
  }
  const row = {
    user_id: CATEGORY_USER,
    title: name,
    content: JSON.stringify({ type: 'category' }),
    course_name: '课程/活动分类',
  };
  const query = id && !DEFAULT_CATEGORIES.includes(id)
    ? supabase.from('notes').update(row).eq('id', id).eq('user_id', CATEGORY_USER).select('*').single()
    : supabase.from('notes').insert(row).select('*').single();
  const { data, error } = await query;
  if (error) throw new Error(`保存分类失败：${error.message}`);
  return { id: data.id, name: data.title, created_at: data.created_at };
}

async function deleteCatLink(supabase, id) {
  const linkId = String(id || '').trim();
  if (!linkId) throw new Error('缺少内容 ID');
  const { error } = await supabase.from('notes').delete().eq('id', linkId).eq('user_id', CAT_LINK_USER);
  if (error) throw new Error(`删除寻猫记内容失败：${error.message}`);
}

async function deleteMarketItem(supabase, id) {
  const itemId = String(id || '').trim();
  if (!itemId) throw new Error('缺少雅集内容 ID');
  const { error } = await supabase.from('notes').delete().eq('id', itemId).eq('user_id', MARKET_ITEM_USER);
  if (error) throw new Error(`删除雅集内容失败：${error.message}`);
}

async function deleteCategory(supabase, id) {
  const categoryId = String(id || '').trim();
  if (!categoryId) throw new Error('缺少分类 ID');
  if (DEFAULT_CATEGORIES.includes(categoryId)) {
    const saved = await savedCategoryRows(supabase);
    if (saved.length === 0) await seedCategories(supabase, DEFAULT_CATEGORIES.filter((name) => name !== categoryId));
    return;
  }
  const { error } = await supabase.from('notes').delete().eq('id', categoryId).eq('user_id', CATEGORY_USER);
  if (error) throw new Error(`删除分类失败：${error.message}`);
}

async function getCatLink(supabase, slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) throw new Error('缺少内容编号');
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', CAT_LINK_USER)
    .eq('course_name', safeSlug)
    .single();

  if (error) return null;
  return noteToLink(data);
}

async function ensureImageBucket(supabase) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`读取图片空间失败：${listError.message}`);

  const exists = buckets?.some((bucket) => bucket.name === IMAGE_BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (error) throw new Error(`创建图片空间失败：${error.message}`);
  }
}

async function uploadImage(supabase, image = {}, folder = 'courses') {
  const contentType = String(image.contentType || 'image/jpeg');
  if (!contentType.startsWith('image/')) throw new Error('只能上传图片文件');

  const rawBase64 = String(image.base64 || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');
  if (!buffer.length) throw new Error('图片内容为空');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('图片不能超过 8MB');

  await ensureImageBucket(supabase);

  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const safeName =
    String(image.fileName || 'content-image')
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'content-image';
  const safeFolder = String(folder || 'courses').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const path = `${safeFolder}/${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`上传图片失败：${error.message}`);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { image_url: data.publicUrl, path };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'POST') return jsonResponse({ error: '只支持 POST 请求' }, 405);

  try {
    const body = JSON.parse(event.body || '{}');
    const supabase = getSupabase();
    const action = body.action || 'list';

    if (action === 'getCatLink') {
      const link = await getCatLink(supabase, body.slug);
      if (!link) return jsonResponse({ error: '内容不存在或已删除' }, 404);
      return jsonResponse({ link });
    }

    if (action === 'listMarketItems') {
      return jsonResponse({ market_items: await listMarketItems(supabase, false), generated_at: new Date().toISOString() });
    }

    if (body.password !== ADMIN_PASSWORD) return jsonResponse({ error: '密码错误' }, 401);

    if (action === 'list') {
      const [courses, cat_links, market_items, categories, wechat_news] = await Promise.all([
        listCourses(supabase),
        listCatLinks(supabase),
        listMarketItems(supabase, true),
        listCategories(supabase),
        listWechatNews(supabase),
      ]);
      return jsonResponse({ courses, cat_links, market_items, categories, wechat_news, generated_at: new Date().toISOString() });
    }

    if (action === 'upsertCourse') {
      const payload = sanitizeCourse(body.course);
      const id = String(body.course?.id || '').trim();
      const query = (coursePayload) => id
        ? supabase.from('courses').update(coursePayload).eq('id', id).select('*').single()
        : supabase.from('courses').insert(coursePayload).select('*').single();
      let { data, error } = await query(payload);
      if (error && /registration_url/i.test(error.message || '')) {
        const { registration_url, ...fallbackPayload } = payload;
        ({ data, error } = await query(fallbackPayload));
      }
      if (error) throw new Error(`保存内容失败：${error.message}`);
      return jsonResponse({ course: cleanCourse(data) });
    }

    if (action === 'deleteCourse') {
      const id = String(body.id || '').trim();
      if (!id) throw new Error('缺少内容 ID');
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw new Error(`删除内容失败：${error.message}`);
      return jsonResponse({ ok: true });
    }

    if (action === 'uploadImage') return jsonResponse(await uploadImage(supabase, body.image, body.folder || 'courses'));
    if (action === 'upsertCatLink') return jsonResponse({ link: await upsertCatLink(supabase, body.link) });
    if (action === 'deleteCatLink') {
      await deleteCatLink(supabase, body.id);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertMarketItem') return jsonResponse({ item: await upsertMarketItem(supabase, body.item) });
    if (action === 'deleteMarketItem') {
      await deleteMarketItem(supabase, body.id);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertCategory') return jsonResponse({ category: await upsertCategory(supabase, body.category) });
    if (action === 'deleteCategory') {
      await deleteCategory(supabase, body.id);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertWechatNews') return jsonResponse({ item: await upsertWechatNews(supabase, body.item) });
    if (action === 'importWechatArticle') {
      const article = await importWechatArticleUrl(body.url);
      return jsonResponse({ item: await upsertWechatNews(supabase, article) });
    }
    if (action === 'syncWechatNews') return jsonResponse(await syncWechatNewsFromApi(supabase, { count: body.count || 20 }));
    if (action === 'deleteWechatNews') {
      await deleteWechatNews(supabase, body.id);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: '未知操作' }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : '内容后台操作失败' }, 500);
  }
}
