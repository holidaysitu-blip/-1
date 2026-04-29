import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, ChevronRight, Wallet, Ticket, Star, Book, Bookmark, MapPin, Settings, Edit3, Image as ImageIcon, Plus, X, CreditCard, CalendarDays, CheckCircle, Headphones } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Note, AlbumItem } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState('我的订单');
  const [notes, setNotes] = useState<Note[]>([]);
  const [album, setAlbum] = useState<AlbumItem[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', course_name: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    try {
      if (activeTab === '园主笔记') {
        const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) setNotes(data);
      } else if (activeTab === '活动相册') {
        const { data } = await supabase.from('album').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setAlbum(data);
        } else {
          setAlbum([
            { id: '1', user_id: 'guest', image_url: '', caption: '春日雅集：香道初探', course_name: '宋代生活美学' },
            { id: '2', user_id: 'guest', image_url: '', caption: '听松阁里，琴声悠扬', course_name: '古琴入门' }
          ]);
        }
      } else if (activeTab === '我的收藏') {
        const { data } = await supabase.from('favorites').select(`
          *,
          courses (*)
        `).order('created_at', { ascending: false });
        if (data) setFavorites(data);
      } else if (['我的订单', '我的预约', '我的学习'].includes(activeTab)) {
        const { data } = await supabase.from('registrations').select(`
          *,
          courses (*)
        `).order('created_at', { ascending: false });
        if (data) setRegistrations(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddNote() {
    if (!newNote.title || !newNote.content) return;
    try {
      const { error } = await supabase.from('notes').insert([{
        ...newNote,
        user_id: 'guest'
      }]);
      if (error) throw error;
      setNewNote({ title: '', content: '', course_name: '' });
      setShowNoteModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="px-6 py-6 space-y-8 pb-28 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center gap-6 mt-4">
        <div className="flex-1">
          <h2 className="text-2xl font-serif font-bold text-primary">林宛瑜</h2>
          <span className="inline-block mt-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
            资深园友
          </span>
        </div>
        <button className="p-2 text-primary hover:opacity-80 transition-opacity">
          <QrCode className="w-6 h-6" />
        </button>
      </header>

      {/* Stats */}
      <section className="bg-white rounded-xl p-6 flex justify-around items-center border-[0.5px] border-primary/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <Stat label="积分" value="1,250" />
        <div className="w-[1px] h-8 bg-primary/10" />
        <Stat label="优惠券" value="3" />
        <div className="w-[1px] h-8 bg-primary/10" />
        <Stat label="钱包" value="¥ 0.00" />
      </section>

      {/* Profile Sections Navigation */}
      <section className="space-y-6">
        <div className="flex gap-6 overflow-x-auto no-scrollbar border-b border-primary/5">
          {['我的订单', '园主笔记', '我的预约', '我的学习', '我的收藏', '活动相册'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-3 font-serif text-sm transition-all relative ${
                activeTab === tab ? 'text-primary font-bold' : 'text-slate-400'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            {activeTab === '我的订单' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-xl p-6 border-[0.5px] border-primary/10 space-y-6"
              >
                <div className="flex justify-around items-center text-slate-500">
                  <OrderIcon label="待支付" icon={<CreditCard size={24} />} />
                  <OrderIcon label="待参加" icon={<CalendarDays size={24} />} />
                  <OrderIcon label="已完成" icon={<CheckCircle size={24} />} />
                  <OrderIcon label="售后" icon={<Headphones size={24} />} />
                </div>
              </motion.div>
            )}

            {activeTab === '我的收藏' && (
              <motion.div
                key="favorites-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {favorites.map(fav => (
                  <div key={fav.id} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-primary">{fav.courses?.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{fav.courses?.instructor}</p>
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-accent text-[10px] font-bold">¥ {fav.courses?.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {favorites.length === 0 && (
                  <div className="text-center py-12 text-slate-300">
                    <Bookmark size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">暂无收藏内容</p>
                  </div>
                )}
              </motion.div>
            )}

            {['我的预约', '我的学习'].includes(activeTab) && (
              <motion.div
                key="registrations-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {registrations
                  .filter(r => activeTab === '我的学习' ? r.status === 'confirmed' : r.status === 'pending')
                  .map(reg => (
                  <div key={reg.id} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-primary">{reg.courses?.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{reg.courses?.date_info}</p>
                      <div className="mt-2 flex items-center justify-between">
                         <span className={cn(
                           "text-[8px] font-bold px-2 py-0.5 rounded uppercase",
                           reg.status === 'confirmed' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                         )}>
                           {reg.status === 'confirmed' ? '已确认' : '处理中'}
                         </span>
                      </div>
                    </div>
                  </div>
                ))}
                {registrations.filter(r => activeTab === '我的学习' ? r.status === 'confirmed' : r.status === 'pending').length === 0 && (
                  <div className="text-center py-12 text-slate-300">
                    <Book size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">暂无{activeTab}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === '园主笔记' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => setShowNoteModal(true)}
                  className="w-full py-4 border-2 border-dashed border-primary/10 rounded-xl text-slate-400 flex items-center justify-center gap-2 hover:border-primary/20 hover:text-primary transition-all"
                >
                  <Plus size={20} />
                  <span>记录课程心得</span>
                </button>
                
                {notes.map((note) => (
                  <div key={note.id} className="bg-white p-5 rounded-xl border border-primary/5 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-primary">{note.title}</h4>
                      <span className="text-[10px] text-slate-400">{new Date(note.created_at!).toLocaleDateString()}</span>
                    </div>
                    {note.course_name && <span className="text-[10px] text-accent font-bold"># {note.course_name}</span>}
                    <p className="text-sm text-slate-600 line-clamp-3">{note.content}</p>
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="text-center py-12 text-slate-300">
                    <Edit3 size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">暂无笔记，快去记上一笔吧</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === '活动相册' && (
              <motion.div
                key="album-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-2 gap-3"
              >
                {album.map(item => (
                  <div key={item.id} className="relative group rounded-xl bg-primary/5 p-4 border border-primary/5">
                    <div className="flex flex-col gap-2">
                       <p className="text-xs text-primary font-medium line-clamp-2">{item.caption}</p>
                       <span className="text-[8px] text-accent font-bold"># {item.course_name}</span>
                    </div>
                  </div>
                ))}
                {album.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-300">
                    <ImageIcon size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">相册目前还是空的</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Menu List */}
      <section className="bg-white rounded-xl border border-primary/10 shadow-sm divide-y divide-primary/5">
        <MenuItem onClick={() => setActiveTab('我的学习')} icon={<Book className="w-5 h-5" />} label="我的学习" />
        <MenuItem onClick={() => setActiveTab('我的预约')} icon={<Star className="w-5 h-5" />} label="我的预约" />
        <MenuItem onClick={() => setActiveTab('我的收藏')} icon={<Bookmark className="w-5 h-5" />} label="我的收藏" />
        <MenuItem icon={<MapPin className="w-5 h-5" />} label="地址管理" />
        <MenuItem icon={<Settings className="w-5 h-5" />} label="设置" />
      </section>

      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNoteModal(false)} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif">记录心得</h3>
                <button onClick={() => setShowNoteModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <input 
                placeholder="给笔记起个名字..." 
                className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary outline-none"
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
              />
              <input 
                placeholder="关联课程名称（可选）" 
                className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary outline-none"
                value={newNote.course_name}
                onChange={e => setNewNote({...newNote, course_name: e.target.value})}
              />
              <textarea 
                placeholder="在这记录您的养生心得..." 
                rows={5}
                className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary outline-none resize-none"
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
              />
              <button 
                onClick={handleAddNote}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                保存笔记
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-lg font-bold text-primary">{value}</span>
      <span className="text-xs text-slate-400 font-serif">{label}</span>
    </div>
  );
}

function OrderIcon({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer group">
      <div className="text-primary/60 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-primary/60 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </button>
  );
}
