export function cleanText(value = '') {
  let text = String(value || '');
  const broken = '\\uFFFD';
  return text
    .replace(new RegExp(`中医[${broken}?]+养?生`, 'g'), '中医养生')
    .replace(new RegExp(`美学[${broken}?]+活`, 'g'), '美学雅活')
    .replace(new RegExp(`魏碑书法[${broken}?]+门`, 'g'), '魏碑书法入门')
    .replace(new RegExp(`章园[${broken}?]+夜校空间`, 'g'), '章园 · 夜校空间')
    .replace(new RegExp(`周[${broken}?]+(?=\\s*[0-9])`, 'g'), '周六')
    .replace(/\s*·\s*/g, ' · ')
    .trim();
}

export function cleanCourseText<T extends Record<string, unknown>>(course: T): T {
  return {
    ...course,
    title: cleanText(String(course.title || '')),
    description: cleanText(String(course.description || '')),
    instructor: cleanText(String(course.instructor || '')),
    category: cleanText(String(course.category || '')),
    date_info: cleanText(String(course.date_info || '')),
    location: cleanText(String(course.location || '')),
    tag: cleanText(String(course.tag || '')),
  };
}

export function cleanCourseOptionText<T extends Record<string, unknown>>(option: T): T {
  return {
    ...option,
    name: cleanText(String(option.name || '')),
    date_info: cleanText(String(option.date_info || '')),
    instructor: cleanText(String(option.instructor || '')),
  };
}

export function normalizeJumpUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const miniProgramIndex = raw.indexOf('小程序://');
  if (miniProgramIndex >= 0) {
    return '';
  }

  const httpMatch = raw.match(/https?:\/\/[^\s，。；]+/i);
  if (httpMatch) return httpMatch[0];

  if (/^(weixin|alipays|tel|mailto):/i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(raw)) return `https://${raw}`;

  return raw;
}

export function normalizeMiniProgramText(value = '') {
  const raw = String(value || '').trim();
  const miniProgramIndex = raw.indexOf('小程序://');
  if (miniProgramIndex < 0) return '';
  return `#${raw.slice(miniProgramIndex)}`;
}
