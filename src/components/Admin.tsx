import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { cleanCourseText } from '../lib/text';

type MemberRow = {
  id: string;
  name: string;
  phone: string;
  login_type?: string;
  created_at: string;
};

type RegistrationRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  status: string;
  created_at: string;
  courses?: { title?: string; date_info?: string } | null;
  course_options?: { name?: string; date_info?: string; price?: number } | null;
};

type CourseRow = {
  id: string;
  title: string;
  price: number;
  instructor: string;
  category: string;
  date_info: string;
  location: string;
  registration_url?: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  text?: string;
  images?: string[];
  visibility?: string;
  featured?: boolean;
  course_id?: string;
  course_name?: string;
  created_at: string;
};

type MarketFavoriteRow = {
  id: string;
  user_id: string;
  item_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  image_urls?: string[];
  tag?: string;
  created_at: string;
};

type AdminData = {
  members: MemberRow[];
  registrations: RegistrationRow[];
  courses: CourseRow[];
  notes: NoteRow[];
  favorites: unknown[];
  market_items: unknown[];
  market_favorites: MarketFavoriteRow[];
  generated_at: string;
};

function rowImages(row: { image_url?: string; image_urls?: string[]; images?: string[] }) {
  if (Array.isArray(row.images) && row.images.length > 0) return row.images.filter(Boolean);
  if (Array.isArray(row.image_urls) && row.image_urls.length > 0) return row.image_urls.filter(Boolean);
  if (!row.image_url) return [];
  try {
    const parsed = JSON.parse(row.image_url);
    if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    // Older rows store a single image URL as plain text.
  }
  return [row.image_url].filter(Boolean);
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('zy-admin-password') || '');
  const [ok, setOk] = useState(() => sessionStorage.getItem('zy-admin-ok') === 'true');
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(
    () => [
      { label: '会员', value: data?.members.length || 0 },
      { label: '报名', value: data?.registrations.length || 0 },
      { label: '课程', value: data?.courses.length || 0 },
      { label: '笔记', value: data?.notes.length || 0 },
      { label: '雅集收藏', value: data?.market_favorites.length || 0 },
    ],
    [data]
  );

  const memberUpdates = useMemo(() => {
    const members = data?.members || [];
    return members.map((member) => ({
      member,
      registrations: (data?.registrations || []).filter((item) => item.user_id === member.id),
      notes: (data?.notes || []).filter((item) => item.user_id === member.id),
      marketFavorites: (data?.market_favorites || []).filter((item) => item.user_id === member.id),
    }));
  }, [data]);

  async function loadData(nextPassword = password) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '后台数据加载失败');
      setData({
        ...payload,
        courses: (payload.courses || []).map(cleanCourseText),
        registrations: (payload.registrations || []).map((item: RegistrationRow) => ({
          ...item,
          courses: item.courses ? cleanCourseText(item.courses) : item.courses,
        })),
        favorites: (payload.favorites || []).map((item: any) => ({
          ...item,
          courses: item.courses ? cleanCourseText(item.courses) : item.courses,
        })),
        market_favorites: payload.market_favorites || [],
        market_items: payload.market_items || [],
        notes: payload.notes || [],
      });
      setOk(true);
      sessionStorage.setItem('zy-admin-ok', 'true');
      sessionStorage.setItem('zy-admin-password', nextPassword);
    } catch (err) {
      setOk(false);
      sessionStorage.removeItem('zy-admin-ok');
      setError(err instanceof Error ? err.message : '后台数据加载失败');
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

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper-texture">
        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-xl p-7 w-full max-w-sm border border-primary/10">
          <div className="flex items-center gap-3 mb-5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">古吴轩章园数据后台</h1>
          </div>
          <input
            type="password"
            placeholder="请输入后台密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-primary/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-primary"
          />
          {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-sm mb-4">{error}</div>}
          <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-60">
            {loading ? '进入中...' : '进入后台'}
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
            <h1 className="text-3xl font-bold text-primary">古吴轩章园数据后台</h1>
            <p className="text-sm text-slate-500 mt-1">
              {data?.generated_at ? `最近刷新：${new Date(data.generated_at).toLocaleString('zh-CN')}` : '读取服务器数据'}
            </p>
          </div>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </button>
        </header>

        {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-4 text-sm">{error}</div>}

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((item) => (
            <div key={item.label} className="bg-white border border-primary/10 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </section>

        <DataPanel title="每个会员ID的所有更新内容">
          <div className="space-y-4">
            {memberUpdates.map(({ member, registrations, notes, marketFavorites }) => (
              <div key={member.id} className="bg-white border border-primary/10 rounded-xl p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-primary/5 pb-3">
                  <div>
                    <h3 className="font-bold text-primary">{member.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">ID：{member.id} · 电话：{member.phone}</p>
                  </div>
                  <p className="text-xs text-slate-400">注册：{new Date(member.created_at).toLocaleString('zh-CN')}</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-3">
                  <MiniBlock title={`报名 ${registrations.length}`}>
                    {registrations.map((item) => (
                      <div key={item.id} className="text-xs text-slate-600 border-b last:border-b-0 py-2">
                        <div className="font-bold text-primary">{item.courses?.title || '课程'}</div>
                        <div>班次：{item.course_options?.name || '未选择班次'}</div>
                        {item.course_options?.date_info && <div>{item.course_options.date_info}</div>}
                        <div>{item.status} · {new Date(item.created_at).toLocaleString('zh-CN')}</div>
                      </div>
                    ))}
                    {registrations.length === 0 && <SmallEmpty />}
                  </MiniBlock>

                  <MiniBlock title={`笔记 ${notes.length}`}>
                    {notes.map((note) => (
                      <div key={note.id} className="text-xs text-slate-600 border-b last:border-b-0 py-2 space-y-2">
                        <div className="font-bold text-primary">{note.title}</div>
                        {note.course_name && <div className="text-accent"># {note.course_name}</div>}
                        <div>{note.visibility === 'public' ? '公开' : '隐私'} · {note.featured ? '已精选' : '未精选'}</div>
                        <div className="whitespace-pre-wrap">{note.text}</div>
                        <ImageGrid images={rowImages(note)} />
                      </div>
                    ))}
                    {notes.length === 0 && <SmallEmpty />}
                  </MiniBlock>

                  <MiniBlock title={`雅集收藏 ${marketFavorites.length}`}>
                    {marketFavorites.map((item) => (
                      <div key={item.id} className="text-xs text-slate-600 border-b last:border-b-0 py-2 space-y-2">
                        <div className="font-bold text-primary">{item.name}</div>
                        <div>¥{item.price} · {new Date(item.created_at).toLocaleString('zh-CN')}</div>
                        <ImageGrid images={rowImages(item)} />
                      </div>
                    ))}
                    {marketFavorites.length === 0 && <SmallEmpty />}
                  </MiniBlock>
                </div>
              </div>
            ))}
          </div>
          {memberUpdates.length === 0 && <Empty />}
        </DataPanel>

        <DataPanel title="报名名单">
          <Table headers={['姓名', '电话', '课程', '班次', '状态', '提交时间']}>
            {(data?.registrations || []).map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <Td>{item.user_name}</Td>
                <Td>{item.user_phone}</Td>
                <Td>{item.courses?.title || '-'}</Td>
                <Td>{item.course_options?.name || '-'}</Td>
                <Td>{item.status}</Td>
                <Td>{new Date(item.created_at).toLocaleString('zh-CN')}</Td>
              </tr>
            ))}
          </Table>
          {data?.registrations.length === 0 && <Empty />}
        </DataPanel>

        <DataPanel title="会员学习笔记 / 图片">
          <div className="space-y-3">
            {(data?.notes || []).map((note) => (
              <div key={note.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-primary">{note.title}</h3>
                  <span className="text-xs text-slate-400">{new Date(note.created_at).toLocaleString('zh-CN')}</span>
                </div>
                {note.course_name && <p className="text-xs text-accent mt-1"># {note.course_name}</p>}
                <p className="text-xs text-slate-400 mt-1">会员ID：{note.user_id} · {note.visibility === 'public' ? '公开' : '隐私'} · {note.featured ? '已精选' : '未精选'}</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap mt-2">{note.text}</p>
                <ImageGrid images={rowImages(note)} />
              </div>
            ))}
          </div>
          {data?.notes.length === 0 && <Empty />}
        </DataPanel>

        <DataPanel title="课程数据">
          <div className="grid md:grid-cols-2 gap-3">
            {(data?.courses || []).map((course) => (
              <div key={course.id} className="border border-primary/10 rounded-xl p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-primary">{course.title}</h3>
                  <span className="text-accent font-bold">¥{course.price}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">{course.category} · {course.instructor}</p>
                <p className="text-xs text-slate-500 mt-1">{course.date_info} · {course.location}</p>
              </div>
            ))}
          </div>
          {data?.courses.length === 0 && <Empty />}
        </DataPanel>
      </div>
    </div>
  );
}

function DataPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white/70 border border-primary/10 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary/10">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MiniBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-slate-50 p-3">
      <h4 className="text-xs font-bold text-primary mb-2">{title}</h4>
      {children}
    </div>
  );
}

function ImageGrid({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-3">
      {images.map((image, index) => (
        <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" className="block">
          <img src={image} alt={`图片 ${index + 1}`} className="w-full aspect-square object-cover rounded-lg border border-primary/10" />
        </a>
      ))}
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>{headers.map((header) => <th key={header} className="p-3 text-left font-bold text-primary whitespace-nowrap">{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="p-3 whitespace-nowrap">{children}</td>;
}

function Empty() {
  return <div className="p-6 text-center text-sm text-slate-400">暂无数据</div>;
}

function SmallEmpty() {
  return <div className="py-3 text-xs text-slate-400">暂无记录</div>;
}
