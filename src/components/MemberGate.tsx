import { useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getCurrentMember, registerMember, type Member } from '../lib/member';

export default function MemberGate({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(() => getCurrentMember());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setMember(getCurrentMember());
    window.addEventListener('zyyx-member-change', sync);
    return () => window.removeEventListener('zyyx-member-change', sync);
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const nextMember = await registerMember({ name, phone, login_type: 'phone' });
      setMember(nextMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  if (member) return <>{children}</>;

  return (
    <div className="min-h-screen bg-paper-texture flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-xl border border-primary/10 shadow-xl p-7">
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-primary">注册古吴轩章园会员</h1>
        </div>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="姓名"
            className="w-full border border-primary/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="手机号"
            className="w-full border border-primary/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
          />
        </div>
        {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-sm mt-4">{error}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-5 disabled:opacity-60"
        >
          {loading ? '提交中...' : '注册 / 登录'}
        </button>
      </div>
    </div>
  );
}
