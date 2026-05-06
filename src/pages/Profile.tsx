import { useEffect, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Book, Bookmark, ChevronRight, Edit3, Gift, ImagePlus, LogOut, Plus, Star, Ticket, Wallet, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clearCurrentMember, getCurrentMember, saveCurrentMember, type Member } from '../lib/member';
import { Note } from '../types';

const tabs = ['我的报名', '学习笔记', '我的学习', '我的收藏'];

function parseNoteContent(content = '') {
  try {
    const payload = JSON.parse(content);
    return {
      text: String(payload.text || ''),
      images: Array.isArray(payload.images) ? payload.images.filter((item: unknown): item is string => typeof item === 'string') : [],
    };
  } catch {
    return { text: content, images: [] };
  }
}

function serializeNoteContent(text: string, images: string[]) {
  return JSON.stringify({ text, images });
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const [member, setMember] = useState<Member | null>(() => getCurrentMember());
  const [activeTab, setActiveTab] = useState('我的报名');
  const [notes, setNotes] = useState<Note[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountDraft, setAccountDraft] = useState({ name: '', phone: '', avatar_url: '' });
  const [newNote, setNewNote] = useState({ title: '', content: '', course_name: '', images: [] as string[] });

  useEffect(() => {
    const sync = () => {
      const next = getCurrentMember();
      setMember(next);
      setAccountDraft({ name: next?.name || '', phone: next?.phone || '', avatar_url: next?.avatar_url || '' });
    };
    sync();
    window.addEventListener('zyyx-member-change', sync);
    return () => window.removeEventListener('zyyx-member-change', sync);
  }, []);

  useEffect(() => {
    if (member) fetchData();
  }, [activeTab, member?.id]);

  async function fetchData() {
    if (!member) return;
    try {
      if (activeTab === '学习笔记') {
        const { data } = await supabase.from('notes').select('*').eq('user_id', member.id).order('created_at', { ascending: false });
        setNotes(data || []);
      } else if (activeTab === '我的收藏') {
        const { data } = await supabase.from('favorites').select('*, courses (*)').eq('user_id', member.id).order('created_at', { ascending: false });
        setFavorites(data || []);
      } else {
        const { data } = await supabase.from('registrations').select('*, courses (*)').eq('user_id', member.id).order('created_at', { ascending: false });
        setRegistrations(data || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleNoteImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const res = await fetch('/.netlify/functions/member-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadNoteImage',
            image: { fileName: file.name, contentType: file.type, base64 },
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || '图片上传失败');
        uploaded.push(payload.image_url);
      }
      setNewNote((current) => ({ ...current, images: [...current.images, ...uploaded] }));
    } catch (error) {
      alert(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAccountDraft((current) => ({ ...current, avatar_url: base64 }));
    event.target.value = '';
  }

  async function handleAddNote() {
    if (!member || !newNote.title || !newNote.content) return;
    const { error } = await supabase.from('notes').insert([
      {
        title: newNote.title,
        content: serializeNoteContent(newNote.content, newNote.images),
        course_name: newNote.course_name,
        user_id: member.id,
      },
    ]);
    if (error) {
      alert('保存失败，请稍后再试');
      return;
    }
    setNewNote({ title: '', content: '', course_name: '', images: [] });
    setShowNoteModal(false);
    fetchData();
  }

  function updateMember(next: Partial<Member>) {
    if (!member) return;
    const updated = { ...member, ...next };
    saveCurrentMember(updated);
    setMember(updated);
  }

  function saveAccount() {
    if (!accountDraft.name.trim() || !accountDraft.phone.trim()) {
      alert('请填写姓名和电话');
      return;
    }
    updateMember({
      name: accountDraft.name.trim(),
      phone: accountDraft.phone.trim(),
      avatar_url: accountDraft.avatar_url,
    });
    setShowEditModal(false);
  }

  function logout() {
    clearCurrentMember();
  }

  if (!member) return null;

  const learningRows = registrations.filter((item) => (activeTab === '我的学习' ? item.status === 'confirmed' : true));

  return (
    <div className="px-6 py-6 space-y-6 pb-28 overflow-x-hidden">
      <header className="bg-white rounded-xl border border-primary/10 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary text-xl font-bold shrink-0">
            {member.avatar_url ? <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" /> : member.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-serif font-bold text-primary truncate">{member.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{member.phone}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold tracking-wider">
              古吴轩章园会员
            </span>
          </div>
          <button onClick={() => setShowEditModal(true)} className="px-3 py-2 rounded-lg bg-slate-50 text-primary text-xs font-bold border border-primary/10">
            编辑
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <ActionStat icon={<Star className="w-4 h-4" />} label="积分" value={String(member.points || 0)} onClick={() => updateMember({ points: Number(member.points || 0) + 10 })} />
        <ActionStat icon={<Ticket className="w-4 h-4" />} label="优惠券" value={`${member.coupons || 0} 张`} onClick={() => updateMember({ coupons: Number(member.coupons || 0) + 1 })} />
        <ActionStat icon={<Wallet className="w-4 h-4" />} label="钱包" value={`¥ ${Number(member.wallet || 0).toFixed(2)}`} onClick={() => updateMember({ wallet: Number(member.wallet || 0) + 20 })} />
      </section>

      <section className="bg-white rounded-xl border border-primary/10 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-accent" />
          <h3 className="text-lg font-serif">古吴轩章园寻猫记</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          欢迎大家来到古吴轩章园寻猫。线下看到寻猫记二维码时，扫一扫就能打开对应介绍、线索或互动内容；边逛古吴轩章园边发现更多小乐趣，把这座院落慢慢玩熟。
        </p>
      </section>

      <section className="space-y-6">
        <div className="flex gap-6 overflow-x-auto no-scrollbar border-b border-primary/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-3 font-serif text-sm transition-all relative ${activeTab === tab ? 'text-primary font-bold' : 'text-slate-400'}`}
            >
              {tab}
              {activeTab === tab && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            {activeTab === '学习笔记' && (
              <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <button onClick={() => setShowNoteModal(true)} className="w-full py-4 border-2 border-dashed border-primary/10 rounded-xl text-slate-400 flex items-center justify-center gap-2 hover:border-primary/20 hover:text-primary transition-all">
                  <Plus size={20} />
                  <span>记录夜校学习笔记</span>
                </button>
                {notes.map((note) => {
                  const parsed = parseNoteContent(note.content);
                  return (
                    <div key={note.id} className="bg-white p-5 rounded-xl border border-primary/5 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-primary">{note.title}</h4>
                        <span className="text-[10px] text-slate-400">{note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      {note.course_name && <span className="text-[10px] text-accent font-bold"># {note.course_name}</span>}
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{parsed.text}</p>
                      {parsed.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {parsed.images.map((image, index) => (
                            <img key={`${image}-${index}`} src={image} alt={`学习笔记图片 ${index + 1}`} className="w-full aspect-square object-cover rounded-lg border border-primary/10" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {notes.length === 0 && <Empty icon={<Edit3 size={40} />} text="暂无学习笔记" />}
              </motion.div>
            )}

            {activeTab !== '学习笔记' && activeTab !== '我的收藏' && (
              <motion.div key="registrations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {learningRows.map((reg) => (
                  <div key={reg.id} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm">
                    <h4 className="text-sm font-bold text-primary">{reg.courses?.title || '课程'}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{reg.courses?.date_info}</p>
                    <span className={`inline-block mt-3 text-[10px] font-bold px-2 py-1 rounded ${reg.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {reg.status === 'confirmed' ? '已通过' : '待审核'}
                    </span>
                  </div>
                ))}
                {learningRows.length === 0 && <Empty icon={<Book size={40} />} text={`暂无${activeTab}`} />}
              </motion.div>
            )}

            {activeTab === '我的收藏' && (
              <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {favorites.map((fav) => (
                  <div key={fav.id} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm">
                    <h4 className="text-sm font-bold text-primary">{fav.courses?.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{fav.courses?.instructor}</p>
                  </div>
                ))}
                {favorites.length === 0 && <Empty icon={<Bookmark size={40} />} text="暂无收藏内容" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-primary/10 shadow-sm divide-y divide-primary/5">
        <MenuItem onClick={() => setActiveTab('我的学习')} icon={<Book className="w-5 h-5" />} label="我的学习" />
        <MenuItem onClick={() => setActiveTab('我的报名')} icon={<Star className="w-5 h-5" />} label="我的报名" />
        <MenuItem onClick={logout} icon={<LogOut className="w-5 h-5" />} label="退出登录" />
      </section>

      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif">编辑个人账号</h3>
                <button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold">
                  {accountDraft.avatar_url ? <img src={accountDraft.avatar_url} alt="头像" className="w-full h-full object-cover" /> : accountDraft.name.slice(0, 1)}
                </div>
                <label className="px-4 py-2 rounded-xl border border-primary/10 text-primary text-sm font-bold cursor-pointer">
                  上传头像
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <input value={accountDraft.name} onChange={(event) => setAccountDraft({ ...accountDraft, name: event.target.value })} placeholder="姓名" className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 outline-none" />
              <input value={accountDraft.phone} onChange={(event) => setAccountDraft({ ...accountDraft, phone: event.target.value })} placeholder="电话" className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 outline-none" />
              <button onClick={saveAccount} className="w-full bg-primary text-white py-4 rounded-xl font-bold">保存账号</button>
            </motion.div>
          </div>
        )}

        {showNoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNoteModal(false)} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif">记录学习笔记</h3>
                <button onClick={() => setShowNoteModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <input placeholder="笔记标题" className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 outline-none" value={newNote.title} onChange={(event) => setNewNote({ ...newNote, title: event.target.value })} />
              <input placeholder="关联课程名称（可选）" className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 outline-none" value={newNote.course_name} onChange={(event) => setNewNote({ ...newNote, course_name: event.target.value })} />
              <textarea placeholder="记录你的夜校学习心得..." rows={5} className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 outline-none resize-none" value={newNote.content} onChange={(event) => setNewNote({ ...newNote, content: event.target.value })} />
              <label className="flex items-center justify-center gap-2 border border-primary/10 bg-slate-50 text-primary px-4 py-3 rounded-xl text-sm font-bold cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                {uploading ? '图片上传中...' : '上传笔记图片'}
                <input type="file" accept="image/*" multiple onChange={handleNoteImageUpload} disabled={uploading} className="hidden" />
              </label>
              {newNote.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newNote.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="relative">
                      <img src={image} alt={`待保存图片 ${index + 1}`} className="w-full aspect-square object-cover rounded-lg border border-primary/10" />
                      <button onClick={() => setNewNote((current) => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 bg-white/90 text-red-600 rounded-full w-6 h-6 flex items-center justify-center">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleAddNote} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                保存笔记
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionStat({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl p-4 border border-primary/10 text-left active:scale-95 transition-transform">
      <div className="text-accent mb-3">{icon}</div>
      <div className="text-base font-bold text-primary">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1">{label}</div>
    </button>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12 text-slate-300">
      <div className="mx-auto mb-2 opacity-20 flex justify-center">{icon}</div>
      <p className="text-xs">{text}</p>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-primary/60 group-hover:text-primary transition-colors">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </button>
  );
}
