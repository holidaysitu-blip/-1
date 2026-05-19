import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { all, id, initDb, now, one, parseJson, run, saveBase64File } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'uploads');
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.CONTENT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'guwuxuanyexiao';
const siteUrl = process.env.APP_URL || 'http://47.116.35.158';

const CAT_LINK_USER = 'xunmao-link';
const MARKET_ITEM_USER = 'market-item';
const CATEGORY_USER = 'content-category';
const MEMBER_USER = 'member-profile';
const WECHAT_NEWS_USER = 'wechat-official-news';
const KNOWLEDGE_USER = 'knowledge-item';
const MARKET_FAVORITE_PREFIX = 'market-favorite:';

initDb();

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

function ok(res, data = {}) {
  res.json(data);
}

function requirePassword(body) {
  if (body?.password !== adminPassword) {
    const error = new Error('密码错误');
    error.statusCode = 401;
    throw error;
  }
}

function handleError(res, error) {
  res.status(error.statusCode || 500).json({ error: error instanceof Error ? error.message : '服务器错误' });
}

function courseImages(value = '') {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item.trim());
  } catch {
    // Old rows store a single URL as plain text.
  }
  return [String(value)].filter(Boolean);
}

const textFixes = [
  ['涓尰鍏荤敓', '中医养生'],
  ['鍥藉浜烘枃', '国学人文'],
  ['缇庡闆呮椿', '美学雅活'],
  ['鑼堕亾棣欓亾', '茶道香道'],
  ['鐞存涔︾敾', '琴棋书画'],
  ['鎵嬩綔浣撻獙', '手作体验'],
  ['娲诲姩浣撻獙', '活动体验'],
  ['鍙ゅ惔杞╃珷鍥?', '古吴轩章园'],
  ['澶滄牎绌洪棿', '夜校空间'],
  ['璇剧▼', '课程'],
  ['璁插笀', '讲师'],
  ['鑰佸笀', '老师'],
  ['鍚嶉', '名额'],
  ['鏆傚仠鎶ュ悕', '暂停报名'],
  ['鍙姤鍚?', '可报名'],
  ['寰呭畾', '待定'],
  ['路', ' · '],
];

function cleanText(value = '') {
  let text = String(value || '');
  for (const [bad, good] of textFixes) {
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

function cleanCourse(row) {
  if (!row) return row;
  return {
    ...row,
    title: cleanText(row.title),
    description: cleanText(row.description),
    instructor: cleanText(row.instructor),
    category: cleanText(row.category),
    date_info: cleanText(row.date_info),
    location: cleanText(row.location),
    tag: cleanText(row.tag),
    registration_url: String(row.registration_url || '').trim(),
  };
}

function cleanOption(row) {
  if (!row) return row;
  return {
    ...row,
    name: cleanText(row.name),
    date_info: cleanText(row.date_info),
    instructor: cleanText(row.instructor),
  };
}

function courseRow(input = {}) {
  const payload = {
    id: input.id || id(),
    title: cleanText(input.title),
    description: cleanText(input.description),
    price: Number(input.price || 0),
    instructor: cleanText(input.instructor),
    category: cleanText(input.category),
    image_url: String(input.image_url || '').trim(),
    date_info: cleanText(input.date_info),
    location: cleanText(input.location),
    tag: cleanText(input.tag) || null,
    registration_url: String(input.registration_url || '').trim(),
    created_at: input.created_at || now(),
  };
  if (!payload.title) throw new Error('请填写标题');
  if (!payload.category) throw new Error('请填写分类');
  return payload;
}

function upsertCourse(input = {}) {
  const row = courseRow(input);
  const existing = input.id ? one('select id, created_at from courses where id = @id', { id: input.id }) : null;
  row.created_at = existing?.created_at || row.created_at;
  run(
    `insert into courses (id,title,description,price,instructor,category,image_url,date_info,location,tag,registration_url,created_at)
     values (@id,@title,@description,@price,@instructor,@category,@image_url,@date_info,@location,@tag,@registration_url,@created_at)
     on conflict(id) do update set title=excluded.title, description=excluded.description, price=excluded.price,
       instructor=excluded.instructor, category=excluded.category, image_url=excluded.image_url,
       date_info=excluded.date_info, location=excluded.location, tag=excluded.tag,
       registration_url=excluded.registration_url`,
    row
  );
  return cleanCourse(one('select * from courses where id = @id', { id: row.id }));
}

function optionRow(input = {}) {
  const row = {
    id: input.id || id(),
    course_id: String(input.course_id || '').trim(),
    name: cleanText(input.name),
    date_info: cleanText(input.date_info),
    instructor: cleanText(input.instructor),
    price: Number(input.price || 0),
    quota: Number(input.quota || 0),
    status: input.status === 'closed' ? 'closed' : 'open',
    created_at: input.created_at || now(),
  };
  if (!row.course_id) throw new Error('缺少课程 ID');
  if (!row.name) throw new Error('请填写班次名称');
  return row;
}

function upsertCourseOption(input = {}) {
  const row = optionRow(input);
  const existing = input.id ? one('select created_at from course_options where id = @id', { id: input.id }) : null;
  row.created_at = existing?.created_at || row.created_at;
  run(
    `insert into course_options (id,course_id,name,date_info,instructor,price,quota,status,created_at)
     values (@id,@course_id,@name,@date_info,@instructor,@price,@quota,@status,@created_at)
     on conflict(id) do update set course_id=excluded.course_id, name=excluded.name, date_info=excluded.date_info,
       instructor=excluded.instructor, price=excluded.price, quota=excluded.quota, status=excluded.status`,
    row
  );
  return cleanOption(one('select * from course_options where id = @id', { id: row.id }));
}

function parseCatContent(content = '') {
  const payload = parseJson(content, null);
  if (payload) {
    return {
      content_type: payload.content_type === 'html' ? 'html' : 'url',
      target_url: String(payload.target_url || ''),
      html_code: String(payload.html_code || ''),
    };
  }
  return { content_type: 'url', target_url: String(content || ''), html_code: '' };
}

function noteToCatLink(note) {
  const content = parseCatContent(note.content);
  return {
    id: note.id,
    title: note.title,
    slug: note.course_name,
    qr_url: `${siteUrl}/cat-story/${encodeURIComponent(note.course_name)}`,
    created_at: note.created_at,
    ...content,
  };
}

function createSlug(value = '') {
  return `${String(value).trim().toLowerCase().replace(/https?:\/\//g, '').replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'content'}-${Date.now().toString(36)}`;
}

function upsertNoteType(userId, title, content, courseName, inputId) {
  const row = { id: inputId || id(), user_id: userId, title, content, course_name: courseName || '', created_at: now() };
  const existing = inputId ? one('select created_at from notes where id = @id', { id: inputId }) : null;
  row.created_at = existing?.created_at || row.created_at;
  run(
    `insert into notes (id,user_id,title,content,course_name,created_at)
     values (@id,@user_id,@title,@content,@course_name,@created_at)
     on conflict(id) do update set title=excluded.title, content=excluded.content, course_name=excluded.course_name`,
    row
  );
  return one('select * from notes where id = @id', { id: row.id });
}

function upsertCatLink(link = {}) {
  const title = String(link.title || '').trim();
  if (!title) throw new Error('请填写名称');
  const content_type = link.content_type === 'url' ? 'url' : 'html';
  const slug = String(link.slug || '').trim() || createSlug(title);
  const target_url = String(link.target_url || '').trim();
  const html_code = String(link.html_code || '').trim();
  if (content_type === 'url' && !target_url) throw new Error('请填写网址');
  if (content_type === 'html' && !html_code) throw new Error('请填写 HTML/代码内容');
  const note = upsertNoteType(CAT_LINK_USER, title, JSON.stringify({ content_type, target_url, html_code }), slug, link.id);
  return noteToCatLink(note);
}

function parseMarketContent(content = '') {
  const payload = parseJson(content, {});
  const imageUrls = Array.isArray(payload.image_urls) ? payload.image_urls.filter(Boolean) : [];
  const imageUrl = String(payload.image_url || '').trim();
  return {
    description: String(payload.description || ''),
    price: Number(payload.price || 0),
    image_url: imageUrl || imageUrls[0] || '',
    image_urls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
    tag: String(payload.tag || ''),
    status: payload.status === 'hidden' ? 'hidden' : 'published',
  };
}

function noteToMarketItem(note) {
  return { id: note.id, name: note.title, created_at: note.created_at, ...parseMarketContent(note.content) };
}

function upsertMarketItem(item = {}) {
  const name = String(item.name || item.title || '').trim();
  if (!name) throw new Error('请填写雅集内容名称');
  const imageUrls = courseImages(item.image_url);
  const content = JSON.stringify({
    description: String(item.description || ''),
    price: Number(item.price || 0),
    image_url: String(item.image_url || '').trim(),
    image_urls: imageUrls,
    tag: String(item.tag || ''),
    status: item.status === 'hidden' ? 'hidden' : 'published',
  });
  return noteToMarketItem(upsertNoteType(MARKET_ITEM_USER, name, content, '雅集', item.id));
}

function noteToWechatNews(note) {
  const payload = parseJson(note.content, {});
  return {
    id: note.id,
    title: note.title,
    publishedAt: payload.publishedAt || '',
    sourceUrl: payload.sourceUrl || '',
    summary: payload.summary || '',
    content: payload.content || '',
    origin: payload.origin || 'manual',
    syncedAt: payload.syncedAt || note.created_at,
    created_at: note.created_at,
  };
}

function upsertWechatNews(item = {}) {
  const title = String(item.title || '').trim();
  if (!title) throw new Error('请填写公众号消息标题');
  const content = JSON.stringify({
    publishedAt: String(item.publishedAt || ''),
    sourceUrl: String(item.sourceUrl || ''),
    summary: String(item.summary || ''),
    content: String(item.content || ''),
    origin: String(item.origin || 'manual'),
    syncedAt: now(),
  });
  return noteToWechatNews(upsertNoteType(WECHAT_NEWS_USER, title, content, item.sourceUrl || item.publishedAt || '古吴轩公众号', item.id));
}

function noteToKnowledgeItem(note) {
  const payload = parseJson(note.content, {});
  return {
    id: note.id,
    title: note.title,
    source: payload.source || '后台资料库',
    sourceUrl: payload.sourceUrl || '',
    content: payload.content || '',
    created_at: note.created_at,
  };
}

function upsertKnowledgeItem(item = {}) {
  const title = String(item.title || '').trim();
  const content = String(item.content || '').trim();
  if (!title) throw new Error('请填写资料标题');
  if (!content) throw new Error('请填写资料内容');
  const note = upsertNoteType(
    KNOWLEDGE_USER,
    title,
    JSON.stringify({ source: String(item.source || '后台资料库'), sourceUrl: String(item.sourceUrl || ''), content }),
    String(item.source || '后台资料库'),
    item.id
  );
  return noteToKnowledgeItem(note);
}

function parseLearningNote(note) {
  const payload = parseJson(note.content, null);
  const fallbackText = String(note.content || '');
  const text = payload ? String(payload.text || payload.content || '') : fallbackText;
  const images = payload && Array.isArray(payload.images) ? payload.images.filter((item) => typeof item === 'string') : [];
  const videos = payload && Array.isArray(payload.videos) ? payload.videos.filter((item) => typeof item === 'string') : [];
  return {
    ...note,
    text,
    images,
    videos,
    visibility: payload?.visibility === 'public' ? 'public' : 'private',
    featured: Boolean(payload?.featured),
    course_id: String(payload?.course_id || ''),
  };
}

function serializeLearningNote(input = {}) {
  return JSON.stringify({
    text: String(input.text || input.content || ''),
    images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
    videos: Array.isArray(input.videos) ? input.videos.filter(Boolean) : [],
    visibility: input.visibility === 'public' ? 'public' : 'private',
    featured: Boolean(input.featured),
    course_id: String(input.course_id || ''),
  });
}

function parseMember(note) {
  const extra = parseJson(note.content, {});
  return { id: note.id, name: note.title, phone: note.course_name, points: 0, coupons: 0, wallet: 0, created_at: note.created_at, ...extra };
}

function registerMember(body = {}) {
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/\s+/g, '').trim();
  if (!name) throw new Error('请填写姓名');
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入正确的手机号');
  const existing = one('select * from notes where user_id = @user_id and course_name = @phone', { user_id: MEMBER_USER, phone });
  const previous = existing ? parseMember(existing) : {};
  const content = JSON.stringify({
    member_id: existing?.id || '',
    login_type: body.login_type === 'wechat' ? 'wechat' : 'phone',
    wx_nickname: String(body.wx_nickname || ''),
    points: previous.points || 0,
    coupons: previous.coupons || 0,
    wallet: previous.wallet || 0,
    avatar_url: previous.avatar_url || '',
  });
  const note = upsertNoteType(MEMBER_USER, name, content, phone, existing?.id);
  return parseMember(note);
}

function registrationWithCourse(row) {
  const course = row.course_id ? cleanCourse(one('select * from courses where id = @id', { id: row.course_id })) : null;
  const option = row.course_option_id ? cleanOption(one('select * from course_options where id = @id', { id: row.course_option_id })) : null;
  return { ...row, courses: course, course_options: option };
}

function listCourseOptions(courseId) {
  return all('select * from course_options where course_id = @course_id order by created_at asc', { course_id: courseId }).map(cleanOption);
}

function getCourseDetail(courseId) {
  const course = cleanCourse(one('select * from courses where id = @id', { id: courseId }));
  if (!course) return null;
  const options = listCourseOptions(course.id);
  const notes = all('select * from notes order by created_at desc')
    .map(parseLearningNote)
    .filter((note) => note.featured && note.course_id === course.id);
  return { course, options, featured_notes: notes, media: courseImages(course.image_url) };
}

function listManagedLearningNotes() {
  return all('select * from notes order by created_at desc')
    .filter((note) => ![MEMBER_USER, CAT_LINK_USER, MARKET_ITEM_USER, CATEGORY_USER, WECHAT_NEWS_USER, KNOWLEDGE_USER].includes(note.user_id))
    .filter((note) => !String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX))
    .map(parseLearningNote);
}

function updateLearningNoteMeta(noteId, meta = {}) {
  const note = one('select * from notes where id = @id', { id: String(noteId || '') });
  if (!note) throw new Error('笔记不存在');
  const parsed = parseLearningNote(note);
  const next = {
    text: parsed.text,
    images: parsed.images,
    videos: parsed.videos,
    visibility: meta.visibility === 'public' ? 'public' : 'private',
    featured: Boolean(meta.featured),
    course_id: String(meta.course_id || ''),
  };
  run('update notes set content = @content where id = @id', { id: note.id, content: serializeLearningNote(next) });
  return parseLearningNote(one('select * from notes where id = @id', { id: note.id }));
}

function relevantItems(items, prompt, max = 5) {
  const words = String(prompt || '')
    .toLowerCase()
    .split(/[^\u4e00-\u9fa5a-z0-9]+/i)
    .filter((word) => word.length >= 2);
  return items
    .map((item) => {
      const text = `${item.title || ''} ${item.name || ''} ${item.summary || ''} ${item.content || ''} ${item.description || ''}`.toLowerCase();
      const score = words.reduce((total, word) => total + (text.includes(word) ? 2 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((entry) => entry.item);
}

function buildQwenContext(prompt) {
  const courses = all('select * from courses order by created_at desc limit 80').map((course) => ({
    ...cleanCourse(course),
    options: listCourseOptions(course.id),
  }));
  const news = all('select * from notes where user_id = @user_id order by created_at desc limit 80', { user_id: WECHAT_NEWS_USER }).map(noteToWechatNews);
  const knowledge = all('select * from notes where user_id = @user_id order by created_at desc limit 80', { user_id: KNOWLEDGE_USER }).map(noteToKnowledgeItem);
  const matchedCourses = relevantItems(courses, prompt, 5);
  const matchedNews = relevantItems(news, prompt, 5);
  const matchedKnowledge = relevantItems(knowledge, prompt, 5);

  return {
    matchedCount: matchedCourses.length + matchedNews.length + matchedKnowledge.length,
    text: [
      '以下资料来自古吴轩章园后台数据库，只能基于这些资料确认活动、价格、时间、名额、报名、地点等信息。',
      '【课程资料】',
      matchedCourses.map((course) => `标题：${course.title}\n分类：${course.category}\n价格：${course.price}\n时间：${course.date_info}\n地点：${course.location}\n介绍：${course.description}\n跳转链接：${course.registration_url || '无'}\n班次：${course.options.map((option) => `${option.name}/${option.date_info}/¥${option.price}/名额${option.quota}/${option.status}`).join('；') || '暂无班次'}`).join('\n\n') || '暂无匹配课程。',
      '【公众号资料】',
      matchedNews.map((item) => `标题：${item.title}\n日期：${item.publishedAt || item.created_at || ''}\n来源：${item.sourceUrl || '古吴轩公众号'}\n摘要：${item.summary}\n正文：${item.content}`).join('\n\n') || '暂无匹配公众号资料。',
      '【后台资料库】',
      matchedKnowledge.map((item) => `标题：${item.title}\n来源：${item.source}${item.sourceUrl ? ` / ${item.sourceUrl}` : ''}\n内容：${item.content}`).join('\n\n') || '暂无匹配后台资料。',
    ].join('\n\n'),
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-8)
    .map((item) => ({
      role: item?.role === 'model' || item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || item?.text || item?.parts?.map((part) => part?.text || '').join('\n') || '').trim(),
    }))
    .filter((item) => item.content);
}

function buildTimeContext(body = {}) {
  const serverNow = new Date();
  const clientTime = String(body.client_time_text || body.client_time || '').trim();
  const clientTimezone = String(body.client_timezone || '').trim();
  const chinaTime = serverNow.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    weekday: 'long',
  });

  return [
    '当前时间信息：',
    clientTime ? `用户设备时间：${clientTime}${clientTimezone ? `（${clientTimezone}）` : ''}` : '',
    `服务器北京时间：${chinaTime}（Asia/Shanghai）`,
    '如果用户询问现在时间、今天日期、星期几或相对时间，请直接依据以上时间回答，不要说无法获取实时信息。',
  ].filter(Boolean).join('\n');
}

app.get('/api/courses', (_req, res) => {
  ok(res, { courses: all('select * from courses order by created_at desc').map(cleanCourse) });
});

app.get('/api/courses/:id', (req, res) => {
  const detail = getCourseDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: '课程不存在' });
  ok(res, detail);
});

app.post('/api/registrations', (req, res) => {
  try {
    const row = {
      id: id(),
      course_id: String(req.body.course_id || ''),
      course_option_id: String(req.body.course_option_id || ''),
      user_id: String(req.body.user_id || ''),
      user_name: String(req.body.user_name || ''),
      user_phone: String(req.body.user_phone || ''),
      status: 'pending',
      created_at: now(),
    };
    if (!row.user_name || !row.user_phone) throw new Error('缺少报名信息');
    run(
      `insert into registrations (id,course_id,course_option_id,user_id,user_name,user_phone,status,created_at)
       values (@id,@course_id,@course_option_id,@user_id,@user_name,@user_phone,@status,@created_at)`,
      row
    );
    ok(res, { registration: row });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/member-data', (req, res) => {
  try {
    const userId = String(req.body.user_id || '');
    if (!userId) throw new Error('缺少会员 ID');
    const notes = all('select * from notes where user_id = @user_id order by created_at desc', { user_id: userId }).map(parseLearningNote);
    const registrations = all('select * from registrations where user_id = @user_id order by created_at desc', { user_id: userId }).map(registrationWithCourse);
    const favorites = all('select * from favorites where user_id = @user_id order by created_at desc', { user_id: userId }).map((fav) => ({ ...fav, courses: fav.course_id ? cleanCourse(one('select * from courses where id = @id', { id: fav.course_id })) : null }));
    const market_favorites = notes.filter((note) => String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX));
    ok(res, { notes, registrations, favorites, market_favorites });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const content = serializeLearningNote({
      text: req.body.text || req.body.content || '',
      images: req.body.images || [],
      videos: req.body.videos || [],
      visibility: 'private',
      featured: false,
      course_id: req.body.course_id || '',
    });
    const row = upsertNoteType(String(req.body.user_id || ''), String(req.body.title || ''), content, String(req.body.course_name || ''), req.body.id);
    ok(res, { note: parseLearningNote(row) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/market-favorites', (req, res) => {
  try {
    const action = req.body.action || 'list';
    const userId = String(req.body.user_id || '');
    if (!userId) throw new Error('缺少会员 ID');
    if (action === 'list') {
      const rows = all(`select course_name from notes where user_id = @user_id and course_name like '${MARKET_FAVORITE_PREFIX}%'`, { user_id: userId });
      return ok(res, { ids: rows.map((row) => String(row.course_name).replace(MARKET_FAVORITE_PREFIX, '')) });
    }
    const item = req.body.item || {};
    const itemId = String(item.id || '');
    if (!itemId) throw new Error('缺少收藏内容 ID');
    if (action === 'delete') {
      run('delete from notes where user_id = @user_id and course_name = @course_name', { user_id: userId, course_name: `${MARKET_FAVORITE_PREFIX}${itemId}` });
      return ok(res, { ok: true });
    }
    upsertNoteType(
      userId,
      `雅集收藏：${item.name || ''}`,
      JSON.stringify({ type: 'market_favorite', item_id: itemId, name: item.name, description: item.description, price: item.price, image_url: item.image_url, image_urls: item.image_urls || [], tag: item.tag || '' }),
      `${MARKET_FAVORITE_PREFIX}${itemId}`
    );
    ok(res, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/.netlify/functions/member-manager', (req, res) => {
  try {
    if ((req.body.action || 'register') === 'uploadNoteImage') return ok(res, saveBase64File(req.body.image, 'notes'));
    ok(res, { member: registerMember(req.body) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/.netlify/functions/content-manager', (req, res) => {
  try {
    const action = req.body.action || 'list';
    if (action === 'listMarketItems') {
      return ok(res, { market_items: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: MARKET_ITEM_USER }).map(noteToMarketItem).filter((item) => item.status !== 'hidden'), generated_at: now() });
    }
    if (action === 'getCatLink') {
      const note = one('select * from notes where user_id = @user_id and course_name = @slug', { user_id: CAT_LINK_USER, slug: String(req.body.slug || '') });
      if (!note) return res.status(404).json({ error: '内容不存在或已删除' });
      return ok(res, { link: noteToCatLink(note) });
    }
    requirePassword(req.body);
    if (action === 'list') {
      return ok(res, {
        courses: all('select * from courses order by created_at desc').map(cleanCourse),
        course_options: all('select * from course_options order by created_at asc').map(cleanOption),
        learning_notes: listManagedLearningNotes(),
        cat_links: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: CAT_LINK_USER }).map(noteToCatLink),
        market_items: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: MARKET_ITEM_USER }).map(noteToMarketItem),
        categories: all('select * from notes where user_id = @user_id order by created_at asc', { user_id: CATEGORY_USER }).map((note) => ({ id: note.id, name: note.title, created_at: note.created_at })),
        wechat_news: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: WECHAT_NEWS_USER }).map(noteToWechatNews),
        knowledge_items: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: KNOWLEDGE_USER }).map(noteToKnowledgeItem),
        generated_at: now(),
      });
    }
    if (action === 'upsertCourse') return ok(res, { course: upsertCourse(req.body.course || {}) });
    if (action === 'deleteCourse') return ok(res, { ok: !!run('delete from courses where id = @id', { id: req.body.id }) });
    if (action === 'upsertCourseOption') return ok(res, { option: upsertCourseOption(req.body.option || {}) });
    if (action === 'deleteCourseOption') return ok(res, { ok: !!run('delete from course_options where id = @id', { id: req.body.id }) });
    if (action === 'updateLearningNoteMeta') return ok(res, { note: updateLearningNoteMeta(req.body.id, req.body.meta || {}) });
    if (action === 'uploadImage') return ok(res, saveBase64File(req.body.image, req.body.folder || 'courses'));
    if (action === 'upsertCatLink') return ok(res, { link: upsertCatLink(req.body.link || {}) });
    if (action === 'deleteCatLink') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: CAT_LINK_USER }) });
    if (action === 'upsertMarketItem') return ok(res, { item: upsertMarketItem(req.body.item || {}) });
    if (action === 'deleteMarketItem') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: MARKET_ITEM_USER }) });
    if (action === 'upsertCategory') return ok(res, { category: { id: upsertNoteType(CATEGORY_USER, String(req.body.category?.name || ''), JSON.stringify({ type: 'category' }), '课程/活动分类', req.body.category?.id).id, name: String(req.body.category?.name || '') } });
    if (action === 'deleteCategory') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: CATEGORY_USER }) });
    if (action === 'upsertWechatNews') return ok(res, { item: upsertWechatNews(req.body.item || {}) });
    if (action === 'deleteWechatNews') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: WECHAT_NEWS_USER }) });
    if (action === 'upsertKnowledgeItem') return ok(res, { item: upsertKnowledgeItem(req.body.item || {}) });
    if (action === 'deleteKnowledgeItem') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: KNOWLEDGE_USER }) });
    if (action === 'syncWechatNews') return ok(res, { ok: false, synced: 0, errors: ['阿里云 SQLite 版本暂未启用微信公众号 API 自动同步，可先使用链接或正文导入。'] });
    if (action === 'importWechatArticle') return ok(res, { item: upsertWechatNews({ title: req.body.url, sourceUrl: req.body.url, summary: '', content: '', origin: 'manual-url' }) });
    res.status(400).json({ error: '未知操作' });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/.netlify/functions/admin-data', (req, res) => {
  try {
    requirePassword(req.body);
    const notes = all('select * from notes order by created_at desc');
    ok(res, {
      members: notes.filter((note) => note.user_id === MEMBER_USER).map(parseMember),
      registrations: all('select * from registrations order by created_at desc').map(registrationWithCourse),
      courses: all('select * from courses order by created_at desc').map(cleanCourse),
      course_options: all('select * from course_options order by created_at asc').map(cleanOption),
      notes: listManagedLearningNotes(),
      favorites: all('select * from favorites order by created_at desc'),
      market_items: notes.filter((note) => note.user_id === MARKET_ITEM_USER).map(noteToMarketItem),
      wechat_news: notes.filter((note) => note.user_id === WECHAT_NEWS_USER).map(noteToWechatNews),
      knowledge_items: notes.filter((note) => note.user_id === KNOWLEDGE_USER).map(noteToKnowledgeItem),
      market_favorites: notes.filter((note) => String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX)).map((note) => ({ ...note, ...parseJson(note.content, {}) })),
      generated_at: now(),
      errors: [],
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/.netlify/functions/qwen', async (req, res) => {
  try {
    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: '未配置 QWEN_API_KEY 或 DASHSCOPE_API_KEY。' });
    const prompt = req.body.prompt || req.body.message || req.body.input || '';
    if (!String(prompt).trim()) return res.status(400).json({ error: '请输入问题。' });
    const context = buildQwenContext(prompt);
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || 'qwen-plus',
        messages: [
          {
            role: 'system',
            content:
              '你是古吴轩章园的智能咨询助手小吴。涉及最新活动、价格、时间、名额、报名、地点、老师、优惠等可变化信息时，只能依据后台资料回答。没有资料时必须明确说“未在古吴轩章园官方资料库中查到，需工作人员人工确认”，不要编造。使用简体中文，回答简短清楚。若引用资料，请在末尾写“来源：资料类型 / 日期或标题”。',
          },
          { role: 'system', content: context.text },
          { role: 'system', content: buildTimeContext(req.body) },
          ...normalizeHistory(req.body.history),
          { role: 'user', content: String(prompt) },
        ],
        temperature: 0.1,
        top_p: 0.7,
        max_tokens: 900,
        enable_search: false,
        enable_thinking: false,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || data?.message || 'Qwen 接口请求失败' });
    const fallback = '未在古吴轩章园官方资料库中查到明确资料，需工作人员人工确认。';
    const answer = data?.choices?.[0]?.message?.content || data?.output?.text || fallback;
    ok(res, { text: answer, answer, message: answer, reply: answer, official_context_count: context.matchedCount });
  } catch (error) {
    handleError(res, error);
  }
});

app.use(express.static(distDir));
app.get('*', (_req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(500).send('dist/index.html not found. Run npm run build first.');
  res.sendFile(indexPath);
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Guwuxuan Zhangyuan server running at http://127.0.0.1:${port}`);
});
