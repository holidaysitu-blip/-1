# Supabase Setup Guide for 古吴轩夜校

Follow these steps to connect your application to your Supabase project.

## 1. Get Your API Credentials

1.  Go to your [Supabase Dashboard](https://app.supabase.com/).
2.  Select your project (or create a new one).
3.  Navigate to **Settings** > **API**.
4.  Copy the **Project URL** and the **Anon Key** (public).

## 2. Set Up Environment Variables (Secrets)

In the AI Studio "Build" sidebar:
1. 点击 **Secrets** (或项目设置)。
2. Add the following keys:
   - `VITE_SUPABASE_URL`: (粘贴你的 Project URL)
   - `VITE_SUPABASE_ANON_KEY`: (粘贴你的 Anon Key)

## 3. Create Database Tables

Go to the **SQL Editor** in your Supabase dashboard and run the following script to create all necessary tables:

```sql
-- 1. 课程表 (Courses Table)
create table courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  price numeric,
  instructor text,
  category text,
  image_url text,
  date_info text,
  location text,
  tag text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 报名表 (Registrations Table)
create table registrations (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id),
  user_id text,
  user_name text not null,
  user_phone text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 笔记表 (Notes Table)
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null,
  content text not null,
  course_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. 收藏表 (Favorites Table)
create table favorites (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  course_id uuid references courses(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. 相册表 (Album Table)
create table album (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  image_url text not null,
  caption text,
  course_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 插入一些演示数据 (Optional: Seed Data)
insert into courses (title, description, price, instructor, category, image_url, date_info, location, tag)
values 
('中医经络调理实操', '溯源经典，结合现代人体工学。', 1280, '李老师', '中医养生', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc2069?q=80', '周六 14:00-16:00', '章园 · 听松阁', '特邀名师'),
('魏碑书法入门', '从《张猛龙碑》入手，体会北碑的雄强与古拙。', 880, '李文轩', '国学人文', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80', '周日 10:00-12:00', '章园 · 书香斋', null);
```

## 5. Netlify 部署关键设置 (IMPORTANT)

如果你把代码部署到了 Netlify，**必须**完成以下两步，否则小程序无法工作：

### A. 设置 Netlify 环境变量
在 Netlify 后台：**Site settings** > **Environment variables** > **Add a variable**，添加以下三个：
1. `VITE_SUPABASE_URL`: (你的 Supabase URL，不带 /rest/v1/)
2. `VITE_SUPABASE_ANON_KEY`: (你的 Supabase Anon Key)
3. `VITE_GEMINI_API_KEY`: (把你在聊天框给我的那个 API Key 填在这里)

### B. 解决 CORS “Load failed” 错误 (关键！)
Supabase 默认会拦截来自未知域名的请求。
1. 进入你的 [Supabase Dashboard](https://app.supabase.com/)。
2. 转到 **Authentication** > **Settings** (或 **API**)。
3. 在 **Site URL** 或 **Additional Redirect URLs** / **Allowed Domains** 中，添加你的 Netlify 网址：
   `https://cheerful-elf-832745.netlify.app`
4. 确保 **CORS** 策略允许你的域名。

---

## 6. 小吴 (AI 助手) 无法对话？
如果点击小吴显示“API_KEY_INVALID”或“网络错误”：
- 确认 `VITE_GEMINI_API_KEY` 已在 Netlify 或 AI Studio 的 Secrets 中正确配置。
- 确认你的 API Key 拥有访问 `gemini-2.0-flash` 模型的权限。
