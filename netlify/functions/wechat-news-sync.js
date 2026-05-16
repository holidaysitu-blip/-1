import { getServiceSupabase, syncWechatNewsFromApi } from './_shared/wechat-news.js';

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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  try {
    const supabase = getServiceSupabase();
    const result = await syncWechatNewsFromApi(supabase, { count: 20 });
    return jsonResponse({ ...result, generated_at: new Date().toISOString() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : '公众号同步失败' }, 500);
  }
}

export const config = {
  schedule: '@daily',
};
