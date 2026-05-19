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
  registration_url?: string | null;
};

type CourseOptionRow = {
  id?: string;
  course_id: string;
  name: string;
  date_info: string;
  instructor: string;
  price: number;
  quota: number;
  status: 'open' | 'closed';
};

type CatLinkRow = {
  id?: string;
  title: string;
  content_type: 'url' | 'html';
  target_url: string;
  html_code: string;
  slug?: string;
  qr_url?: string;
  created_at?: string;
};

type CategoryRow = {
  id?: string;
  name: string;
  created_at?: string;
};

type LearningNoteRow = {
  id: string;
  user_id: string;
  title: string;
  course_name?: string;
  text?: string;
  images?: string[];
  visibility?: 'private' | 'public';
  featured?: boolean;
  course_id?: string;
  created_at: string;
};

type KnowledgeRow = {
  id?: string;
  title: string;
  source: string;
  sourceUrl: string;
  content: string;
  created_at?: string;
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

type MarketItemRow = {
  id?: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  tag?: string;
  status?: 'published' | 'hidden';
};

type ContentData = {
  courses: CourseRow[];
  course_options: CourseOptionRow[];
  learning_notes: LearningNoteRow[];
  cat_links: CatLinkRow[];
  categories: CategoryRow[];
  market_items: MarketItemRow[];
  wechat_news: WechatNewsRow[];
  knowledge_items: KnowledgeRow[];
  generated_at: string;
};

const fallbackCategories = ['中医养生', '国学人文', '美学雅活', '茶道香道', '琴棋书画', '手作体验', '活动体验'];

const emptyCourse: CourseRow = {
  title: '',
  description: '',
  price: 0,
  instructor: '',
  category: '中医养生',
  image_url: '',
  date_info: '',
  location: '古吴轩章园 · 夜校空间',
  tag: '',
  registration_url: '',
};

const emptyOption: CourseOptionRow = {
  course_id: '',
  name: '',
  date_info: '',
  instructor: '',
  price: 0,
  quota: 0,
  status: 'open',
};

const emptyCatLink: CatLinkRow = {
  title: '',
  content_type: 'html',
  target_url: '',
  html_code: '',
};

const emptyCategory: CategoryRow = { name: '' };

const emptyKnowledge: KnowledgeRow = {
  title: '',
  source: '后台资料库',
  sourceUrl: '',
  content: '',
};

const emptyWechat: WechatNewsRow = {
  title: '',
  publishedAt: '',
  sourceUrl: '',
  summary: '',
  content: '',
  origin: 'manual',
};

const emptyMarket: MarketItemRow = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  tag: '',
  status: 'published',
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function imagesFrom(value = '') {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    // Old rows store a single image URL.
  }
  return [value].filter(Boolean);
}

function serializeImages(images: string[]) {
  const clean = images.map((item) => item.trim()).filter(Boolean);
  return clean.length <= 1 ? clean[0] || '' : JSON.stringify(clean);
}

function qrImage(url = '') {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(url)}`;
}

export default function ContentAdmin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('zy-content-password') || '');
  const [ok, setOk] = useState(() => sessionStorage.getItem('zy-content-ok') === 'true');
  const [data, setData] = useState<ContentData | null>(null);
  const [courseDraft, setCourseDraft] = useState<CourseRow>(emptyCourse);
  const [optionDraft, setOptionDraft] = useState<CourseOptionRow>(emptyOption);
  const [catDraft, setCatDraft] = useState<CatLinkRow>(emptyCatLink);
  const [categoryDraft, setCategoryDraft] = useState<CategoryRow>(emptyCategory);
  const [knowledgeDraft, setKnowledgeDraft] = useState<KnowledgeRow>(emptyKnowledge);
  const [wechatDraft, setWechatDraft] = useState<WechatNewsRow>(emptyWechat);
  const [wechatImportUrl, setWechatImportUrl] = useState('');
  const [marketDraft, setMarketDraft] = useState<MarketItemRow>(emptyMarket);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [editingWechatId, setEditingWechatId] = useState<string | null>(null);
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const managedCategories = data?.categories?.length ? data.categories : fallbackCategories.map((name) => ({ id: name, name }));
  const stats = useMemo(
    () => [
      { label: '课程/活动', value: data?.courses.length || 0 },
      { label: '班次', value: data?.course_options.length || 0 },
      { label: '寻猫记', value: data?.cat_links.length || 0 },
      { label: '分类', value: data?.categories.length || 0 },
      { label: '笔记', value: data?.learning_notes.length || 0 },
      { label: '小吴资料', value: (data?.knowledge_items.length || 0) + (data?.wechat_news.length || 0) },
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
      const payload = await contentRequest<ContentData>({ action: 'list', password: nextPassword });
      setData({
        ...payload,
        courses: payload.courses || [],
        course_options: payload.course_options || [],
        learning_notes: payload.learning_notes || [],
        cat_links: payload.cat_links || [],
        categories: payload.categories || [],
        market_items: payload.market_items || [],
        wechat_news: payload.wechat_news || [],
        knowledge_items: payload.knowledge_items || [],
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

  async function uploadImages(event: ChangeEvent<HTMLInputElement>, folder: string, current: string, setValue: (value: string) => void) {
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
          folder,
          image: { fileName: file.name, contentType: file.type, base64 },
        });
        uploaded.push(payload.image_url);
      }
      setValue(serializeImages([...imagesFrom(current), ...uploaded]));
      setMessage(`已上传 ${uploaded.length} 张图片，记得点击保存`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertCourse', course: { ...courseDraft, id: editingCourseId || courseDraft.id } });
      setCourseDraft(emptyCourse);
      setEditingCourseId(null);
      setMessage('课程已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '课程保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveOption(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertCourseOption', option: { ...optionDraft, id: editingOptionId || optionDraft.id } });
      setOptionDraft(emptyOption);
      setEditingOptionId(null);
      setMessage('课程选项已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '课程选项保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertCategory', category: { ...categoryDraft, id: editingCategoryId || categoryDraft.id } });
      setCategoryDraft(emptyCategory);
      setEditingCategoryId(null);
      setMessage('分类已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '分类保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveCatLink(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertCatLink', link: { ...catDraft, id: editingCatId || catDraft.id } });
      setCatDraft(emptyCatLink);
      setEditingCatId(null);
      setMessage('寻猫记内容已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '寻猫记保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveKnowledge(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertKnowledgeItem', item: { ...knowledgeDraft, id: editingKnowledgeId || knowledgeDraft.id } });
      setKnowledgeDraft(emptyKnowledge);
      setEditingKnowledgeId(null);
      setMessage('小吴资料已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '资料保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveWechat(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertWechatNews', item: { ...wechatDraft, id: editingWechatId || wechatDraft.id } });
      setWechatDraft(emptyWechat);
      setEditingWechatId(null);
      setMessage('公众号资料已保存，小吴会优先引用');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号资料保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function importWechatUrl() {
    if (!wechatImportUrl.trim()) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'importWechatArticle', url: wechatImportUrl.trim() });
      setWechatImportUrl('');
      setMessage('公众号链接已导入');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号链接导入失败');
    } finally {
      setSaving(false);
    }
  }

  async function syncWechat() {
    setSaving(true);
    setError('');
    try {
      const result = await contentRequest<{ ok: boolean; synced: number; errors?: string[] }>({ action: 'syncWechatNews', count: 20 });
      setMessage(result.ok ? `公众号同步完成，新增/更新 ${result.synced} 条` : `公众号 API 暂未同步：${(result.errors || []).join('；')}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '公众号 API 同步失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveMarket(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action: 'upsertMarketItem', item: { ...marketDraft, id: editingMarketId || marketDraft.id } });
      setMarketDraft(emptyMarket);
      setEditingMarketId(null);
      setMessage('雅集内容已保存');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '雅集内容保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function updateNote(note: LearningNoteRow, patch: Partial<LearningNoteRow>) {
    setSaving(true);
    setError('');
    try {
      await contentRequest({
        action: 'updateLearningNoteMeta',
        id: note.id,
        meta: {
          visibility: patch.visibility ?? note.visibility ?? 'private',
          featured: patch.featured ?? Boolean(note.featured),
          course_id: patch.course_id ?? note.course_id ?? '',
        },
      });
      setMessage('笔记状态已更新');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '笔记更新失败');
    } finally {
      setSaving(false);
    }
  }

  async function deleteByAction(action: string, id?: string) {
    if (!id || !window.confirm('确定删除这条内容吗？')) return;
    setSaving(true);
    setError('');
    try {
      await contentRequest({ action, id });
      setMessage('已删除');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text = '') {
    await navigator.clipboard.writeText(text);
    setMessage('链接已复制');
  }

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
            <p className="text-sm text-slate-500 mt-1">保留原后台内容管理，并新增课程班次、笔记精选和小吴资料库。</p>
          </div>
          <button onClick={() => loadData()} disabled={loading} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </header>

        {message && <div className="bg-green-50 text-green-700 border border-green-100 rounded-xl p-3 text-sm">{message}</div>}
        {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-sm">{error}</div>}

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {stats.map((item) => (
            <div key={item.label} className="bg-white border border-primary/10 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </section>

        <DataPanel title={editingCourseId ? '编辑课程 / 活动' : '新增课程 / 活动'}>
          <form onSubmit={saveCourse} className="grid lg:grid-cols-[1fr_280px] gap-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="标题"><input value={courseDraft.title} onChange={(e) => setCourseDraft({ ...courseDraft, title: e.target.value })} className="admin-input" /></Field>
              <Field label="分类">
                <select value={courseDraft.category} onChange={(e) => setCourseDraft({ ...courseDraft, category: e.target.value })} className="admin-input">
                  {managedCategories.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="价格"><input type="number" min="0" value={courseDraft.price} onChange={(e) => setCourseDraft({ ...courseDraft, price: Number(e.target.value) })} className="admin-input" /></Field>
              <Field label="讲师 / 主办人"><input value={courseDraft.instructor} onChange={(e) => setCourseDraft({ ...courseDraft, instructor: e.target.value })} className="admin-input" /></Field>
              <Field label="时间"><input value={courseDraft.date_info} onChange={(e) => setCourseDraft({ ...courseDraft, date_info: e.target.value })} className="admin-input" /></Field>
              <Field label="地点"><input value={courseDraft.location} onChange={(e) => setCourseDraft({ ...courseDraft, location: e.target.value })} className="admin-input" /></Field>
              <Field label="标签"><input value={courseDraft.tag || ''} onChange={(e) => setCourseDraft({ ...courseDraft, tag: e.target.value })} className="admin-input" /></Field>
              <Field label="图片数据"><input value={courseDraft.image_url} onChange={(e) => setCourseDraft({ ...courseDraft, image_url: e.target.value })} className="admin-input" /></Field>
              <Field label="介绍内容" wide><textarea value={courseDraft.description} onChange={(e) => setCourseDraft({ ...courseDraft, description: e.target.value })} rows={5} className="admin-input resize-none" /></Field>
            </div>
            <aside className="space-y-4">
              <ImagePreview images={imagesFrom(courseDraft.image_url)} onRemove={(index) => setCourseDraft({ ...courseDraft, image_url: serializeImages(imagesFrom(courseDraft.image_url).filter((_, i) => i !== index)) })} />
              <UploadButton uploading={uploading} label="上传/追加多张课程图片" onChange={(e) => uploadImages(e, 'courses', courseDraft.image_url, (value) => setCourseDraft({ ...courseDraft, image_url: value }))} />
              <Field label="客户点击跳转链接">
                <input
                  value={courseDraft.registration_url || ''}
                  onChange={(e) => setCourseDraft({ ...courseDraft, registration_url: e.target.value })}
                  className="admin-input"
                  placeholder="https://..."
                />
              </Field>
              <button disabled={saving || uploading} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Save className="w-4 h-4" />保存课程
              </button>
            </aside>
          </form>
          <ListGrid>
            {(data?.courses || []).map((course) => (
              <Card key={course.id}>
                <div className="flex gap-4">
                  {imagesFrom(course.image_url)[0] && <img src={imagesFrom(course.image_url)[0]} alt={course.title} className="w-24 h-24 rounded-lg object-cover bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold text-primary">{course.title}</h3>
                      <span className="text-accent font-bold">¥{course.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{course.description}</p>
                    <p className="text-xs text-slate-400 mt-2">{course.category} · {course.date_info}</p>
                    {course.registration_url && <p className="text-xs text-primary mt-2 break-all">跳转：{course.registration_url}</p>}
                  </div>
                </div>
                <CardActions>
                  <button onClick={() => { setEditingCourseId(course.id || null); setCourseDraft({ ...emptyCourse, ...course, tag: course.tag || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                  <button onClick={() => deleteByAction('deleteCourse', course.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                </CardActions>
              </Card>
            ))}
          </ListGrid>
        </DataPanel>

        <DataPanel title="课程选项 / 班次管理">
          <form onSubmit={saveOption} className="grid md:grid-cols-4 gap-4">
            <Field label="关联课程">
              <select value={optionDraft.course_id} onChange={(e) => setOptionDraft({ ...optionDraft, course_id: e.target.value })} className="admin-input">
                <option value="">请选择课程</option>
                {(data?.courses || []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </Field>
            <Field label="班次名称"><input value={optionDraft.name} onChange={(e) => setOptionDraft({ ...optionDraft, name: e.target.value })} className="admin-input" placeholder="周六下午班" /></Field>
            <Field label="时间"><input value={optionDraft.date_info} onChange={(e) => setOptionDraft({ ...optionDraft, date_info: e.target.value })} className="admin-input" /></Field>
            <Field label="老师"><input value={optionDraft.instructor} onChange={(e) => setOptionDraft({ ...optionDraft, instructor: e.target.value })} className="admin-input" /></Field>
            <Field label="价格"><input type="number" min="0" value={optionDraft.price} onChange={(e) => setOptionDraft({ ...optionDraft, price: Number(e.target.value) })} className="admin-input" /></Field>
            <Field label="名额"><input type="number" min="0" value={optionDraft.quota} onChange={(e) => setOptionDraft({ ...optionDraft, quota: Number(e.target.value) })} className="admin-input" /></Field>
            <Field label="状态">
              <select value={optionDraft.status} onChange={(e) => setOptionDraft({ ...optionDraft, status: e.target.value as 'open' | 'closed' })} className="admin-input">
                <option value="open">可报名</option>
                <option value="closed">暂停报名</option>
              </select>
            </Field>
            <div className="flex items-end">
              <button disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Plus className="w-4 h-4" />{editingOptionId ? '更新班次' : '新增班次'}
              </button>
            </div>
          </form>
          <ListGrid>
            {(data?.course_options || []).map((option) => {
              const course = data?.courses.find((item) => item.id === option.course_id);
              return (
                <Card key={option.id}>
                  <h3 className="font-bold text-primary">{option.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{course?.title || '未关联课程'}</p>
                  <p className="text-xs text-slate-500 mt-1">{option.date_info} · {option.instructor || '老师待定'}</p>
                  <p className="text-xs text-slate-400 mt-1">¥{option.price} · 名额 {option.quota || '待定'} · {option.status === 'closed' ? '暂停报名' : '可报名'}</p>
                  <CardActions>
                    <button onClick={() => { setEditingOptionId(option.id || null); setOptionDraft(option); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                    <button onClick={() => deleteByAction('deleteCourseOption', option.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                  </CardActions>
                </Card>
              );
            })}
          </ListGrid>
        </DataPanel>

        <DataPanel title="课程 / 活动分类管理">
          <form onSubmit={saveCategory} className="grid md:grid-cols-[1fr_160px] gap-4">
            <Field label="分类名称">
              <input value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} className="admin-input" placeholder="例如：活动体验、茶会雅集" />
            </Field>
            <div className="flex items-end">
              <button disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Save className="w-4 h-4" />{editingCategoryId ? '更新分类' : '新增分类'}
              </button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {managedCategories.map((item) => (
              <div key={item.id || item.name} className="inline-flex items-center gap-2 rounded-full bg-white border border-primary/10 px-3 py-2 text-sm">
                <span>{item.name}</span>
                <button onClick={() => { setEditingCategoryId(item.id || null); setCategoryDraft(item); }} className="text-primary text-xs">编辑</button>
                <button onClick={() => deleteByAction('deleteCategory', item.id)} className="text-red-600 text-xs">删除</button>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel title="寻猫记内容管理">
          <form onSubmit={saveCatLink} className="grid md:grid-cols-2 gap-4">
            <Field label="内容名称">
              <input value={catDraft.title} onChange={(e) => setCatDraft({ ...catDraft, title: e.target.value })} className="admin-input" placeholder="例如：第1站线索" />
            </Field>
            <Field label="内容类型">
              <select value={catDraft.content_type} onChange={(e) => setCatDraft({ ...catDraft, content_type: e.target.value as 'url' | 'html' })} className="admin-input">
                <option value="html">粘贴代码内容</option>
                <option value="url">外部网址</option>
              </select>
            </Field>
            {catDraft.content_type === 'url' ? (
              <Field label="展示网址" wide>
                <input value={catDraft.target_url} onChange={(e) => setCatDraft({ ...catDraft, target_url: e.target.value })} className="admin-input" placeholder="https://..." />
              </Field>
            ) : (
              <Field label="HTML / H5 代码内容" wide>
                <textarea value={catDraft.html_code} onChange={(e) => setCatDraft({ ...catDraft, html_code: e.target.value })} rows={8} className="admin-input resize-y font-mono" />
              </Field>
            )}
            <div className="md:col-span-2">
              <button disabled={saving} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                {catDraft.content_type === 'html' ? <Code2 className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                {editingCatId ? '更新并生成二维码' : '保存并生成二维码'}
              </button>
            </div>
          </form>
          <ListGrid>
            {(data?.cat_links || []).map((item) => (
              <Card key={item.id}>
                <div className="grid grid-cols-[96px_1fr] gap-4">
                  <img src={qrImage(item.qr_url || '')} alt={`${item.title}二维码`} className="w-24 h-24 rounded-lg border border-primary/10 bg-slate-50 p-1" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-primary">{item.title}</h3>
                    <p className="text-xs text-slate-400 break-all mt-1">{item.qr_url}</p>
                    <p className="text-xs text-slate-500 mt-2">{item.content_type === 'html' ? `已保存 ${item.html_code?.length || 0} 个字符` : item.target_url}</p>
                  </div>
                </div>
                <CardActions>
                  <button onClick={() => copyText(item.qr_url || '')} className="action-btn"><Clipboard className="w-3.5 h-3.5" />复制链接</button>
                  <button onClick={() => { setEditingCatId(item.id || null); setCatDraft({ ...emptyCatLink, ...item }); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                  <button onClick={() => deleteByAction('deleteCatLink', item.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                </CardActions>
              </Card>
            ))}
          </ListGrid>
        </DataPanel>

        <DataPanel title="学员笔记管理 / 精选到课程详情">
          <div className="space-y-3">
            {(data?.learning_notes || []).map((note) => (
              <Card key={note.id}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-primary">{note.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">会员ID：{note.user_id} · {new Date(note.created_at).toLocaleString('zh-CN')}</p>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap line-clamp-3">{note.text}</p>
                    {(note.images || []).length > 0 && (
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-3">
                        {(note.images || []).map((image, index) => <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer"><img src={image} alt={`${note.title} ${index + 1}`} className="w-full aspect-square object-cover rounded-lg border border-primary/10" /></a>)}
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-72 space-y-2">
                    <select value={note.course_id || ''} onChange={(e) => updateNote(note, { course_id: e.target.value })} className="admin-input">
                      <option value="">不关联课程</option>
                      {(data?.courses || []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updateNote(note, { visibility: note.visibility === 'public' ? 'private' : 'public' })} className="action-btn justify-center">
                        {note.visibility === 'public' ? '设为隐私' : '设为公开'}
                      </button>
                      <button onClick={() => updateNote(note, { featured: !note.featured })} className="action-btn justify-center">
                        {note.featured ? '取消精选' : '设为精选'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">当前：{note.visibility === 'public' ? '公开' : '隐私'} · {note.featured ? '已精选' : '未精选'}</p>
                  </div>
                </div>
              </Card>
            ))}
            {(data?.learning_notes || []).length === 0 && <Empty text="暂无学员笔记" />}
          </div>
        </DataPanel>

        <DataPanel title="小吴资料库">
          <form onSubmit={saveKnowledge} className="grid md:grid-cols-2 gap-4">
            <Field label="资料标题"><input value={knowledgeDraft.title} onChange={(e) => setKnowledgeDraft({ ...knowledgeDraft, title: e.target.value })} className="admin-input" /></Field>
            <Field label="来源"><input value={knowledgeDraft.source} onChange={(e) => setKnowledgeDraft({ ...knowledgeDraft, source: e.target.value })} className="admin-input" placeholder="公众号 / 小红书 / 后台整理" /></Field>
            <Field label="来源链接" wide><input value={knowledgeDraft.sourceUrl} onChange={(e) => setKnowledgeDraft({ ...knowledgeDraft, sourceUrl: e.target.value })} className="admin-input" /></Field>
            <Field label="资料正文" wide><textarea value={knowledgeDraft.content} onChange={(e) => setKnowledgeDraft({ ...knowledgeDraft, content: e.target.value })} rows={6} className="admin-input resize-y" /></Field>
            <div className="md:col-span-2">
              <button disabled={saving} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Save className="w-4 h-4" />{editingKnowledgeId ? '更新资料' : '新增资料'}
              </button>
            </div>
          </form>
          <ListGrid>
            {(data?.knowledge_items || []).map((item) => (
              <Card key={item.id}>
                <h3 className="font-bold text-primary">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{item.source}{item.sourceUrl ? ` · ${item.sourceUrl}` : ''}</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3">{item.content}</p>
                <CardActions>
                  <button onClick={() => { setEditingKnowledgeId(item.id || null); setKnowledgeDraft(item); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                  <button onClick={() => deleteByAction('deleteKnowledgeItem', item.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                </CardActions>
              </Card>
            ))}
          </ListGrid>
        </DataPanel>

        <DataPanel title="公众号资料导入 / 同步">
          <div className="grid md:grid-cols-[1fr_160px_160px] gap-3">
            <input value={wechatImportUrl} onChange={(e) => setWechatImportUrl(e.target.value)} className="admin-input" placeholder="粘贴公众号文章链接导入" />
            <button type="button" onClick={importWechatUrl} disabled={saving} className="action-btn justify-center">导入链接</button>
            <button type="button" onClick={syncWechat} disabled={saving} className="action-btn justify-center">API 同步</button>
          </div>
          <form onSubmit={saveWechat} className="grid md:grid-cols-2 gap-4">
            <Field label="标题"><input value={wechatDraft.title} onChange={(e) => setWechatDraft({ ...wechatDraft, title: e.target.value })} className="admin-input" /></Field>
            <Field label="发布日期"><input value={wechatDraft.publishedAt} onChange={(e) => setWechatDraft({ ...wechatDraft, publishedAt: e.target.value })} className="admin-input" /></Field>
            <Field label="来源链接" wide><input value={wechatDraft.sourceUrl} onChange={(e) => setWechatDraft({ ...wechatDraft, sourceUrl: e.target.value })} className="admin-input" /></Field>
            <Field label="摘要" wide><textarea value={wechatDraft.summary} onChange={(e) => setWechatDraft({ ...wechatDraft, summary: e.target.value })} rows={3} className="admin-input resize-y" /></Field>
            <Field label="正文" wide><textarea value={wechatDraft.content} onChange={(e) => setWechatDraft({ ...wechatDraft, content: e.target.value })} rows={6} className="admin-input resize-y" /></Field>
            <div className="md:col-span-2">
              <button disabled={saving} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                <Save className="w-4 h-4" />{editingWechatId ? '更新公众号资料' : '新增公众号资料'}
              </button>
            </div>
          </form>
          <ListGrid>
            {(data?.wechat_news || []).map((item) => (
              <Card key={item.id}>
                <h3 className="font-bold text-primary">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{item.publishedAt || item.created_at} · {item.sourceUrl || '古吴轩公众号'}</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3">{item.summary || item.content}</p>
                <CardActions>
                  <button onClick={() => { setEditingWechatId(item.id || null); setWechatDraft({ ...emptyWechat, ...item }); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                  <button onClick={() => deleteByAction('deleteWechatNews', item.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                </CardActions>
              </Card>
            ))}
          </ListGrid>
        </DataPanel>

        <DataPanel title="雅集内容管理（保持原功能，不新增点位）">
          <form onSubmit={saveMarket} className="grid lg:grid-cols-[1fr_280px] gap-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="名称"><input value={marketDraft.name} onChange={(e) => setMarketDraft({ ...marketDraft, name: e.target.value })} className="admin-input" /></Field>
              <Field label="价格"><input type="number" min="0" value={marketDraft.price} onChange={(e) => setMarketDraft({ ...marketDraft, price: Number(e.target.value) })} className="admin-input" /></Field>
              <Field label="标签"><input value={marketDraft.tag || ''} onChange={(e) => setMarketDraft({ ...marketDraft, tag: e.target.value })} className="admin-input" /></Field>
              <Field label="显示状态">
                <select value={marketDraft.status || 'published'} onChange={(e) => setMarketDraft({ ...marketDraft, status: e.target.value as 'published' | 'hidden' })} className="admin-input">
                  <option value="published">前台显示</option>
                  <option value="hidden">暂不显示</option>
                </select>
              </Field>
              <Field label="图片地址" wide><input value={marketDraft.image_url} onChange={(e) => setMarketDraft({ ...marketDraft, image_url: e.target.value })} className="admin-input" /></Field>
              <Field label="介绍内容" wide><textarea value={marketDraft.description} onChange={(e) => setMarketDraft({ ...marketDraft, description: e.target.value })} rows={5} className="admin-input resize-none" /></Field>
              <div className="md:col-span-2">
                <button disabled={saving || uploading} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                  <Save className="w-4 h-4" />保存雅集内容
                </button>
              </div>
            </div>
            <aside className="space-y-4">
              <ImagePreview images={imagesFrom(marketDraft.image_url)} onRemove={(index) => setMarketDraft({ ...marketDraft, image_url: serializeImages(imagesFrom(marketDraft.image_url).filter((_, i) => i !== index)) })} />
              <UploadButton uploading={uploading} label="上传/追加多张雅集图片" onChange={(e) => uploadImages(e, 'market', marketDraft.image_url, (value) => setMarketDraft({ ...marketDraft, image_url: value }))} />
            </aside>
          </form>
          <ListGrid>
            {(data?.market_items || []).map((item) => (
              <Card key={item.id}>
                <div className="flex gap-4">
                  {imagesFrom(item.image_url)[0] && <img src={imagesFrom(item.image_url)[0]} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold text-primary">{item.name}</h3>
                      <span className="text-accent font-bold">¥{item.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                    <p className="text-xs text-slate-400 mt-2">{item.status === 'hidden' ? '暂不显示' : '前台显示'}</p>
                  </div>
                </div>
                <CardActions>
                  <button onClick={() => { setEditingMarketId(item.id || null); setMarketDraft({ ...emptyMarket, ...item, status: item.status || 'published' }); }} className="action-btn"><Edit3 className="w-3.5 h-3.5" />编辑</button>
                  <button onClick={() => deleteByAction('deleteMarketItem', item.id)} className="danger-btn"><Trash2 className="w-3.5 h-3.5" />删除</button>
                </CardActions>
              </Card>
            ))}
          </ListGrid>
        </DataPanel>
      </div>
    </div>
  );
}

function DataPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white/75 border border-primary/10 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary/10"><h2 className="text-lg font-bold text-primary">{title}</h2></div>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? 'md:col-span-2' : ''}`}><span className="block text-xs font-bold text-slate-500 mb-2">{label}</span>{children}</label>;
}

function ImagePreview({ images, onRemove }: { images: string[]; onRemove: (index: number) => void }) {
  if (images.length === 0) return <div className="w-full aspect-[4/3] rounded-xl border border-primary/10 bg-slate-50 flex items-center justify-center text-sm text-slate-400">暂无图片</div>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((image, index) => (
        <div key={`${image}-${index}`} className="relative overflow-hidden rounded-lg border border-primary/10 bg-white">
          <img src={image} alt={`图片 ${index + 1}`} className="w-full aspect-square object-cover" />
          <button type="button" onClick={() => onRemove(index)} className="absolute right-1 top-1 w-7 h-7 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

function UploadButton({ uploading, label, onChange }: { uploading: boolean; label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex items-center justify-center gap-2 border border-primary/10 bg-white text-primary px-4 py-3 rounded-xl text-sm font-bold cursor-pointer">
      <ImagePlus className="w-4 h-4" />{uploading ? '上传中...' : label}
      <input type="file" accept="image/*" multiple onChange={onChange} disabled={uploading} className="hidden" />
    </label>
  );
}

function ListGrid({ children }: { children: ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-3">{children}</div>;
}

function Card({ children }: { children: ReactNode; key?: string }) {
  return <div className="border border-primary/10 rounded-xl p-4 bg-white">{children}</div>;
}

function CardActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 mt-4">{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-slate-400">{text}</div>;
}
