import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const rootDir = process.cwd();
const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'uploads');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'app.sqlite'));
db.pragma('journal_mode = WAL');

export function now() {
  return new Date().toISOString();
}

export function id() {
  return randomUUID();
}

export function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

export function initDb() {
  db.exec(`
    create table if not exists courses (
      id text primary key,
      title text not null,
      description text,
      price real default 0,
      instructor text,
      category text,
      image_url text,
      date_info text,
      location text,
      tag text,
      created_at text not null
    );

    create table if not exists registrations (
      id text primary key,
      course_id text,
      user_id text,
      user_name text not null,
      user_phone text not null,
      status text default 'pending',
      created_at text not null
    );

    create table if not exists notes (
      id text primary key,
      user_id text not null,
      title text not null,
      content text not null,
      course_name text,
      created_at text not null
    );

    create table if not exists favorites (
      id text primary key,
      user_id text not null,
      course_id text,
      created_at text not null
    );

    create table if not exists app_content (
      key text primary key,
      value text not null,
      updated_at text not null
    );
  `);
}

export function one(sql, params = {}) {
  return db.prepare(sql).get(params);
}

export function all(sql, params = {}) {
  return db.prepare(sql).all(params);
}

export function run(sql, params = {}) {
  return db.prepare(sql).run(params);
}

export function saveBase64File(image = {}, folder = 'uploads') {
  const contentType = String(image.contentType || 'image/jpeg');
  if (!contentType.startsWith('image/')) throw new Error('只能上传图片文件');

  const rawBase64 = String(image.base64 || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');
  if (!buffer.length) throw new Error('图片内容为空');
  if (buffer.length > 12 * 1024 * 1024) throw new Error('图片不能超过 12MB');

  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const safeName =
    String(image.fileName || 'image')
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
  const safeFolder = String(folder || 'uploads').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const dir = path.join(uploadDir, safeFolder);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-${safeName}.${extension}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  return { image_url: `/uploads/${safeFolder}/${fileName}`, path: filePath };
}
