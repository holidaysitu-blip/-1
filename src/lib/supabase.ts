import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL || process.env.SUPABASE_URL || '';
let supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// 容错处理：如果用户不小心复制了带 /rest/v1/ 的 URL，自动修剪掉
if (supabaseUrl && supabaseUrl.includes('/rest/v1')) {
  supabaseUrl = supabaseUrl.split('/rest/v1')[0];
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('Supabase credentials missing or invalid. Check README_SUPABASE.md for setup instructions.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

/**
 * SQL for Supabase Table Creation:
 * 
 * -- 1. Courses Table
 * create table courses (
 *   id uuid default gen_random_uuid() primary key,
 *   title text not null,
 *   description text,
 *   price numeric,
 *   instructor text,
 *   category text,
 *   image_url text,
 *   date_info text,
 *   location text,
 *   tag text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 2. Registrations Table
 * create table registrations (
 *   id uuid default gen_random_uuid() primary key,
 *   course_id uuid references courses(id),
 *   user_id text,
 *   user_name text not null,
 *   user_phone text not null,
 *   status text default 'pending',
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 3. Notes Table
 * create table notes (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id text not null,
 *   title text not null,
 *   content text not null,
 *   course_name text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 4. Album Table
 * create table album (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id text not null,
 *   image_url text not null,
 *   caption text,
 *   course_name text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 5. Favorites Table
 * create table favorites (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id text not null,
 *   course_id uuid references courses(id),
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 */
