import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col pb-24">
      {/* Hero Section */}
      <section className="px-6 py-6 max-w-5xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[4/3] md:aspect-[21/9] rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm bg-white"
        >
          <img 
            src="/images/home-figure-1.svg" 
            alt="图一"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/5" />
        </motion.div>
      </section>

      {/* Main Title */}
      <section className="px-6 mt-10 flex flex-col items-center text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl text-primary leading-snug font-serif font-bold tracking-tight px-4"
        >
          走进章园：人文与养生的交汇之地
        </motion.h2>
        <div className="w-[1px] h-12 bg-primary/20 mt-8" />
      </section>

      {/* Content Blocks */}
      <section className="px-6 mt-12 max-w-5xl mx-auto space-y-20">
        {/* Block 1 */}
        <motion.article 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-12 gap-8 items-center"
        >
          <div className="md:col-span-12">
             <div className="aspect-[16/9] rounded-xl overflow-hidden border-[0.5px] border-primary/10 bg-white p-2">
               <img 
                src="/images/home-figure-2.svg" 
                alt="图二"
                className="w-full h-full object-cover rounded-lg"
               />
             </div>
          </div>
          <div className="md:col-span-12 px-2 text-center md:text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/80 mb-2 block">百年文脉</span>
            <h3 className="text-2xl font-serif mb-4">太炎故居，静水深流</h3>
            <p className="text-slate-600 leading-relaxed font-sans text-sm md:text-base">
              坐落于喧嚣都市中的一方净土，章园承载着国学大师章太炎先生的精神印记。在这里，白墙黛瓦与曲径通幽不仅是建筑的语言，更是让心境沉淀、思绪延展的空间载体。
            </p>
          </div>
        </motion.article>

        {/* Block 2 */}
        <motion.article 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-12 gap-8 items-center"
        >
          <div className="md:col-span-12">
             <div className="aspect-[16/9] rounded-xl overflow-hidden border-[0.5px] border-primary/10 bg-white p-2">
               <img 
                src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80" 
                alt="图二"
                className="w-full h-full object-cover rounded-lg"
               />
             </div>
          </div>
          <div className="md:col-span-12 px-2 text-center md:text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/80 mb-2 block">夜校愿景</span>
            <h3 className="text-2xl font-serif mb-4">日落而息，向内求索</h3>
            <p className="text-slate-600 leading-relaxed font-sans text-sm md:text-base">
              章园夜校旨在为现代都市人提供一处精神栖息地。当夜幕降临，我们褪去白日的疲惫，通过八段锦的舒展、古琴的泛音、香道的冥想，重新建立与自我身体及内心的深度联结。
            </p>
          </div>
        </motion.article>

        {/* Philosophy Card */}
        <motion.div 
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          viewport={{ once: true }}
          className="bg-white/50 backdrop-blur-sm border border-primary/10 rounded-2xl p-10 text-center space-y-6 shadow-sm"
        >
          <Sparkles className="w-8 h-8 text-primary/30 mx-auto" strokeWidth={1} />
          <h3 className="text-2xl text-primary font-serif">Life Wellness 生活哲学</h3>
          <p className="max-w-md mx-auto text-slate-500 font-sans text-sm leading-relaxed">
            真正的养生，不拘泥于形式，而是融于日常的起居行止。在章园，我们将传统中医智慧与现代生活节奏相融合，倡导一种“不疾不徐，顺应自然”的现代文人生活方式。
          </p>
        </motion.div>

        {/* CTA */}
        <div className="flex justify-center pt-8">
          <Link 
            to="/courses"
            className="flex items-center justify-center gap-3 bg-primary text-white font-serif text-lg px-10 py-5 rounded-full shadow-xl hover:-translate-y-1 transition-all active:translate-y-0 group"
          >
            <span>开启我的养生之旅</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
