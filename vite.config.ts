import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

dotenv.config({ path: '.env.local' });
dotenv.config();

const textFixes: Array<[string, string]> = [
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

function cleanCourse<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    title: cleanText(String(row.title || '')),
    description: cleanText(String(row.description || '')),
    instructor: cleanText(String(row.instructor || '')),
    category: cleanText(String(row.category || '')),
    date_info: cleanText(String(row.date_info || '')),
    location: cleanText(String(row.location || '')),
    tag: cleanText(String(row.tag || '')),
  };
}

function cleanOption<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    name: cleanText(String(row.name || '')),
    date_info: cleanText(String(row.date_info || '')),
    instructor: cleanText(String(row.instructor || '')),
  };
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readJson(req: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-netlify-functions',
        configureServer(server) {
          server.middlewares.use('/api', async (req, res) => {
            try {
              const { all, id, initDb, now, one, run } = await import('./server/db.js');
              initDb();

              const requestUrl = new URL(req.url || '/', 'http://localhost');
              const parts = requestUrl.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
              const method = req.method || 'GET';

              if (method === 'GET' && parts[0] === 'courses' && parts.length === 1) {
                return sendJson(res, 200, { courses: all('select * from courses order by created_at desc').map(cleanCourse) });
              }

              if (method === 'GET' && parts[0] === 'courses' && parts[1]) {
                const course = cleanCourse(one('select * from courses where id = @id', { id: parts[1] }) || {});
                if (!course.id) return sendJson(res, 404, { error: '课程不存在' });
                const options = all('select * from course_options where course_id = @course_id order by created_at asc', { course_id: parts[1] }).map(cleanOption);
                return sendJson(res, 200, { course, options, featured_notes: [], media: [] });
              }

              if (method === 'POST' && parts[0] === 'registrations') {
                const body = await readJson(req);
                const row = {
                  id: id(),
                  course_id: String(body.course_id || ''),
                  course_option_id: String(body.course_option_id || ''),
                  user_id: String(body.user_id || ''),
                  user_name: String(body.user_name || ''),
                  user_phone: String(body.user_phone || ''),
                  status: 'pending',
                  created_at: now(),
                };
                if (!row.user_name || !row.user_phone) return sendJson(res, 400, { error: '缺少报名信息' });
                run(
                  `insert into registrations (id,course_id,course_option_id,user_id,user_name,user_phone,status,created_at)
                   values (@id,@course_id,@course_option_id,@user_id,@user_name,@user_phone,@status,@created_at)`,
                  row
                );
                return sendJson(res, 200, { registration: row });
              }

              return sendJson(res, 404, { error: '接口不存在' });
            } catch (error) {
              return sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
            }
          });

          server.middlewares.use('/.netlify/functions', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            const functionName = req.url?.replace(/^\/+/, '').split('?')[0];
            if (!functionName || !['qwen', 'admin-data', 'content-manager', 'member-manager'].includes(functionName)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Function Not Found' }));
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { handler } = await import(`./netlify/functions/${functionName}.js`);
                const result = await handler({ body, httpMethod: 'POST', headers: req.headers });
                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body || '{}');
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
              }
            });
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
