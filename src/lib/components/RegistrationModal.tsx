import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Course } from '../types';

interface Props {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistrationModal({ course, isOpen, onClose }: Props) {
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!course) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 检查 Supabase 是否存在
      const isPlaceholder = (supabase as any).supabaseUrl?.includes('placeholder');
      if (isPlaceholder) {
        throw new Error('[配置错] 数据库尚未正确连接。请在 Netlify 的 Environment Variables 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
      }

      // 增加安全检查：如果 course.id 看起来不是 UUID（比如是 mock 数据的 '1'），
      // 我们生成一个临时的 UUID 或使用 course.title 的哈希，确保 Supabase 能存进去
      let courseIdToSubmit = course.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id);
      
      if (!isUuid) {
        // 如果是 mock ID，尝试在 registrations 表里直接存课程名称作为备注，或者忽略 ID 限制
        // 这里我们假设你已经按照 README 创建了课程表
        console.warn('ID 格式不符合 UUID，报名可能会失败。请确保是在 Supabase 真实加载的课程上报名。');
      }

      const { error: submitError } = await supabase
        .from('registrations')
        .insert([
          {
            course_id: isUuid ? courseIdToSubmit : null, // 如果不是 UUID 则留空，通过 user_name 识别
            user_id: 'guest',
            user_name: formData.name + (isUuid ? '' : ` (预约课程: ${course.title})`),
            user_phone: formData.phone,
            status: 'pending'
          }
        ]);

      if (submitError) {
        // 特别处理权限错误
        if (submitError.code === '42501') {
          throw new Error('报名失败：权限不足。请在 Supabase 控制台的 SQL Editor 中为 registrations 表设置 RLS 策略（或者运行我在 README 中提供的 SQL 脚本）。');
        }
        throw submitError;
      }
      setSuccess(true);
    } catch (err: any) {
      console.error('Supabase Submit Error:', err);
      // 如果是网络连接失败 (Netlify 常见问题)
      if (err.message === 'Failed to fetch' || err.message === 'Load failed') {
        setError('网络连接失败 (Load failed)。这通常是因为配置的 URL 无法访问或 CORS 策略限制。请确保 Supabase URL 格式正确（以 https:// 开头）。');
      } else {
        setError(err.message || '报名失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {success ? (
              <div className="text-center py-8 space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle className="w-12 h-12" />
                </motion.div>
                <h3 className="text-2xl font-serif">报名成功</h3>
                <p className="text-slate-500">
                  我们已收到您的申请，园主将尽快通过电话与您确认细节。
                </p>
                <button 
                  onClick={onClose}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg mt-6"
                >
                  太好了
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-accent font-bold text-xs">预约课程</span>
                  <h3 className="text-2xl">{course.title}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span>{course.instructor} 主讲</span>
                    <span>•</span>
                    <span>¥{course.price}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">您的姓名</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="如何称呼您？"
                      className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">联系电话</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="您的手机号码"
                      className="w-full bg-slate-50 border border-primary/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                  
                  {error && (
                    <p className="text-xs text-red-500 text-center">{error}</p>
                  )}

                  <button 
                    disabled={loading}
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认报名'}
                  </button>
                </form>
                
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  点击“确认报名”即表示您同意章园夜校的相关守则。<br/>
                  个人信息将仅用于此次课程确认。
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
