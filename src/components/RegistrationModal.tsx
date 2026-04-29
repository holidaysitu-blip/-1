import { X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  course: any;
};

export default function RegistrationModal({
  isOpen,
  onClose,
  course,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !course) return null;

  async function handleSubmit() {
    if (!name || !phone) {
      alert('请填写姓名和手机号');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('registrations').insert([
      {
        user_name: name,
        user_phone: phone,
        user_id: 'guest',
        course_id: course.id,
        status: 'pending',
      },
    ]);

    setLoading(false);

    if (error) {
      alert('报名失败，请稍后再试');
      return;
    }

    alert('报名成功！');
    setName('');
    setPhone('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">课程报名</h2>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-gray-500 font-serif pt-2">{course.title}</div>

        <input
          className="w-full border rounded-xl px-4 py-3"
          placeholder="请输入姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border rounded-xl px-4 py-3"
          placeholder="请输入手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-xl"
        >
          {loading ? '提交中...' : '确认报名'}
        </button>
      </div>
    </div>
  );
}