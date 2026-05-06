export type Member = {
  id: string;
  name: string;
  phone: string;
  points: number;
  coupons: number;
  wallet: number;
  avatar_url?: string;
  login_type?: string;
};

const MEMBER_KEY = 'zyyx-member';

export function getCurrentMember(): Member | null {
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    return null;
  }
}

export function saveCurrentMember(member: Member) {
  localStorage.setItem(MEMBER_KEY, JSON.stringify({
    ...member,
    points: Number(member.points || 0),
    coupons: Number(member.coupons || 0),
    wallet: Number(member.wallet || 0),
  }));
  window.dispatchEvent(new Event('zyyx-member-change'));
}

export function clearCurrentMember() {
  localStorage.removeItem(MEMBER_KEY);
  window.dispatchEvent(new Event('zyyx-member-change'));
}

export async function registerMember(input: { name: string; phone: string; login_type?: 'phone' | 'wechat'; wx_nickname?: string }) {
  const res = await fetch('/.netlify/functions/member-manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', ...input }),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || '会员注册失败');
  saveCurrentMember(payload.member);
  return payload.member as Member;
}
