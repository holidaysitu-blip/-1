import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Landmark, MapPin, Route, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Spot = {
  id: string;
  name: string;
  short: string;
  icon: string;
  position: { x: string; y: string };
  detail: string;
  items: string[];
};

const spots: Spot[] = [
  {
    id: 'bookstore',
    name: '古吴轩书院（书店）',
    short: '书店',
    icon: '📚',
    position: { x: '26%', y: '37%' },
    detail: '章园里的核心阅读空间，适合慢逛与选书。',
    items: [
      '一楼：古吴轩本馆',
      '一楼：接待处',
      '一楼：国学主题馆',
      '一楼：百花书局',
      '二楼：茶器',
      '二楼：文房四宝',
      '二楼：刺绣',
      '二楼：香薰首饰'
    ]
  },
  {
    id: 'lecture',
    name: '国学大讲堂',
    short: '讲堂',
    icon: '🏫',
    position: { x: '53%', y: '22%' },
    detail: '适合参与文化活动与学习课程。',
    items: ['国学大课堂', '章园夜校']
  },
  {
    id: 'former-home',
    name: '章太炎故居',
    short: '故居',
    icon: '🏠',
    position: { x: '79%', y: '22%' },
    detail: '历史人文核心点位，可了解章太炎先生生平。',
    items: ['章太炎故居陈列']
  },
  {
    id: 'noodle',
    name: '协顺兴面馆',
    short: '面店',
    icon: '🍜',
    position: { x: '88%', y: '36%' },
    detail:
      '章园内文人食府点位，公开报道提到其为吴江协顺兴合作门店，主打苏式浇头面与园林氛围用餐。',
    items: ['招牌苏式汤面', '浇头面（按当日出品）', '建议避峰到店体验']
  }
];

const routes = {
  quick: {
    name: '45分钟·首次到访快线',
    stops: ['bookstore', 'lecture', 'former-home', 'noodle']
  },
  culture: {
    name: '90分钟·深度人文线',
    stops: ['former-home', 'lecture', 'bookstore', 'noodle']
  },
  night: {
    name: '夜游放松线（讲堂+面馆）',
    stops: ['lecture', 'bookstore', 'noodle']
  }
} as const;

export default function Home() {
  const [activeSpotId, setActiveSpotId] = useState<string>('bookstore');
  const [selectedRoute, setSelectedRoute] = useState<keyof typeof routes>('quick');

  const activeSpot = spots.find((spot) => spot.id === activeSpotId) ?? spots[0];
  const activeRouteSpots = useMemo(
    () => routes[selectedRoute].stops.map((id) => spots.find((spot) => spot.id === id)).filter(Boolean) as Spot[],
    [selectedRoute]
  );

  return (
    <div className="flex flex-col pb-24">
      <section className="relative">
        <img src="/assets/home-zhangyuan.png" alt="古吴轩章园庭院" className="w-full h-[320px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/20 to-transparent" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-0 bottom-0 px-6 pb-8 text-white">
          <p className="text-[10px] tracking-[0.28em] uppercase mb-3 text-white/80">GUWU XUAN ZHANGYUAN</p>
          <h2 className="text-4xl font-serif font-bold leading-tight text-white">在古吴轩章园，开启我的夜校之旅</h2>
          <p className="text-sm leading-relaxed mt-4 text-white/85 max-w-xl">百年院落、人文课堂与当代生活美学在这里相遇。现在你可以在下方地图中直接点位导览与选路线。</p>
        </motion.div>
      </section>

      <section className="px-6 mt-8 max-w-5xl mx-auto space-y-8 w-full">
        <div className="grid grid-cols-3 gap-3">
          <InfoTile icon={<Landmark className="w-5 h-5" />} label="太炎故居" text="百年文脉" />
          <InfoTile icon={<BookOpen className="w-5 h-5" />} label="夜校课程" text="下班而学" />
          <InfoTile icon={<MapPin className="w-5 h-5" />} label="姑苏古吴轩章园" text="院落雅集" />
        </div>

        <section className="bg-white/80 border border-primary/10 rounded-2xl p-4 md:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            <h3 className="text-2xl font-serif">互动地图导览</h3>
          </div>
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
            <div className="relative rounded-xl overflow-hidden border border-primary/10 bg-[#f8f0e7]">
              <img src="/assets/home-zhangyuan.png" alt="章园导览地图" className="w-full h-full min-h-[330px] object-cover" />
              {spots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => setActiveSpotId(spot.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-xs font-semibold shadow transition ${
                    activeSpotId === spot.id ? 'bg-accent text-white scale-105' : 'bg-white/95 text-primary hover:bg-primary/10'
                  }`}
                  style={{ left: spot.position.x, top: spot.position.y }}
                >
                  <span>{spot.icon} {spot.short}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-primary/10 bg-slate-50 p-4 space-y-3">
              <h4 className="text-xl">{activeSpot.name}</h4>
              <p className="text-sm text-slate-600">{activeSpot.detail}</p>
              <ul className="space-y-2 text-sm">
                {activeSpot.items.map((item) => (
                  <li key={item} className="rounded-lg bg-white border border-primary/10 px-3 py-2">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white/80 border border-primary/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-accent" />
            <h3 className="text-2xl font-serif">推荐路线选择</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {(Object.keys(routes) as Array<keyof typeof routes>).map((routeKey) => (
              <button
                key={routeKey}
                onClick={() => setSelectedRoute(routeKey)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selectedRoute === routeKey ? 'bg-primary text-white border-primary' : 'bg-white border-primary/10 hover:border-primary/40'
                }`}
              >
                <div className="font-semibold">{routes[routeKey].name}</div>
                <div className={`text-xs mt-1 ${selectedRoute === routeKey ? 'text-white/80' : 'text-slate-500'}`}>{routes[routeKey].stops.length} 个打卡点</div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-primary/25 bg-slate-50 p-4">
            <p className="text-sm text-slate-600 mb-3">当前路线：{routes[selectedRoute].name}</p>
            <ol className="space-y-2">
              {activeRouteSpots.map((spot, idx) => (
                <li key={spot.id} className="text-sm bg-white border border-primary/10 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="inline-flex w-6 h-6 rounded-full bg-primary text-white items-center justify-center text-xs">{idx + 1}</span>
                  <span>{spot.icon} {spot.name}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid md:grid-cols-[0.9fr_1.1fr] gap-5 items-center">
          <img src="/assets/night-school.png" alt="古吴轩章园课程海报" className="w-full aspect-[4/5] object-cover object-top rounded-xl shadow-sm border border-primary/10" />
          <div className="space-y-4">
            <Sparkles className="w-7 h-7 text-primary/30" strokeWidth={1} />
            <h3 className="text-2xl font-serif">日落而学，向内求索</h3>
            <p className="text-slate-600 leading-relaxed text-sm">古吴轩章园把中医养生、书写、香道、茶道、琴棋书画与生活美学放进同一个院落。课程不追求拥挤的信息量，而希望给你一段可持续回到自身的时间。</p>
            <div className="flex items-center gap-2 text-xs text-slate-500"><UtensilsCrossed className="w-4 h-4" />面店信息已按公开资料补充为“协顺兴面馆”。</div>
            <Link to="/courses" className="inline-flex items-center justify-center gap-3 bg-primary text-white font-serif text-base px-6 py-4 rounded-full shadow-lg active:scale-95 transition-transform">
              <span>开启我的夜校之旅</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.section>
      </section>
    </div>
  );
}

function InfoTile({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return (
    <div className="bg-white border border-primary/10 rounded-xl p-3 min-h-[88px]">
      <div className="text-accent mb-2">{icon}</div>
      <div className="text-sm font-bold text-primary">{label}</div>
      <div className="text-[10px] text-slate-400 mt-1">{text}</div>
    </div>
  );
}
