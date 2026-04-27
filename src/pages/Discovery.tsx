import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Landmark, History, BookOpen } from 'lucide-react';

export default function Discovery() {
  return (
    <div className="flex flex-col pb-24 bg-paper-texture min-h-screen">
      {/* Header */}
      <section className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 border-b border-primary/10 pb-6"
        >
          <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">古吴轩 · 章园</h2>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[1px] bg-accent" />
            <p className="text-primary/60 text-[10px] tracking-widest uppercase font-sans">苏州近代文化的人文航标</p>
          </div>
        </motion.div>
      </section>

      {/* Main Content Area */}
      <section className="px-6 overflow-hidden">
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-sm space-y-8 border border-primary/5">
          
          <div className="space-y-6 text-slate-700 leading-relaxed font-sans text-sm md:text-base">
            <p>
              <strong className="text-primary font-serif">古吴轩章园</strong>，位于苏州姑苏区锦帆路38号，原为近代思想家、国学大师章太炎先生晚年在苏州的故居。这里始建于1932年，章太炎于1934年定居于此，并在此藏书、著述、会客、讲学，创办“章氏国学讲习会”，章园也因此成为苏州近代文化史中一处重要的人文空间。
            </p>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-primary/5">
                <Landmark className="w-5 h-5 text-accent mb-2" />
                <h4 className="text-xs font-bold text-primary">建筑风格</h4>
                <p className="text-[10px] mt-1">中西合璧：清水砖墙、苏式木花窗与罗马柱并置</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-primary/5">
                <History className="w-5 h-5 text-accent mb-2" />
                <h4 className="text-xs font-bold text-primary">文物保护</h4>
                <p className="text-[10px] mt-1">1982年列为市保，2011年升格为江苏省保</p>
              </div>
            </div>

            <p>
              章园建筑由三栋民国时期老洋房组成，整体呈现中西合璧的风格：清水砖墙、苏式木花窗、中式亭廊与罗马柱并置，既有江南宅院的文气，也保留了民国建筑的时代特征。南楼约600平方米，被规划为章太炎故居博物馆；北侧两栋建筑约880平方米，现作为古吴轩书店的主要阅读与活动空间。
            </p>

            <blockquote className="border-l-4 border-accent pl-4 py-2 bg-accent/5 rounded-r-lg italic text-slate-600 font-serif">
              简单来说，古吴轩章园不是普通书店，也不只是名人故居。它更像是一座被重新打开的苏州文化院落。
            </blockquote>

            <p>
              2023年，古吴轩书店接手运营，并由青天制作所主持空间改造，将这座近百年老宅更新为“古吴轩书店章太炎故居店”。同年11月12日，书店正式开放，章园也从单一故居空间，转变为集故居展陈、书籍阅读、文化活动、国学讲堂、茶咖休闲于一体的复合型文化空间。
            </p>

            <p>
              今天的古吴轩章园，既保留章太炎故居的历史厚度，也引入当代书店与城市文化空间的功能。1号楼侧重故居陈列，保留章太炎先生当年的藏书、起居风貌与历史印记；2、3号楼则被改造为阅读空间，承载图书、沙龙、讲座、展览与公共文化活动。
            </p>
          </div>

          {/* Social CTA */}
          <div className="pt-8 border-t border-primary/5">
            <button 
              onClick={() => window.open('https://mp.weixin.qq.com/s/your_official_page', '_blank')}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
            >
              <ExternalLink className="w-5 h-5" />
              <span>关注古吴轩公众号</span>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4">
              * 点击后请在打开的页面中关注我们，获取更多养生资讯
            </p>
          </div>
        </div>
      </section>

      {/* QR Code Scan Info */}
      <section className="px-6 py-12 text-center">
        <div className="w-12 h-[1px] bg-primary/20 mx-auto mb-6" />
        <p className="text-xs text-slate-400 font-serif leading-relaxed">
          扫码即可重新进入此章园介绍页<br/>
          欢迎来到章太炎故居书店
        </p>
      </section>
    </div>
  );
}
