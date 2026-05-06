import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Heart, RefreshCw, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentMember, type Member } from '../lib/member';

type MarketItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  image_urls?: string[];
  tag?: string;
  status?: 'published' | 'hidden';
  created_at?: string;
};

const fallbackItems: MarketItem[] = [
  {
    id: 'fallback-1',
    name: '古吴轩章园监制秋梨膏',
    description: '古法慢熬，润肺降燥，适合作为日常养生小礼。',
    price: 128,
    image_url: '',
    tag: '园主推荐',
  },
  {
    id: 'fallback-2',
    name: '手工艾草枕',
    description: '精选陈年艾绒，棉麻布艺，适合夜校学友居家使用。',
    price: 88,
    image_url: '',
  },
  {
    id: 'fallback-3',
    name: '明前龙井雅集定制',
    description: '清雅茶礼，适合课程、雅集与活动后的伴手礼。',
    price: 298,
    image_url: '',
  },
];

function favoriteKey(itemId: string) {
  return `market-favorite:${itemId}`;
}

function marketImages(item: MarketItem) {
  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) return item.image_urls.filter(Boolean);
  if (!item.image_url) return [];
  try {
    const parsed = JSON.parse(item.image_url);
    if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    // Older rows store a single image URL as plain text.
  }
  return [item.image_url].filter(Boolean);
}

export default function Market() {
  const [member, setMember] = useState<Member | null>(() => getCurrentMember());
  const [items, setItems] = useState<MarketItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setMember(getCurrentMember());
    window.addEventListener('zyyx-member-change', sync);
    return () => window.removeEventListener('zyyx-member-change', sync);
  }, []);

  useEffect(() => {
    fetchMarketItems();
  }, []);

  useEffect(() => {
    if (member) fetchFavorites(member.id);
  }, [member?.id]);

  const visibleItems = useMemo(() => (items.length > 0 ? items : fallbackItems), [items]);

  async function fetchMarketItems() {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/content-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listMarketItems' }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '雅集内容加载失败');
      setItems(payload.market_items || []);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFavorites(memberId: string) {
    const { data } = await supabase
      .from('notes')
      .select('course_name')
      .eq('user_id', memberId)
      .like('course_name', 'market-favorite:%');
    setFavoriteIds(new Set((data || []).map((row) => String(row.course_name).replace('market-favorite:', ''))));
  }

  async function toggleFavorite(item: MarketItem) {
    if (!member) return;
    setSavingId(item.id);
    const isFavorited = favoriteIds.has(item.id);
    try {
      if (isFavorited) {
        const { error } = await supabase.from('notes').delete().eq('user_id', member.id).eq('course_name', favoriteKey(item.id));
        if (error) throw error;
        setFavoriteIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: member.id,
          title: `雅集收藏：${item.name}`,
          course_name: favoriteKey(item.id),
          content: JSON.stringify({
            type: 'market_favorite',
            item_id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            image_urls: marketImages(item),
            tag: item.tag || '',
          }),
        });
        if (error) throw error;
        setFavoriteIds((current) => new Set(current).add(item.id));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '收藏保存失败，请稍后再试');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="px-6 py-6 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-serif font-bold text-primary">雅集</h2>
        </div>
        <button
          onClick={fetchMarketItems}
          disabled={loading}
          className="w-9 h-9 rounded-full bg-white border border-primary/10 text-primary flex items-center justify-center"
          aria-label="刷新雅集内容"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && <p className="text-center text-sm text-slate-400 py-8">雅集内容加载中...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading &&
          visibleItems.map((item) => {
            const isFavorited = favoriteIds.has(item.id);
            const images = marketImages(item);
            return (
              <motion.article
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="group bg-white rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm flex flex-col"
              >
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 bg-white p-1">
                    <img src={images[0]} alt={item.name} className={`${images.length === 1 ? 'col-span-2' : ''} w-full aspect-[4/3] object-cover rounded-lg bg-slate-100`} />
                    {images.slice(1, 4).map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`${item.name} ${index + 2}`} className="w-full aspect-[4/3] object-cover rounded-lg bg-slate-100" />
                    ))}
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between gap-4 p-5">
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="text-lg font-serif font-bold text-primary">{item.name}</h3>
                      {item.tag && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg text-accent font-bold">¥{item.price}</span>
                    <button
                      onClick={() => toggleFavorite(item)}
                      disabled={savingId === item.id}
                      className={`h-9 px-3 rounded-full flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-transform ${
                        isFavorited ? 'bg-accent text-white' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {isFavorited ? <Heart className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
                      {savingId === item.id ? '保存中' : isFavorited ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
      </div>
    </div>
  );
}
