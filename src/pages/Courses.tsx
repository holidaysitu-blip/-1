import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Book, Calendar, MapPin, Search } from 'lucide-react';
import { Course, CourseOption } from '../types';
import RegistrationModal from '../components/RegistrationModal';
import { cleanCourseOptionText, cleanCourseText } from '../lib/text';

type CourseWithOptions = Course & { options?: CourseOption[] };

const fallbackCourses: Course[] = [
  {
    id: 'fallback-tcm',
    title: '中医养生入门课',
    description: '从日常草木、茶饮与节气养护开始，学习适合日常生活的养生方法。',
    price: 498,
    instructor: '古吴轩章园导师',
    category: '中医养生',
    image_url: '/assets/tcm-class.png',
    date_info: '周六 14:00-16:00',
    location: '古吴轩章园 · 夜校空间',
    tag: '夜校精选',
  },
  {
    id: 'fallback-calligraphy',
    title: '书写课堂：笔墨入门',
    description: '从执笔、用墨和线条开始，在一笔一画中安顿心绪。',
    price: 398,
    instructor: '书写导师',
    category: '国学人文',
    image_url: '/assets/calligraphy-class.jpg',
    date_info: '周日 10:00-12:00',
    location: '古吴轩章园 · 书香空间',
    tag: '新课',
  },
];

function courseImages(value = '') {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    // Older content stores a single image URL as plain text.
  }
  return [value].filter(Boolean);
}

function coverImage(value = '') {
  return courseImages(value)[0] || '';
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseWithOptions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch('/api/courses');
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'courses load failed');
        const nextCourses = payload.courses && payload.courses.length > 0 ? payload.courses : fallbackCourses;
        setCourses(nextCourses.map(cleanCourseText));
      } catch (error) {
        console.error(error);
        setCourses(fallbackCourses);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const categories = useMemo(() => ['全部', ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean)))], [courses]);
  const filteredCourses = courses.filter((course) => {
    const matchesCategory = filter === '全部' || course.category === filter;
    const text = `${course.title} ${course.category} ${course.description} ${course.instructor}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  });

  async function openRegistration(course: Course) {
    const rawJumpUrl = String(course.registration_url || '').trim();
    const miniProgramIndex = rawJumpUrl.indexOf('\u5c0f\u7a0b\u5e8f://');
    const jumpUrl = miniProgramIndex >= 0 ? rawJumpUrl.slice(miniProgramIndex) : rawJumpUrl;
    if (jumpUrl) {
      window.location.href = jumpUrl;
      return;
    }

    setSelectedCourse(course);
    setIsModalOpen(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'course detail load failed');
      setSelectedCourse({ ...cleanCourseText(payload.course), options: (payload.options || []).map(cleanCourseOptionText) });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="px-6 py-6 pb-24 relative">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold font-serif text-primary">古吴轩章园课程</h2>
        </div>
      </div>

      <section className="space-y-6 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索课程、老师或分类..."
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
              {filter === cat && <motion.div layoutId="cat-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {loading && <p className="text-center text-sm text-slate-400 py-8">课程加载中...</p>}
        {!loading &&
          filteredCourses.map((course) => (
            <motion.article layout key={course.id} className="group bg-white rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm">
              <button type="button" onClick={() => openRegistration(course)} className="block w-full text-left active:scale-[0.99] transition-transform">
                {coverImage(course.image_url) && <img src={coverImage(course.image_url)} alt={course.title} className="w-full aspect-[4/3] object-cover" />}
              </button>
              <div className="flex flex-col gap-3 p-5">
                <button type="button" onClick={() => openRegistration(course)} className="flex justify-between items-start text-left active:scale-[0.99] transition-transform">
                  <div className="flex flex-col gap-1">
                    {course.tag && <span className="text-[#7a3512] text-[10px] uppercase font-bold tracking-wider mb-1">{course.tag}</span>}
                    <h3 className="text-lg font-serif font-bold text-primary">{course.title}</h3>
                  </div>
                  <span className="text-accent font-bold text-lg whitespace-nowrap ml-2">¥{course.price} 起</span>
                </button>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{course.description}</p>

                <div className="pt-4 mt-1 border-t border-primary/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{course.date_info}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{course.location}</span>
                    </div>
                    <button
                      onClick={() => openRegistration(course)}
                      className="text-white bg-primary px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform shrink-0"
                    >
                      报名
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        {!loading && filteredCourses.length === 0 && <p className="text-center text-sm text-slate-400 py-8">暂无匹配课程</p>}
      </section>

      <RegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} course={selectedCourse} />
    </div>
  );
}
