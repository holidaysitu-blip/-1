import { Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentMember } from '../lib/member';
import type { Course, CourseOption } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  course: (Course & { options?: CourseOption[] }) | null;
  selectedOptionId?: string;
};

export default function RegistrationModal({ isOpen, onClose, course, selectedOptionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [optionId, setOptionId] = useState('');
  const member = getCurrentMember();

  useEffect(() => {
    if (!course) return;
    const firstOpen = (course.options || []).find((option) => option.status !== 'closed');
    setOptionId(selectedOptionId || firstOpen?.id || '');
  }, [course?.id, course?.options?.length, selectedOptionId]);

  if (!isOpen || !course) return null;

  const options = course.options || [];
  const selectedOption = options.find((option) => option.id === optionId);
  const displayPrice = selectedOption?.price || course.price || 0;
  const selectedDate = selectedOption?.date_info || course.date_info;
  const selectedName = selectedOption?.name || course.title;
  const coverImage = courseImages(course.image_url)[0] || '';

  async function handleSubmit() {
    if (!member) {
      alert('请先注册会员');
      return;
    }
    if (options.length > 0 && !optionId) {
      alert('请先选择课程班次');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: member.name,
        user_phone: member.phone,
        user_id: member.id,
        course_id: course.id,
        course_option_id: optionId,
      }),
    });
    const payload = await res.json();
    setLoading(false);

    if (!res.ok) {
      console.error(payload.error);
      alert('报名失败，请稍后再试');
      return;
    }

    alert('报名成功，待审核');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 flex items-end justify-center">
      <div className="relative bg-white w-full sm:w-[520px] rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="relative px-4 pt-4 pb-3 border-b border-slate-100 text-center shrink-0">
          <div className="inline-flex items-center justify-center gap-1 text-base text-slate-900">
            <span className="inline-flex -space-x-2 mr-1">
              <span className="w-7 h-7 rounded-full bg-[#d6e8f3] border-2 border-white text-[15px] flex items-center justify-center">👨🏻</span>
              <span className="w-7 h-7 rounded-full bg-[#f5dcc8] border-2 border-white text-[15px] flex items-center justify-center">👩🏻</span>
            </span>
            <span>“服务好” “高品质”</span>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 p-1 text-slate-300 active:scale-95" aria-label="关闭">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-6">
          <section className="flex gap-4 py-4 border-b border-slate-100">
            <div className="w-32 h-32 rounded overflow-hidden bg-slate-100 shrink-0">
              {coverImage ? (
                <img src={coverImage} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {course.tag && <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-sm mb-1">{course.tag}</span>}
                  <h2 className="text-xl leading-snug text-slate-950 font-medium">{course.title}</h2>
                </div>
                <button className="p-1 text-green-500 shrink-0" aria-label="分享">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
              <div className="text-orange-600 text-2xl font-bold leading-none mt-2">¥{displayPrice.toFixed(2)}</div>
              <p className="text-sm text-slate-900 leading-snug mt-3">
                已选择： {selectedName}
                {selectedDate ? `（${selectedDate}）` : ''}
              </p>
            </div>
          </section>

          <section className="pt-5">
            <h3 className="text-base text-slate-950 mb-3">课程</h3>
            <div className="flex flex-wrap gap-3">
              {options.length > 0 ? (
                options.map((option) => {
                  const disabled = option.status === 'closed';
                  const active = optionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setOptionId(option.id)}
                      className={`max-w-full rounded px-4 py-2.5 text-left text-base leading-tight transition ${
                        active ? 'bg-green-50 text-green-700 ring-1 ring-green-500' : 'bg-slate-100 text-slate-500'
                      } ${disabled ? 'opacity-50 line-through' : 'active:scale-[0.98]'}`}
                    >
                      {option.name}
                      {option.date_info ? `（${option.date_info}）` : ''}
                    </button>
                  );
                })
              ) : (
                <button type="button" className="rounded bg-slate-100 text-slate-500 px-4 py-2.5 text-base text-left">
                  {course.date_info || '默认班次'}
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="shrink-0 bg-white border-t border-slate-100 p-0 sm:rounded-b-2xl overflow-hidden">
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#05c765] text-white pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] font-bold disabled:opacity-60 active:scale-[0.99] transition">
            <span className="block text-xl leading-none">¥{displayPrice}</span>
            <span className="block text-base leading-tight mt-1">{loading ? '提交中...' : '确认报名'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function courseImages(value = '') {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    // Older content stores a single image URL as plain text.
  }
  return [value].filter(Boolean);
}
