import { Clipboard, ExternalLink, ImagePlus, ListChecks, Plus, QrCode } from 'lucide-react';

const siteUrl = 'https://cheerly-elf-832745.netlify.app';

const links = [
  {
    title: '新增课程',
    description: '扫码后进入内容后台，默认按课程内容填写。',
    href: `${siteUrl}/content-admin?type=course`,
    icon: Plus,
  },
  {
    title: '新增活动',
    description: '扫码后进入内容后台，默认按活动内容填写。',
    href: `${siteUrl}/content-admin?type=event`,
    icon: QrCode,
  },
  {
    title: '更新图片和内容',
    description: '用于修改已发布课程、活动的照片、文案、时间和价格。',
    href: `${siteUrl}/content-admin`,
    icon: ImagePlus,
  },
  {
    title: '查看报名数据',
    description: '报名记录仍然进入原来的数据后台。',
    href: `${siteUrl}/admin`,
    icon: ListChecks,
  },
];

function qrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url)}`;
}

export default function UpdateLinks() {
  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    alert('链接已复制');
  }

  return (
    <div className="min-h-screen bg-paper-texture p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white/75 border border-primary/10 rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">夜校更新二维码入口</h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                以后把这一页保存起来，或把下面二维码打印出来。扫码进入对应后台，更新后内容会同步到小程序前台；报名数据会继续进入原来的数据后台。
              </p>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-4">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.href} className="bg-white border border-primary/10 rounded-xl p-5 shadow-sm">
                <div className="grid sm:grid-cols-[160px_1fr] gap-5">
                  <div className="bg-slate-50 border border-primary/10 rounded-xl p-3 flex items-center justify-center">
                    <img src={qrUrl(item.href)} alt={`${item.title}二维码`} className="w-36 h-36" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-primary">{item.title}</h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
                    <p className="text-xs text-slate-400 font-mono break-all mt-4">{item.href}</p>
                    <div className="flex flex-wrap gap-2 mt-auto pt-5">
                      <a
                        href={item.href}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        打开
                      </a>
                      <button
                        onClick={() => copyLink(item.href)}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        复制链接
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
