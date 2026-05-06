import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

type CatContent = {
  title: string;
  content_type: 'url' | 'html';
  target_url: string;
  html_code: string;
  slug: string;
};

export default function CatStory() {
  const { slug } = useParams();
  const [content, setContent] = useState<CatContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/.netlify/functions/content-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getCatLink', slug }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || '线索不存在');
        setContent(payload.link);
      } catch (err) {
        setError(err instanceof Error ? err.message : '线索不存在');
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [slug]);

  return (
    <div className="min-h-screen bg-paper-texture flex flex-col">
      <header className="h-14 bg-white/95 border-b border-primary/10 px-4 flex items-center justify-between shrink-0">
        <Link to="/chat" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary" aria-label="返回小吴">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center min-w-0">
          <h1 className="text-lg font-bold text-primary leading-tight">小吴 · 寻猫记</h1>
          <p className="text-[10px] text-slate-400 truncate">{content?.title || '扫码线索'}</p>
        </div>
        {content?.content_type === 'url' ? (
          <a href={content.target_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary" aria-label="打开原网页">
            <ExternalLink className="w-5 h-5" />
          </a>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Search className="w-8 h-8 animate-pulse" />
          <p className="text-sm">正在寻找线索...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-primary/10 rounded-xl p-6 max-w-sm text-center">
            <h2 className="text-xl font-bold text-primary">线索未找到</h2>
            <p className="text-sm text-slate-500 mt-2">{error}</p>
            <Link to="/chat" className="inline-flex mt-5 bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold">
              返回小吴
            </Link>
          </div>
        </div>
      )}

      {!loading && content && (
        <main className="flex-1 min-h-0 bg-white">
          {content.content_type === 'html' ? (
            <iframe
              srcDoc={content.html_code}
              title={content.title}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              className="w-full h-full min-h-[calc(100vh-56px)] border-0"
            />
          ) : (
            <iframe src={content.target_url} title={content.title} className="w-full h-full min-h-[calc(100vh-56px)] border-0" />
          )}
        </main>
      )}
    </div>
  );
}
