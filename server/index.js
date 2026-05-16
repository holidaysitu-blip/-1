import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { all, db, id, initDb, now, one, parseJson, run, saveBase64File } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'uploads');
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.CONTENT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'guwuxuanyexiao';
const siteUrl = process.env.APP_URL || `http://47.116.35.158`;

const CAT_LINK_USER = 'xunmao-link';
const MARKET_ITEM_USER = 'market-item';
const CATEGORY_USER = 'content-category';
const MEMBER_USER = 'member-profile';
const WECHAT_NEWS_USER = 'wechat-official-news';
const MARKET_FAVORITE_PREFIX = 'market-favorite:';

initDb();

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

function requirePassword(body) {
  if (body?.password !== adminPassword) {
    const error = new Error('密码错误');
    error.statusCode = 401;
    throw error;
  }
}

function ok(res, data = {}) {
  res.json(data);
}

function handleError(res, error) {
  res.status(error.statusCode || 500).json({ error: error instanceof Error ? error.message : '服务器错误' });
}

function courseRow(input = {}) {
  const payload = {
    id: input.id || id(),
    title: String(input.title || '').trim(),
    description: String(input.description || '').trim(),
    price: Number(input.price || 0),
    instructor: String(input.instructor || '').trim(),
    category: String(input.category || '').trim(),
    image_url: String(input.image_url || '').trim(),
    date_info: String(input.date_info || '').trim(),
    location: String(input.location || '').trim(),
    tag: String(input.tag || '').trim() || null,
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
    `insert into courses (id,title,description,price,instructor,category,image_url,date_info,location,tag,created_at)
     values (@id,@title,@description,@price,@instructor,@category,@image_url,@date_info,@location,@tag,@created_at)
     on conflict(id) do update set title=excluded.title, description=excluded.description, price=excluded.price,
       instructor=excluded.instructor, category=excluded.category, image_url=excluded.image_url,
       date_info=excluded.date_info, location=excluded.location, tag=excluded.tag`,
    row
  );
  return one('select * from courses where id = @id', { id: row.id });
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
  let imageUrls = [];
  try {
    const parsed = JSON.parse(String(item.image_url || ''));
    if (Array.isArray(parsed)) imageUrls = parsed.filter(Boolean);
  } catch {
    imageUrls = String(item.image_url || '').trim() ? [String(item.image_url || '').trim()] : [];
  }
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
  const content = JSON.stringify({
    member_id: existing?.id || '',
    login_type: body.login_type === 'wechat' ? 'wechat' : 'phone',
    wx_nickname: String(body.wx_nickname || ''),
    points: existing ? parseMember(existing).points : 0,
    coupons: existing ? parseMember(existing).coupons : 0,
    wallet: existing ? parseMember(existing).wallet : 0,
    avatar_url: existing ? parseMember(existing).avatar_url || '' : '',
  });
  const note = upsertNoteType(MEMBER_USER, name, content, phone, existing?.id);
  return parseMember(note);
}

function registrationWithCourse(row) {
  const course = row.course_id ? one('select * from courses where id = @id', { id: row.course_id }) : null;
  return { ...row, courses: course };
}

app.get('/api/courses', (_req, res) => {
  ok(res, { courses: all('select * from courses order by created_at desc') });
});

app.post('/api/registrations', (req, res) => {
  try {
    const row = {
      id: id(),
      course_id: String(req.body.course_id || ''),
      user_id: String(req.body.user_id || ''),
      user_name: String(req.body.user_name || ''),
      user_phone: String(req.body.user_phone || ''),
      status: 'pending',
      created_at: now(),
    };
    if (!row.user_name || !row.user_phone) throw new Error('缺少报名信息');
    run(
      `insert into registrations (id,course_id,user_id,user_name,user_phone,status,created_at)
       values (@id,@course_id,@user_id,@user_name,@user_phone,@status,@created_at)`,
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
    const notes = all('select * from notes where user_id = @user_id order by created_at desc', { user_id: userId });
    const registrations = all('select * from registrations where user_id = @user_id order by created_at desc', { user_id: userId }).map(registrationWithCourse);
    const favorites = all('select * from favorites where user_id = @user_id order by created_at desc', { user_id: userId }).map((fav) => ({ ...fav, courses: fav.course_id ? one('select * from courses where id = @id', { id: fav.course_id }) : null }));
    const market_favorites = notes.filter((note) => String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX));
    ok(res, { notes, registrations, favorites, market_favorites });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const row = upsertNoteType(String(req.body.user_id || ''), String(req.body.title || ''), String(req.body.content || ''), String(req.body.course_name || ''), req.body.id);
    ok(res, { note: row });
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

app.post('/.netlify/functions/content-manager', async (req, res) => {
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
        courses: all('select * from courses order by created_at desc'),
        cat_links: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: CAT_LINK_USER }).map(noteToCatLink),
        market_items: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: MARKET_ITEM_USER }).map(noteToMarketItem),
        categories: all('select * from notes where user_id = @user_id order by created_at asc', { user_id: CATEGORY_USER }).map((note) => ({ id: note.id, name: note.title, created_at: note.created_at })),
        wechat_news: all('select * from notes where user_id = @user_id order by created_at desc', { user_id: WECHAT_NEWS_USER }).map(noteToWechatNews),
        generated_at: now(),
      });
    }
    if (action === 'upsertCourse') return ok(res, { course: upsertCourse(req.body.course || {}) });
    if (action === 'deleteCourse') return ok(res, { ok: !!run('delete from courses where id = @id', { id: req.body.id }) });
    if (action === 'uploadImage') return ok(res, saveBase64File(req.body.image, req.body.folder || 'courses'));
    if (action === 'upsertCatLink') return ok(res, { link: upsertCatLink(req.body.link || {}) });
    if (action === 'deleteCatLink') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: CAT_LINK_USER }) });
    if (action === 'upsertMarketItem') return ok(res, { item: upsertMarketItem(req.body.item || {}) });
    if (action === 'deleteMarketItem') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: MARKET_ITEM_USER }) });
    if (action === 'upsertCategory') return ok(res, { category: { id: upsertNoteType(CATEGORY_USER, String(req.body.category?.name || ''), JSON.stringify({ type: 'category' }), '课程/活动分类', req.body.category?.id).id, name: String(req.body.category?.name || '') } });
    if (action === 'deleteCategory') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: CATEGORY_USER }) });
    if (action === 'upsertWechatNews') return ok(res, { item: upsertWechatNews(req.body.item || {}) });
    if (action === 'deleteWechatNews') return ok(res, { ok: !!run('delete from notes where id = @id and user_id = @user_id', { id: req.body.id, user_id: WECHAT_NEWS_USER }) });
    if (action === 'syncWechatNews') return ok(res, { ok: false, synced: 0, errors: ['阿里云 SQLite 版本暂未配置微信公众号 API 自动同步，可先手动新增或粘贴内容。'] });
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
      courses: all('select * from courses order by created_at desc'),
      notes: notes.filter((note) => ![MEMBER_USER, CAT_LINK_USER, MARKET_ITEM_USER, CATEGORY_USER, WECHAT_NEWS_USER].includes(note.user_id) && !String(note.course_name || '').startsWith(MARKET_FAVORITE_PREFIX)),
      favorites: all('select * from favorites order by created_at desc'),
      market_items: notes.filter((note) => note.user_id === MARKET_ITEM_USER).map(noteToMarketItem),
      wechat_news: notes.filter((note) => note.user_id === WECHAT_NEWS_USER).map(noteToWechatNews),
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
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || 'qwen-plus',
        messages: [
          { role: 'system', content: '你是古吴轩章园的智能咨询助手小吴。涉及最新活动、价格、名额、课程安排时不要编造；没有明确资料时说明需要工作人员确认。使用简体中文。' },
          { role: 'user', content: String(prompt) },
        ],
        temperature: 0.15,
        top_p: 0.7,
        max_tokens: 900,
        enable_search: true,
        enable_thinking: false,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || data?.message || 'Qwen 接口请求失败' });
    const answer = data?.choices?.[0]?.message?.content || data?.output?.text || '这个信息目前没有查到明确说明，建议联系工作人员确认。';
    ok(res, { text: answer, answer, message: answer, reply: answer });
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
