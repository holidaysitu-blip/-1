import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfxssdnqxtfrpqelbndm.supabase.co';
const MEMBER_USER = 'member-profile';
const IMAGE_BUCKET = process.env.ADMIN_IMAGE_BUCKET || 'night-school-images';

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

function parseMember(note) {
  let extra = {};
  try {
    extra = JSON.parse(note.content || '{}');
  } catch {
    extra = {};
  }
  return {
    id: note.id,
    name: note.title,
    phone: note.course_name,
    points: 0,
    coupons: 0,
    wallet: 0,
    created_at: note.created_at,
    ...extra,
  };
}

function sanitizePhone(phone = '') {
  return String(phone).replace(/\s+/g, '').trim();
}

async function registerMember(supabase, body) {
  const name = String(body.name || '').trim();
  const phone = sanitizePhone(body.phone);
  const loginType = body.login_type === 'wechat' ? 'wechat' : 'phone';

  if (!name) throw new Error('请填写姓名');
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入正确的手机号');

  const { data: existing } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', MEMBER_USER)
    .eq('course_name', phone)
    .maybeSingle();

  const content = JSON.stringify({
    member_id: existing?.id || '',
    login_type: loginType,
    wx_nickname: String(body.wx_nickname || '').trim(),
    points: 0,
    coupons: 0,
    wallet: 0,
  });

  if (existing?.id) {
    const { data, error } = await supabase
      .from('notes')
      .update({ title: name, content, course_name: phone })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new Error(`会员登录失败：${error.message}`);
    return parseMember(data);
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: MEMBER_USER, title: name, content, course_name: phone })
    .select('*')
    .single();
  if (error) throw new Error(`会员注册失败：${error.message}`);
  return parseMember(data);
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

async function uploadNoteImage(supabase, image = {}) {
  const contentType = String(image.contentType || 'image/jpeg');
  if (!contentType.startsWith('image/')) throw new Error('只能上传图片文件');

  const rawBase64 = String(image.base64 || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');
  if (!buffer.length) throw new Error('图片内容为空');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('图片不能超过 8MB');

  await ensureImageBucket(supabase);

  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const safeName =
    String(image.fileName || 'note-image')
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'note-image';
  const path = `notes/${Date.now()}-${safeName}.${extension}`;

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
    const action = body.action || 'register';
    const supabase = getSupabase();

    if (action === 'register') {
      return jsonResponse({ member: await registerMember(supabase, body) });
    }

    if (action === 'uploadNoteImage') {
      return jsonResponse(await uploadNoteImage(supabase, body.image));
    }

    return jsonResponse({ error: '未知操作' }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : '会员操作失败' }, 500);
  }
}
