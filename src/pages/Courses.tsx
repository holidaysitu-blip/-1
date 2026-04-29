import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, MapPin, Calendar, Users, Search, Book, ChevronDown, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Course } from '../types';
import RegistrationModal from '../components/RegistrationModal';

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('全部');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleToggleFavorite(courseId: string) {
    try {
      // First check if already favorited
      const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (existing) {
        await supabase.from('favorites').delete().eq('course_id', courseId);
        alert('已取消收藏');
      } else {
        await supabase.from('favorites').insert([{ user_id: 'guest', course_id: courseId }]);
        alert('已加入我的收藏');
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    async function fetchCourses() {
      const mockCourses: Course[] = [
        {
          id: '1',
          title: '中医经络调理实操',
          description: '溯源经典，结合现代人体工学。本课程由资深中医专家带教，在章园雅静的氛围中，掌握实用的经络疏通与日常养护技巧。',
          price: 1280,
          instructor: '李老师',
          category: '中医养生',
          image_url: '/images/course-zhongyi.svg',
          date_info: '周六 14:00-16:00 (共8课时)',
          location: '章园 · 听松阁',
          tag: '特邀名师'
        },
        {
          id: '2',
          title: '魏碑书法入门与临摹',
          description: '从《张猛龙碑》入手，体会北碑的雄强与古拙，修心养性。',
          price: 880,
          instructor: '李文轩 导师',
          category: '国学人文',
          image_url: '/images/course-shufa.svg',
          date_info: '周日 10:00-12:00',
          location: '章园 · 书香斋'
        },
        {
          id: '3',
          title: '宋代点茶与生活美学',
          description: '重现宋人吃茶的清雅意境，学习击拂手法，品味四般闲事。',
          price: 1080,
          instructor: '苏清婉 导师',
          category: '美学雅活',
          image_url: 'https://lh3.googleusercontent.com/aida/ADBb0ujEYqRrNsRlsGom4nzxcyvvGDJ_InM1TQ6_MvBTa5kj7rw7EskQ7xKGmODrIqc6EH_Zv0unvnKgEiPZoc-PYAadb9nxdDDWABj-YoPrcHaRypomq5jGDKFE0n7CEnUKEFi0RryQiwXkDOtp1J3hiodYvQTUVQ-Sfchmxyu2kVE7uOV1jEW6YD3OCO1AJW9xQzQbbX5OLWVFqOuh3B1kIuPEHqY3nTT4bvCuNrrry3Pzpu4MowBLgT342XC3Pir6gNWVBxdpjpR0qA',
          date_info: '周五 19:00-21:00',
          location: '章园 · 雅集苑'
        }
      ];

      try {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          setCourses(data);
        } else {
          setCourses(mockCourses);
        }
      } catch (e) {
        setCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const categories = ['全部', '中医养生', '国学人文', '美学雅活'];
  const filteredCourses = filter === '全部' ? courses : courses.filter(c => c.category === filter);

  return (
    <div className="px-6 py-6 pb-24 relative">
      {/* Top Header Mockup */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold font-serif text-primary">章园夜校</h2>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
           <Search className="w-5 h-5" />
           <div className="w-5 h-5 rounded-full border border-slate-300" />
        </div>
      </div>

      {/* Search & Filter */}
      <section className="space-y-6 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="搜索课程、讲师或雅集..." 
            className="w-full bg-[#F2F2F2] border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-0 placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-primary/5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`whitespace-nowrap pb-3 font-serif text-sm transition-all relative ${
                filter === cat ? 'text-primary font-bold' : 'text-slate-400'
              }`}
            >
              {cat}
              {filter === cat && (
                <motion.div layoutId="cat-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar">
           {['主题', '形式', '讲师', '时间'].map(f => (
             <button key={f} className="flex items-center gap-1 bg-[#F2F2F2] px-3 py-1.5 rounded-full text-xs text-slate-500 whitespace-nowrap">
               {f} <ChevronDown className="w-3 h-3" />
             </button>
           ))}
        </div>
      </section>

      {/* Course List */}
      <section className="space-y-6">
        {filteredCourses.map((course) => (
          <motion.article 
            layout
            key={course.id}
            className="group bg-white rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm"
          >
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={course.image_url} 
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {course.tag && (
                <div className="absolute top-4 left-4 bg-[#7a3512] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-sm">
                  {course.tag}
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(course.id);
                }}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-accent transition-colors"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-serif font-bold text-primary">{course.title}</h3>
                <span className="text-accent font-bold text-lg whitespace-nowrap ml-2">¥ {course.price}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
              
              <div className="pt-4 mt-1 border-t border-primary/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{course.date_info}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{course.location}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsModalOpen(true);
                    }}
                    className="text-white bg-primary px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  >
                    立即报名
                  </button>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      <RegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        course={selectedCourse} 
      />
    </div>
  );
}
