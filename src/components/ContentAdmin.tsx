import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Clipboard, Code2, Edit3, ImagePlus, Link as LinkIcon, Plus, RefreshCw, Save, ShieldCheck, Trash2, X } from 'lucide-react';

type CourseRow = {
  id?: string;
  title: string;
  description: string;
  price: number;
  instructor: string;
  category: string;
  image_url: string;
  date_info: string;
  location: string;
  tag?: string | null;
};

type CatContentRow = {
  id?: string;
  title: string;
  content_type: 'url' | 'html';
  target_url: string;
  html_code: string;
  slug?: string;
  qr_url?: string;
  created_at?: string;
};

type MarketItemRow = {
  id?: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  tag?: string;
  status?: 'published' | 'hidden';
  created_at?: string;
};

type CategoryRow = {
  id?: string;
  name: string;
  created_at?: string | null;
};

type WechatNewsRow = {
  id?: string;
  title: string;
  publishedAt: string;
  sourceUrl: string;
  summary: string;
  content: string;
  origin?: string;
  syncedAt?: string;
  created_at?: string;
};

type ContentData = {
  courses: CourseRow[];
  cat_links: CatContentRow[];
  market_items: MarketItemRow[];
  categories: CategoryRow[];
  wechat_news: WechatNewsRow[];
  generated_at: string;
};

const siteUrl = 'https://cheerly-elf-832745.netlify.app';
const categoryOptions = ['中医养生', '国学人文', '美学雅活', '茶道香道', '琴棋书画', '手作体验', '活动体验'];

function emptyCourse(): CourseRow {
  const type = new URLSearchParams(window.location.search).get('type');
  return {
    title: '',
    description: '',
    price: 0,
    instructor: '',
    category: type === 'event' ? '活动体验' : '中医养生',
    image_url: '',
    date_info: '',
    location: '古吴轩章园 · 夜校空间',
    tag: type === 'event' ? '活动' : '',
  };
}

const emptyCatContent: CatContentRow = {
  title: '',
  content_type: 'html',
  target_url: '',
  html_code: '',
};

const emptyMarketItem: MarketItemRow = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  tag: '',
  status: 'published',
};

const emptyCategory: CategoryRow = { name: '' };

const emptyWechatNews: WechatNewsRow = {
  title: '',
  publishedAt: '',
  sourceUrl: '',
  summary: '',
  content: '',
  origin: 'manual',
};

function qrImage(url = '') {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url)}`;
}

function courseImages(value = '') {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    // Existing rows store a single URL as plain text.
  }
  return [value].filter(Boolean);
}

function serializeImages(images: string[]) {
  const clean = images.map((item) => item.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] || '';
  return JSON.stringify(clean);
}

function firstCourseImage(value = '') {
  return courseImages(value)[0] || '';
}

function firstMarketImage(value = '') {
  return courseImages(value)[0] || '';
}

export default function ContentAdmin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('zy-content-password') || '');
  const [ok, setOk] = useState(() => sessionStorage.getItem('zy-content-ok') === 'true');
  const [data, setData] = useState<ContentData | null>(null);
  const [courseDraft, setCourseDraft] = useState<CourseRow>(() => emptyCourse());
  const [catDraft, setCatDraft] = useState<CatContentRow>(emptyCatContent);
  const [marketDraft, setMarketDraft] = useState<MarketItemRow>(emptyMarketItem);
  const [categoryDraft, setCategoryDraft] = useState<CategoryRow>(emptyCategory);
  const [wechatDraft, setWechatDraft] = useState<WechatNewsRow>(emptyWechatNews);
  const [wechatImportUrl, setWechatImportUrl] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingWechatId, setEditingWechatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [marketUploading, setMarketUploading] = useState(false);
  const [syncingWechat, setSyncingWechat] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const stats = useMemo(
    () => [
      { label: '课程/活动', value: data?.courses.length || 0 },
      { label: '寻猫记内容', value: data?.cat_links.length || 0 },
      { label: '雅集内容', value: data?.market_items.length || 0 },
      { label: '公众号消息', value: data?.wechat_news.length || 0 },
    ],
    [data]
  );

  async function contentRequest<T>(body: Record<string, unknown>): Promise<T> {
    const res = await fetch('/.netlify/functions/content-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...body }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || '内容后台操作失败');
    return payload;
  }

  async function loadData(nextPassword = password) {
    setLoading(true);
    setError('');
    try {
      const payload = await contentRequest<ContentData>({ action: 'list' });
      setData({
        ...payload,
        market_items: payload.market_items || [],
        categories: payload.categories || categoryOptions.map((name) => ({ id: name, name })),
        wechat_news: payload.wechat_news || [],
      });
      setOk(true);
      sessionStorage.setItem('zy-content-ok', 'true');
      sessionStorage.setItem('zy-content-password', nextPassword);
    } catch (err) {
      setOk(false);
      sessionStorage.removeItem('zy-content-ok');
      setError(err instanceof Error ? err.message : '内容后台加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ok && password) loadData();
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await loadData(password);
  }

  async function handleSaveCourse(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ course: CourseRow }>({ action: 'upsertCourse', course: { ...courseDraft, id: editingCourseId || courseDraft.id } });
      setMessage(editingCourseId ? '课程/活动已更新' : '课程/活动已新增');
      setCourseDraft(emptyCourse());
      setEditingCourseId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCatContent(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ link: CatContentRow }>({ action: 'upsertCatLink', link: { ...catDraft, id: editingCatId || catDraft.id } });
      setMessage('寻猫记内容已保存，二维码可直接扫码使用');
      setCatDraft(emptyCatContent);
      setEditingCatId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '寻猫记内容保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMarketItem(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ item: MarketItemRow }>({ action: 'upsertMarketItem', item: { ...marketDraft, id: editingMarketId || marketDraft.id } });
      setMessage(editingMarketId ? '雅集内容已更新，前台会自动读取' : '雅集内容已新增，前台会自动读取');
      setMarketDraft(emptyMarketItem);
      setEditingMarketId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '雅集内容保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ category: CategoryRow }>({ action: 'upsertCategory', category: { ...categoryDraft, id: editingCategoryId || categoryDraft.id } });
      setMessage(editingCategoryId ? '分类已更新' : '分类已新增');
      setCategoryDraft(emptyCategory);
      setEditingCategoryId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '分类保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWechatNews(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ item: WechatNewsRow }>({ action: 'upsertWechatNews', item: { ...wechatDraft, id: editingWechatId || wechatDraft.id } });
      setMessage(editingWechatId ? '公众号消息已更新，小吴会优先引用这条官方资料' : '公众号消息已新增，小吴会优先引用这条官方资料');
      setWechatDraft(emptyWechatNews);
      setEditingWechatId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号消息保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleImportWechatArticle() {
    if (!wechatImportUrl.trim()) return;
    setSyncingWechat(true);
    setError('');
    setMessage('');
    try {
      await contentRequest<{ item: WechatNewsRow }>({ action: 'importWechatArticle', url: wechatImportUrl.trim() });
      setWechatImportUrl('');
      setMessage('公众号链接已导入资料库，小吴会优先引用');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号链接导入失败');
    } finally {
      setSyncingWechat(false);
    }
  }

  async function handleSyncWechatNews() {
    setSyncingWechat(true);
    setError('');
    setMessage('');
    try {
      const result = await contentRequest<{ ok: boolean; synced: number; errors?: string[] }>({ action: 'syncWechatNews', count: 20 });
      setMessage(result.ok ? '公众号 API 同步完成，已更新 ' + result.synced + ' 条消息' : '公众号 API 暂未同步到内容：' + (result.errors || []).join('；'));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号 API 同步失败，请检查 WECHAT_APP_ID / WECHAT_APP_SECRET 或改用链接导入');
    } finally {
      setSyncingWechat(false);
    }
  }

  async function handleDeleteWechatNews(item: WechatNewsRow) {
    if (!item.id || !window.confirm('确定删除“' + item.title + '”吗？删除后小吴不会再引用这条资料。')) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'deleteWechatNews', id: item.id });
      setMessage('公众号消息已删除');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号消息删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCourse(course: CourseRow) {
    if (!course.id || !window.confirm(`确定删除「${course.title}」吗？`)) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'deleteCourse', id: course.id });
      setMessage('内容已删除');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCatContent(item: CatContentRow) {
    if (!item.id || !window.confirm(`确定删除「${item.title}」吗？删除后原二维码会失效。`)) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'deleteCatLink', id: item.id });
      setMessage('寻猫记内容已删除');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMarketItem(item: MarketItemRow) {
    if (!item.id || !window.confirm(`确定删除「${item.name}」吗？`)) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'deleteMarketItem', id: item.id });
      setMessage('雅集内容已删除');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(item: CategoryRow) {
    if (!item.id || !window.confirm(`确定删除分类「${item.name}」吗？已发布内容不会被删除。`)) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'deleteCategory', id: item.id });
      setMessage('分类已删除');
      if (courseDraft.category === item.name) setCourseDraft((current) => ({ ...current, category: (data?.categories || [])[0]?.name || '中医养生' }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除分类失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const payload = await contentRequest<{ image_url: string }>({
          action: 'uploadImage',
          folder: 'courses',
          image: { fileName: file.name, contentType: file.type, base64 },
        });
        uploaded.push(payload.image_url);
      }
      setCourseDraft((current) => ({
        ...current,
        image_url: serializeImages([...courseImages(current.image_url), ...uploaded]),
      }));
      setMessage(`已上传 ${uploaded.length} 张图片，记得点击保存内容`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleMarketImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;
    setMarketUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const payload = await contentRequest<{ image_url: string }>({
          action: 'uploadImage',
          folder: 'market',
          image: { fileName: file.name, contentType: file.type, base64 },
        });
        uploaded.push(payload.image_url);
      }
      setMarketDraft((current) => ({
        ...current,
        image_url: serializeImages([...courseImages(current.image_url), ...uploaded]),
      }));
      setMessage(`已上传 ${uploaded.length} 张雅集图片，记得点击保存雅集内容`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '雅集图片上传失败');
    } finally {
      setMarketUploading(false);
      event.target.value = '';
    }
  }

  function editCourse(course: CourseRow) {
    setEditingCourseId(course.id || null);
    setCourseDraft({ ...emptyCourse(), ...course, tag: course.tag || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editCatContent(item: CatContentRow) {
    setEditingCatId(item.id || null);
    setCatDraft({ ...emptyCatContent, ...item });
    document.getElementById('cat-content-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editMarketItem(item: MarketItemRow) {
    setEditingMarketId(item.id || null);
    setMarketDraft({ ...emptyMarketItem, ...item, status: item.status || 'published' });
    document.getElementById('market-content-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editWechatNews(item: WechatNewsRow) {
    setEditingWechatId(item.id || null);
    setWechatDraft({ ...emptyWechatNews, ...item });
    document.getElementById('wechat-news-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editCategory(item: CategoryRow) {
    setEditingCategoryId(item.id || null);
    setCategoryDraft({ ...item });
    document.getElementById('category-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removeCourseImage(index: number) {
    setCourseDraft((current) => ({
      ...current,
      image_url: serializeImages(courseImages(current.image_url).filter((_, itemIndex) => itemIndex !== index)),
    }));
  }

  function removeMarketImage(index: number) {
    setMarketDraft((current) => ({
      ...current,
      image_url: serializeImages(courseImages(current.image_url).filter((_, itemIndex) => itemIndex !== index)),
    }));
  }

  async function copyText(text = '') {
    await navigator.clipboard.writeText(text);
    setMessage('链接已复制');
  }

  const managedCategories = data?.categories?.length ? data.categories : categoryOptions.map((name) => ({ id: name, name }));

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper-texture">
        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-xl p-7 w-full max-w-sm border border-primary/10">
          <div className="flex items-center gap-3 mb-5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">夜校内容更新后台</h1>
          </div>
          <input
            type="password"
            placeholder="请输入内容后台密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-primary/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-primary"
          />
          {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-sm mb-4">{error}</div>}
          <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-60">
            {loading ? '进入中...' : '进入内容后台'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-paper-texture">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">夜校内容更新后台</h1>
            <p className="text-sm text-slate-500 mt-1">
              后台网址：<span className="font-mono">{siteUrl}/content-admin</span>
              {data?.generated_at ? ` · 最近刷新：${new Date(data.generated_at).toLocaleString('zh-CN')}` : ''}
            </p>
          </div>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </header>

        {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-4 text-sm">{error}</div>}
        {message && <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-4 text-sm">{message}</div>}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((item) => (
            <div key={item.label} className="bg-white border border-primary/10 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </section>

        <DataPanel title="公众号消息资料库">
          <div id="wechat-news-panel" className="space-y-5">
            <div className="grid lg:grid-cols-[1fr_280px] gap-5">
              <form onSubmit={handleSaveWechatNews} className="grid md:grid-cols-2 gap-4">
                <Field label="标题">
                  <input value={wechatDraft.title} onChange={(event) => setWechatDraft({ ...wechatDraft, title: event.target.value })} className="admin-input" placeholder="公众号文章标题" />
                </Field>
                <Field label="发布日期">
                  <input value={wechatDraft.publishedAt} onChange={(event) => setWechatDraft({ ...wechatDraft, publishedAt: event.target.value })} className="admin-input" placeholder="2026-05-16" />
                </Field>
                <Field label="来源链接" wide>
                  <input value={wechatDraft.sourceUrl} onChange={(event) => setWechatDraft({ ...wechatDraft, sourceUrl: event.target.value })} className="admin-input" placeholder="公众号文章链接，可为空" />
                </Field>
                <Field label="摘要" wide>
                  <textarea value={wechatDraft.summary} onChange={(event) => setWechatDraft({ ...wechatDraft, summary: event.target.value })} rows={3} className="admin-input resize-y" />
                </Field>
                <Field label="正文资料" wide>
                  <textarea value={wechatDraft.content} onChange={(event) => setWechatDraft({ ...wechatDraft, content: event.target.value })} rows={8} className="admin-input resize-y" />
                </Field>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : editingWechatId ? '更新公众号消息' : '新增公众号消息'}
                  </button>
                  {editingWechatId && (
                    <button type="button" onClick={() => { setEditingWechatId(null); setWechatDraft(emptyWechatNews); }} className="inline-flex items-center justify-center gap-2 bg-white border border-primary/10 text-slate-500 px-4 py-3 rounded-xl text-sm font-bold">
                      <X className="w-4 h-4" />
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
              <aside className="space-y-3">
                <div className="bg-slate-50 border border-primary/10 rounded-xl p-4 text-sm text-slate-500 leading-relaxed">
                  小吴会优先引用这里的公众号资料。没有查到官方资料时，才会联网补充并标注需要人工确认。
                </div>
                <button type="button" onClick={handleSyncWechatNews} disabled={syncingWechat} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                  <RefreshCw className={`w-4 h-4 ${syncingWechat ? 'animate-spin' : ''}`} />
                  {syncingWechat ? '同步中...' : '同步公众号 API'}
                </button>
                <div className="space-y-2">
                  <input value={wechatImportUrl} onChange={(event) => setWechatImportUrl(event.target.value)} className="admin-input" placeholder="粘贴公众号文章链接导入" />
                  <button type="button" onClick={handleImportWechatArticle} disabled={syncingWechat || !wechatImportUrl.trim()} className="w-full inline-flex items-center justify-center gap-2 bg-white border border-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                    <LinkIcon className="w-4 h-4" />
                    导入链接
                  </button>
                </div>
              </aside>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {(data?.wechat_news || []).map((item) => (
                <div key={item.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                  <h3 className="font-bold text-primary">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.publishedAt || '未标注日期'} / {item.origin || 'manual'}</p>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-3">{item.summary || item.content}</p>
                  {item.sourceUrl && <p className="text-xs text-slate-400 break-all mt-2">{item.sourceUrl}</p>}
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => editWechatNews(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                      <Edit3 className="w-3.5 h-3.5" />
                      编辑
                    </button>
                    <button onClick={() => handleDeleteWechatNews(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {data?.wechat_news.length === 0 && <Empty text="暂无公众号消息" />}
          </div>
        </DataPanel>

        <DataPanel title="课程 / 活动分类管理">
          <div id="category-panel" className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <Field label="分类名称">
                <input
                  value={categoryDraft.name}
                  onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })}
                  className="admin-input"
                  placeholder="例如：活动体验、茶会雅集、亲子课程"
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                  <Plus className="w-4 h-4" />
                  {saving ? '保存中...' : editingCategoryId ? '更新分类' : '新增分类'}
                </button>
                {editingCategoryId && (
                  <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryDraft(emptyCategory); }} className="inline-flex items-center justify-center gap-2 bg-white border border-primary/10 text-slate-500 px-4 py-3 rounded-xl text-sm font-bold">
                    <X className="w-4 h-4" />
                    取消编辑
                  </button>
                )}
              </div>
            </form>
            <div className="grid sm:grid-cols-2 gap-3">
              {managedCategories.map((category) => (
                <div key={category.id || category.name} className="border border-primary/10 rounded-xl bg-white p-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-primary">{category.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => editCategory(category)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                      <Edit3 className="w-3.5 h-3.5" />
                      编辑
                    </button>
                    <button onClick={() => handleDeleteCategory(category)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DataPanel>

        <DataPanel title="雅集内容管理">
          <div id="market-content-panel" className="grid lg:grid-cols-[1fr_280px] gap-5">
            <form onSubmit={handleSaveMarketItem} className="grid md:grid-cols-2 gap-4">
              <Field label="雅集名称">
                <input value={marketDraft.name} onChange={(event) => setMarketDraft({ ...marketDraft, name: event.target.value })} className="admin-input" />
              </Field>
              <Field label="价格">
                <input type="number" min="0" value={marketDraft.price} onChange={(event) => setMarketDraft({ ...marketDraft, price: Number(event.target.value) })} className="admin-input" />
              </Field>
              <Field label="标签">
                <input value={marketDraft.tag || ''} onChange={(event) => setMarketDraft({ ...marketDraft, tag: event.target.value })} className="admin-input" placeholder="如：园主推荐" />
              </Field>
              <Field label="显示状态">
                <select value={marketDraft.status || 'published'} onChange={(event) => setMarketDraft({ ...marketDraft, status: event.target.value as 'published' | 'hidden' })} className="admin-input">
                  <option value="published">前台显示</option>
                  <option value="hidden">暂不显示</option>
                </select>
              </Field>
              <Field label="图片地址" wide>
                <input value={marketDraft.image_url} onChange={(event) => setMarketDraft({ ...marketDraft, image_url: event.target.value })} className="admin-input" />
              </Field>
              <Field label="介绍内容" wide>
                <textarea value={marketDraft.description} onChange={(event) => setMarketDraft({ ...marketDraft, description: event.target.value })} rows={5} className="admin-input resize-none" />
              </Field>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button disabled={saving || marketUploading} className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : editingMarketId ? '更新雅集内容' : '新增雅集内容'}
                </button>
                {editingMarketId && (
                  <button type="button" onClick={() => { setEditingMarketId(null); setMarketDraft(emptyMarketItem); }} className="inline-flex items-center justify-center gap-2 bg-white border border-primary/10 text-slate-500 px-4 py-3 rounded-xl text-sm font-bold">
                    <X className="w-4 h-4" />
                    取消编辑
                  </button>
                )}
              </div>
            </form>
            <aside className="space-y-4">
              <div className="bg-slate-50 border border-primary/10 rounded-xl p-3">
                {courseImages(marketDraft.image_url).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {courseImages(marketDraft.image_url).map((image, index) => (
                      <div key={`${image}-${index}`} className="relative overflow-hidden rounded-lg border border-primary/10 bg-white">
                        <img src={image} alt={`${marketDraft.name || '雅集图片'} ${index + 1}`} className="w-full aspect-square object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMarketImage(index)}
                          className="absolute right-1 top-1 w-7 h-7 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow"
                          aria-label="删除雅集图片"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] flex items-center justify-center text-sm text-slate-400">暂无图片</div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 border border-primary/10 bg-white text-primary px-4 py-3 rounded-xl text-sm font-bold cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                {marketUploading ? '上传中...' : '上传/追加多张雅集图片'}
                <input type="file" accept="image/*" multiple onChange={handleMarketImageUpload} disabled={marketUploading} className="hidden" />
              </label>
            </aside>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {(data?.market_items || []).map((item) => (
              <div key={item.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                <div className="flex gap-4">
                  {firstMarketImage(item.image_url) && <img src={firstMarketImage(item.image_url)} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-slate-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-primary">{item.name}</h3>
                      <span className="text-accent font-bold whitespace-nowrap">¥ {item.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                    <p className="text-xs text-slate-400 mt-2">{item.tag || '无标签'} · {item.status === 'hidden' ? '暂不显示' : '前台显示'}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => editMarketItem(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                    <Edit3 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <button onClick={() => handleDeleteMarketItem(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
          {data?.market_items.length === 0 && <Empty text="暂无雅集内容" />}
        </DataPanel>

        <DataPanel title="寻猫记内容管理">
          <div id="cat-content-panel" className="grid lg:grid-cols-[1fr_320px] gap-5">
            <form onSubmit={handleSaveCatContent} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="内容名称">
                  <input value={catDraft.title} onChange={(event) => setCatDraft({ ...catDraft, title: event.target.value })} className="admin-input" placeholder="例如：第1站线索" />
                </Field>
                <Field label="内容类型">
                  <select value={catDraft.content_type} onChange={(event) => setCatDraft({ ...catDraft, content_type: event.target.value as 'url' | 'html' })} className="admin-input">
                    <option value="html">粘贴代码内容</option>
                    <option value="url">外部网址</option>
                  </select>
                </Field>
              </div>
              {catDraft.content_type === 'url' ? (
                <Field label="要展示的网址">
                  <input value={catDraft.target_url} onChange={(event) => setCatDraft({ ...catDraft, target_url: event.target.value })} className="admin-input" placeholder="https://..." />
                </Field>
              ) : (
                <Field label="HTML / H5 代码内容">
                  <textarea
                    value={catDraft.html_code}
                    onChange={(event) => setCatDraft({ ...catDraft, html_code: event.target.value })}
                    rows={12}
                    className="admin-input resize-y font-mono"
                    placeholder="<html>...</html> 或一段可直接展示的 HTML"
                  />
                </Field>
              )}
              <div className="flex flex-wrap gap-3">
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                  {catDraft.content_type === 'html' ? <Code2 className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  {saving ? '保存中...' : editingCatId ? '更新并生成二维码' : '保存并生成二维码'}
                </button>
                {editingCatId && (
                  <button type="button" onClick={() => { setEditingCatId(null); setCatDraft(emptyCatContent); }} className="inline-flex items-center justify-center gap-2 bg-white border border-primary/10 text-slate-500 px-4 py-3 rounded-xl text-sm font-bold">
                    <X className="w-4 h-4" />
                    取消编辑
                  </button>
                )}
              </div>
            </form>
            <div className="bg-slate-50 border border-primary/10 rounded-xl p-4 text-sm text-slate-500 leading-relaxed">
              选择“粘贴代码内容”后，代码会直接保存到后台数据库。系统会生成本站 H5 链接和二维码，线下扫码后在“小吴 · 寻猫记”里展示，不需要再次单独部署。
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {(data?.cat_links || []).map((item) => (
              <div key={item.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                <div className="grid sm:grid-cols-[120px_1fr] gap-4">
                  <div className="bg-slate-50 rounded-xl p-2 border border-primary/10 flex items-center justify-center">
                    <img src={qrImage(item.qr_url)} alt={`${item.title}二维码`} className="w-28 h-28" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-primary">{item.title}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-1">{item.content_type === 'html' ? '代码内容' : '外部网址'}</span>
                    </div>
                    <p className="text-xs text-slate-400 break-all mt-2">{item.qr_url}</p>
                    {item.content_type === 'url' && <p className="text-xs text-slate-500 break-all mt-2">内容网址：{item.target_url}</p>}
                    {item.content_type === 'html' && <p className="text-xs text-slate-500 mt-2">已保存 {item.html_code.length} 个字符的代码内容</p>}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button onClick={() => copyText(item.qr_url)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                        <Clipboard className="w-3.5 h-3.5" />
                        复制扫码链接
                      </button>
                      <button onClick={() => editCatContent(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                        <Edit3 className="w-3.5 h-3.5" />
                        编辑
                      </button>
                      <button onClick={() => handleDeleteCatContent(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data?.cat_links.length === 0 && <Empty text="暂无寻猫记内容" />}
        </DataPanel>

        <DataPanel title={editingCourseId ? '编辑课程 / 活动' : '新增课程 / 活动'}>
          <form onSubmit={handleSaveCourse} className="grid lg:grid-cols-[1fr_280px] gap-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="标题">
                <input value={courseDraft.title} onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} className="admin-input" />
              </Field>
              <Field label="分类">
                <select value={courseDraft.category} onChange={(event) => setCourseDraft({ ...courseDraft, category: event.target.value })} className="admin-input">
                  {managedCategories.map((category) => (
                    <option key={category.id || category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="价格">
                <input type="number" min="0" value={courseDraft.price} onChange={(event) => setCourseDraft({ ...courseDraft, price: Number(event.target.value) })} className="admin-input" />
              </Field>
              <Field label="讲师 / 主办人">
                <input value={courseDraft.instructor} onChange={(event) => setCourseDraft({ ...courseDraft, instructor: event.target.value })} className="admin-input" />
              </Field>
              <Field label="时间">
                <input value={courseDraft.date_info} onChange={(event) => setCourseDraft({ ...courseDraft, date_info: event.target.value })} className="admin-input" />
              </Field>
              <Field label="地点">
                <input value={courseDraft.location} onChange={(event) => setCourseDraft({ ...courseDraft, location: event.target.value })} className="admin-input" />
              </Field>
              <Field label="标签">
                <input value={courseDraft.tag || ''} onChange={(event) => setCourseDraft({ ...courseDraft, tag: event.target.value })} className="admin-input" />
              </Field>
              <Field label="图片数据">
                <input value={courseDraft.image_url} onChange={(event) => setCourseDraft({ ...courseDraft, image_url: event.target.value })} className="admin-input" />
              </Field>
              <Field label="介绍内容" wide>
                <textarea value={courseDraft.description} onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })} rows={5} className="admin-input resize-none" />
              </Field>
            </div>
            <aside className="space-y-4">
              <div className="bg-slate-50 border border-primary/10 rounded-xl p-3">
                {courseImages(courseDraft.image_url).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {courseImages(courseDraft.image_url).map((image, index) => (
                      <div key={`${image}-${index}`} className="relative overflow-hidden rounded-lg border border-primary/10 bg-white">
                        <img src={image} alt={`${courseDraft.title || '内容图片'} ${index + 1}`} className="w-full aspect-square object-cover" />
                        <button
                          type="button"
                          onClick={() => removeCourseImage(index)}
                          className="absolute right-1 top-1 w-7 h-7 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow"
                          aria-label="删除图片"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] flex items-center justify-center text-sm text-slate-400">暂无图片</div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 border border-primary/10 bg-white text-primary px-4 py-3 rounded-xl text-sm font-bold cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                {uploading ? '上传中...' : '上传/追加多张图片'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="hidden" />
              </label>
              <button disabled={saving || uploading} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存内容'}
              </button>
            </aside>
          </form>
        </DataPanel>

        <DataPanel title="已发布课程 / 活动">
          <div className="grid md:grid-cols-2 gap-3">
            {(data?.courses || []).map((course) => (
              <div key={course.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                <div className="flex gap-4">
                  {firstCourseImage(course.image_url) && <img src={firstCourseImage(course.image_url)} alt={course.title} className="w-24 h-24 object-cover rounded-lg bg-slate-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-primary">{course.title}</h3>
                      <span className="text-accent font-bold whitespace-nowrap">¥ {course.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{course.description}</p>
                    <p className="text-xs text-slate-500 mt-2">{course.category} · {course.instructor || '未填写'}</p>
                    <p className="text-xs text-slate-500 mt-1">{course.date_info} · {course.location}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => editCourse(course)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                    <Edit3 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <button onClick={() => handleDeleteCourse(course)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
          {data?.courses.length === 0 && <Empty />}
        </DataPanel>
      </div>
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function DataPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white/75 border border-primary/10 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary/10">
        <h2 className="text-lg font-bold text-primary">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block text-xs font-bold text-slate-500 mb-2">{label}</span>
      {children}
    </label>
  );
}

function Empty({ text = '暂无内容' }: { text?: string }) {
  return <div className="p-6 text-center text-sm text-slate-400">{text}</div>;
}
