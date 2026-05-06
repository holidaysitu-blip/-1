import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Landmark, MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col pb-24">
      <section className="relative">
        <img
          src="/assets/home-zhangyuan.png"
          alt="古吴轩章园庭院"
          className="w-full h-[320px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/20 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-0 bottom-0 px-6 pb-8 text-white"
        >
          <p className="text-[10px] tracking-[0.28em] uppercase mb-3 text-white/80">GUWU XUAN ZHANGYUAN</p>
          <h2 className="text-4xl font-serif font-bold leading-tight text-white">在古吴轩章园，开启我的夜校之旅</h2>
          <p className="text-sm leading-relaxed mt-4 text-white/85 max-w-xl">
            百年院落、人文课堂与当代生活美学在这里相遇。下班以后，把自己交还给一盏灯、一节课和一段安静的时间。
          </p>
        </motion.div>
      </section>

      <section className="px-6 mt-8 max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-3 gap-3">
          <InfoTile icon={<Landmark className="w-5 h-5" />} label="太炎故居" text="百年文脉" />
          <InfoTile icon={<BookOpen className="w-5 h-5" />} label="夜校课程" text="下班而学" />
          <InfoTile icon={<MapPin className="w-5 h-5" />} label="姑苏古吴轩章园" text="院落雅集" />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/70 border border-primary/10 rounded-xl p-5 space-y-4"
        >
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-accent/80">古吴轩章园</span>
            <h3 className="text-2xl font-serif mt-1">一座被重新打开的文化院落</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            古吴轩章园曾是章太炎先生晚年在苏州的重要生活与讲学空间。今天，它从故居、书店、展陈与公共文化活动中生长出新的日常：可以阅读、听课、会友，也可以在夜校里重新靠近传统文化与自己的身心。
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
            <div className="rounded-lg bg-slate-50 p-3 border border-primary/5">民国建筑与江南院落气质并存</div>
            <div className="rounded-lg bg-slate-50 p-3 border border-primary/5">课程、活动、雅集与寻猫内容联动</div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-[0.9fr_1.1fr] gap-5 items-center"
        >
          <img
            src="/assets/night-school.png"
            alt="古吴轩章园课程海报"
            className="w-full aspect-[4/5] object-cover object-top rounded-xl shadow-sm border border-primary/10"
          />
          <div className="space-y-4">
            <Sparkles className="w-7 h-7 text-primary/30" strokeWidth={1} />
            <h3 className="text-2xl font-serif">日落而学，向内求索</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              古吴轩章园把中医养生、书写、香道、茶道、琴棋书画与生活美学放进同一个院落。课程不追求拥挤的信息量，而希望给你一段可持续回到自身的时间。
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-3 bg-primary text-white font-serif text-base px-6 py-4 rounded-full shadow-lg active:scale-95 transition-transform"
            >
              <span>开启我的夜校之旅</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.section>
      </section>
    </div>
  );
}

function InfoTile({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="bg-white border border-primary/10 rounded-xl p-3 min-h-[88px]">
      <div className="text-accent mb-2">{icon}</div>
      <div className="text-sm font-bold text-primary">{label}</div>
      <div className="text-[10px] text-slate-400 mt-1">{text}</div>
    </div>
  );
}
