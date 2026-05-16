import { X } from 'lucide-react';
import { useState } from 'react';
import { getCurrentMember } from '../lib/member';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  course: any;
};

export default function RegistrationModal({ isOpen, onClose, course }: Props) {
  const [loading, setLoading] = useState(false);
  const member = getCurrentMember();

  if (!isOpen || !course) return null;

  async function handleSubmit() {
    if (!member) {
      alert('请先注册会员');
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
      }),
    });
    const payload = await res.json();

    setLoading(false);

    if (!res.ok) {
      console.error(payload.error);
      alert('报名失败，请稍后再试');
      return;
    }

    alert('报名成功，已进入后台数据');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">课程报名</h2>
          <button onClick={onClose} className="p-1" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-gray-500 font-serif pt-2">{course.title}</div>
        <div className="bg-slate-50 border border-primary/10 rounded-xl p-4 text-sm text-slate-600">
          <p>会员：{member?.name}</p>
          <p className="mt-1">手机号：{member?.phone}</p>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl disabled:opacity-60">
          {loading ? '提交中...' : '确认报名'}
        </button>
      </div>
    </div>
  );
}
