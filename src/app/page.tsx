'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChartSpline,
  Kanban,
  LayoutPanelTop,
  Link2,
  Rocket,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';

/* ─────────────────────────────── Data ─────────────────────────────── */

const features = [
  {
    title: 'Quản lý Dự án',
    icon: LayoutPanelTop,
    description: 'Tạo và tổ chức dự án với cấu trúc rõ ràng. Phân quyền linh hoạt cho từng thành viên.',
    accent: '#4a7c3f',
  },
  {
    title: 'Kanban Realtime',
    icon: Kanban,
    description: 'Kéo-thả task trên bảng Kanban với cập nhật thời gian thực. Đồng bộ tức thì giữa mọi thành viên.',
    accent: '#39638d',
  },
  {
    title: 'Gợi ý Phân công',
    icon: Users,
    description: 'AI phân tích kỹ năng và workload để gợi ý người phù hợp nhất cho từng công việc.',
    accent: '#5d4c91',
  },
  {
    title: 'Trợ lý AI Chat',
    icon: Bot,
    description: 'Chat trực tiếp với AI để tạo task, phân tích dữ liệu, và nhận báo cáo thông minh.',
    accent: '#2f6052',
  },
  {
    title: 'Quản lý Kỹ năng',
    icon: ChartSpline,
    description: 'Ma trận kỹ năng đội ngũ, đánh giá năng lực thành viên theo thời gian thực.',
    accent: '#985c21',
  },
  {
    title: 'Dự báo Rủi ro',
    icon: Zap,
    description: 'Phát hiện task có nguy cơ trễ hạn và đề xuất hành động phòng ngừa kịp thời.',
    accent: '#a54f4f',
  },
];

const processSteps = [
  { number: '01', title: 'Tạo dự án', description: 'Thiết lập cấu trúc, quyền hạn, và mời đội ngũ của bạn trong vài giây.' },
  { number: '02', title: 'Thêm công việc', description: 'Soạn thảo task hoặc dùng AI Expand để biến ý tưởng đơn giản thành mô tả chi tiết.' },
  { number: '03', title: 'Cộng tác', description: 'Gán vai trò, bình luận, review và theo dõi checklist trực tiếp trên từng task.' },
  { number: '04', title: 'AI tối ưu', description: 'Hệ thống tự động dự báo rủi ro, gợi ý phân công và tổng hợp báo cáo tiến độ.' },
];

const testimonials = [
  {
    quote: 'VSmart đã thay đổi hoàn toàn cách chúng tôi quản lý dự án. AI assistant thật sự hữu ích — tiết kiệm hơn 5 giờ mỗi tuần.',
    authorName: 'Minh Anh',
    authorTitle: 'Founder, TechStart',
  },
  {
    quote: 'Kanban realtime là tính năng chúng tôi yêu thích nhất. Không bao giờ phải refresh để xem cập nhật nữa.',
    authorName: 'Hoàng Nam',
    authorTitle: 'CTO, DevFlow',
  },
  {
    quote: 'Dự báo rủi ro giúp chúng tôi phòng ngừa vấn đề trước khi xảy ra. Đội ngũ hoạt động hiệu quả hơn 40%.',
    authorName: 'Lan Chi',
    authorTitle: 'Product Manager, SoftCore',
  },
];

const logos = [
  { src: '/assets/icons/companies/amazon.svg', alt: 'Amazon', width: 124 },
  { src: '/assets/icons/companies/dribbble.svg', alt: 'Dribbble', width: 126 },
  { src: '/assets/icons/companies/hubspot.svg', alt: 'HubSpot', width: 128 },
  { src: '/assets/icons/companies/notion.svg', alt: 'Notion', width: 145 },
  { src: '/assets/icons/companies/netflix.svg', alt: 'Netflix', width: 125 },
  { src: '/assets/icons/companies/zoom.svg', alt: 'Zoom', width: 110 },
];

/* ────────────────────────── Scroll-reveal hook ────────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────── Marquee logos ─────────────────────────── */

function LogoMarquee() {
  const doubled = [...logos, ...logos];
  return (
    <div className="relative overflow-hidden py-6">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#f4f7ed] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#f4f7ed] to-transparent" />
      <div className="flex animate-[marquee_30s_linear_infinite] gap-16 will-change-transform">
        {doubled.map((logo, i) => (
          <div key={`${logo.alt}-${i}`} className="flex h-[36px] shrink-0 items-center opacity-30 grayscale">
            <Image src={logo.src} alt={logo.alt} width={logo.width} height={36} className="h-auto max-h-[36px] w-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */

export default function Home() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Newsreader:ital,wght@0,500;0,600;0,700;1,500&display=swap');

        .font-bricolage { font-family: 'Bricolage Grotesque', sans-serif; }
        .font-newsreader { font-family: 'Newsreader', serif; }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(1.5deg); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .hero-orb {
          animation: float-slow 8s ease-in-out infinite;
        }

        .hero-orb-2 {
          animation: float-slow 11s ease-in-out infinite reverse;
        }

        .step-line {
          background: repeating-linear-gradient(
            to bottom,
            #c5d6b6 0px,
            #c5d6b6 6px,
            transparent 6px,
            transparent 12px
          );
        }
      `}</style>

      <div className="font-bricolage relative min-h-screen overflow-x-hidden bg-[#f4f7ed] text-[#1f2b1f]">

        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative min-h-[100vh] overflow-hidden">
          {/* Background atmosphere */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_-10%,#d6eab8_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_80%,#c8deb3_0%,transparent_60%)]" />

          {/* Floating orbs */}
          <div className="hero-orb pointer-events-none absolute right-[12%] top-[18%] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,#bede8c_0%,transparent_70%)] opacity-40 blur-[2px]" />
          <div className="hero-orb-2 pointer-events-none absolute -left-[5%] bottom-[5%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,#a8d47a_0%,transparent_70%)] opacity-30 blur-[2px]" />

          {/* Grain texture overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

          {/* Navigation */}
          <nav className="relative z-20 mx-auto flex max-w-[1280px] items-center justify-between px-8 pt-6 max-xl:px-6 max-sm:px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/assets/icons/logo-icon.svg" alt="VSmart" width={28} height={28} />
              <span className="text-[26px] font-semibold tracking-tight text-[#1f2b1f]">VSmart</span>
            </Link>
            <div className="flex items-center gap-8 max-md:hidden">
              <Link href="/docs" className="text-[15px] font-medium text-[#4a5e43] transition hover:text-[#1f2b1f]">Docs</Link>
              <a href="https://github.com/zaikaman/VSmart" target="_blank" rel="noreferrer" className="text-[15px] font-medium text-[#4a5e43] transition hover:text-[#1f2b1f]">GitHub</a>
              <Link href="/login" className="rounded-full bg-[#1f2b1f] px-5 py-2 text-[14px] font-semibold text-[#e8f0d8] transition hover:bg-[#2d402b]">
                Bắt đầu ngay
              </Link>
            </div>
            <Link href="/login" className="md:hidden rounded-full bg-[#1f2b1f] px-4 py-1.5 text-[13px] font-semibold text-[#e8f0d8]">
              Bắt đầu
            </Link>
          </nav>

          {/* Hero content */}
          <div className="relative z-10 mx-auto max-w-[1280px] px-8 max-xl:px-6 max-sm:px-5">
            <div className="grid min-h-[calc(100vh-80px)] items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Left — text */}
              <div className="max-w-[620px] pb-16 pt-24 max-lg:pt-16 max-lg:pb-8">
                <Reveal>
                  <span className="inline-block rounded-full border border-[#c5d6b6] bg-[#e4f0d5]/60 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4a6d3a] backdrop-blur-sm">
                    Open-source · AI-Powered
                  </span>
                </Reveal>

                <Reveal delay={100}>
                  <h1 className="font-newsreader mt-7 text-[clamp(2.8rem,5.5vw,4.6rem)] font-bold leading-[1.04] tracking-[-0.02em] text-[#141e13]">
                    Quản lý dự án<br />
                    <span className="text-[#4a7c3f]">thông minh hơn</span><br />
                    với sức mạnh AI.
                  </h1>
                </Reveal>

                <Reveal delay={200}>
                  <p className="mt-6 max-w-[480px] text-[17px] leading-[1.7] text-[#4a5e43]">
                    Tự động gợi ý phân công, dự báo rủi ro trễ hạn, và chat trực tiếp với AI assistant — tất cả trong một nền tảng duy nhất.
                  </p>
                </Reveal>

                <Reveal delay={300}>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link
                      href="/login"
                      className="group inline-flex items-center gap-2.5 rounded-full bg-[#1f2b1f] px-7 py-3 text-[15px] font-semibold text-[#e8f0d8] transition hover:bg-[#2d402b] hover:shadow-[0_8px_30px_-8px_rgba(31,43,31,0.4)]"
                    >
                      Bắt đầu miễn phí
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                    <a
                      href="https://github.com/zaikaman/VSmart"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[#b8c9a9] px-6 py-3 text-[15px] font-medium text-[#3a5032] transition hover:border-[#8da67c] hover:bg-white/50"
                    >
                      <Link2 className="h-4 w-4" />
                      Source code
                    </a>
                  </div>
                </Reveal>

                <Reveal delay={400}>
                  <div className="mt-12 flex items-center gap-8 text-[13px] text-[#6b7f62]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#5a8a3f]" /> Miễn phí & mã nguồn mở
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#5a8a3f]" /> Setup trong 10 phút
                    </span>
                  </div>
                </Reveal>
              </div>

              {/* Right — visual composition */}
              <Reveal delay={250} className="relative max-lg:hidden">
                <div className="relative">
                  {/* Main dashboard preview card */}
                  <div className="relative rounded-[28px] border border-[#c8d8b8] bg-[linear-gradient(145deg,#1e2a1f_0%,#2a3d2b_50%,#3d5838_100%)] p-6 shadow-[0_40px_100px_-30px_rgba(30,42,31,0.5)]">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      </div>
                      <div className="ml-2 h-5 flex-1 rounded-full bg-white/8" />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {['Cần làm', 'Đang thực hiện', 'Hoàn thành'].map((col, i) => (
                        <div key={col}>
                          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">{col}</p>
                          {Array.from({ length: 3 - i }).map((_, j) => (
                            <div key={j} className="mb-2 rounded-xl border border-white/8 bg-white/[0.05] p-3">
                              <div className="h-2 w-3/4 rounded-full bg-white/15" />
                              <div className="mt-2 h-1.5 w-1/2 rounded-full bg-white/8" />
                              <div className="mt-3 flex items-center gap-2">
                                <span className={`h-1.5 w-8 rounded-full ${i === 2 ? 'bg-[#8bc34a]/50' : i === 1 ? 'bg-[#ffd54f]/40' : 'bg-white/12'}`} />
                                <span className="h-4 w-4 rounded-full bg-white/10" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating AI chat bubble */}
                  <div className="hero-orb absolute -bottom-6 -left-10 rounded-2xl border border-[#c8d8b8] bg-white/95 p-4 shadow-[0_20px_50px_-15px_rgba(30,42,31,0.25)] backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e4f0d5]">
                        <Bot className="h-3.5 w-3.5 text-[#4a7c3f]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#1f2b1f]">AI Assistant</p>
                        <p className="text-[10px] text-[#6b7f62]">3 task có rủi ro trễ hạn</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating stat */}
                  <div className="hero-orb-2 absolute -right-4 top-[30%] rounded-2xl border border-[#c8d8b8] bg-white/95 px-4 py-3 shadow-[0_16px_40px_-12px_rgba(30,42,31,0.2)] backdrop-blur-md">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b7f62]">Hoàn thành tuần này</p>
                    <p className="font-newsreader mt-0.5 text-[28px] font-bold text-[#1f2b1f]">87<span className="text-[18px] text-[#5a8a3f]">%</span></p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-[#f4f7ed] to-transparent" />
        </section>

        {/* ═══════════════════════ LOGO MARQUEE ═══════════════════════ */}
        <section className="relative bg-[#f4f7ed] py-4">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8d9e82]">
            Được tin dùng bởi đội ngũ hàng đầu
          </p>
          <LogoMarquee />
        </section>

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section className="relative bg-[#f4f7ed] pb-24 pt-20">
          <div className="mx-auto max-w-[1280px] px-8 max-xl:px-6 max-sm:px-5">
            <div className="grid gap-20 lg:grid-cols-[0.45fr_0.55fr] lg:items-start">
              {/* Left — sticky heading */}
              <Reveal>
                <div className="lg:sticky lg:top-24">
                  <span className="inline-block rounded-full border border-[#c5d6b6] bg-[#e4f0d5]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4a6d3a]">
                    Tính năng
                  </span>
                  <h2 className="font-newsreader mt-5 text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.1] text-[#141e13]">
                    Mọi thứ để quản lý dự án<br />
                    <span className="text-[#4a7c3f]">hiệu quả và minh bạch.</span>
                  </h2>
                  <p className="mt-4 max-w-[380px] text-[15px] leading-[1.7] text-[#5a6e53]">
                    Từ Kanban realtime đến AI dự báo rủi ro — VSmart mang đến trải nghiệm toàn diện cho đội ngũ hiện đại.
                  </p>
                </div>
              </Reveal>

              {/* Right — staggered feature cards */}
              <div className="space-y-4">
                {features.map((feature, i) => (
                  <Reveal key={feature.title} delay={i * 80}>
                    <div className={`group relative rounded-[22px] border border-[#d4deca] bg-white/70 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-[0_16px_50px_-20px_rgba(40,60,35,0.18)] ${i % 2 === 1 ? 'lg:ml-12' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300"
                          style={{ backgroundColor: `${feature.accent}14`, color: feature.accent }}
                        >
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[17px] font-semibold text-[#1f2b1f]">{feature.title}</h3>
                          <p className="mt-1 text-[14px] leading-[1.7] text-[#5a6e53]">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ PROCESS ═══════════════════════ */}
        <section className="relative overflow-hidden bg-[#1e2a1f] py-24">
          {/* Subtle texture */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_20%,#2d4e2a_0%,transparent_60%)]" />

          <div className="relative z-10 mx-auto max-w-[1280px] px-8 max-xl:px-6 max-sm:px-5">
            <Reveal>
              <span className="inline-block rounded-full border border-white/15 bg-white/8 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                Cách thức hoạt động
              </span>
              <h2 className="font-newsreader mt-5 text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.1] text-white">
                Bắt đầu trong 4 bước đơn giản.
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step, i) => (
                <Reveal key={step.number} delay={i * 120}>
                  <div className="group relative">
                    {/* Step number */}
                    <div className="font-newsreader text-[64px] font-bold leading-none text-white/[0.06]">
                      {step.number}
                    </div>
                    <div className="mt-2">
                      <h3 className="text-[18px] font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-[14px] leading-[1.7] text-white/55">{step.description}</p>
                    </div>
                    {/* Connecting line */}
                    {i < processSteps.length - 1 && (
                      <div className="absolute right-0 top-8 hidden h-px w-6 bg-white/10 lg:block" style={{ right: '-12px' }} />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SOCIAL PROOF ═══════════════════════ */}
        <section className="relative bg-[#f4f7ed] py-24">
          <div className="mx-auto max-w-[1280px] px-8 max-xl:px-6 max-sm:px-5">
            <Reveal>
              <div className="text-center">
                <span className="inline-block rounded-full border border-[#c5d6b6] bg-[#e4f0d5]/60 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4a6d3a]">
                  Phản hồi cộng đồng
                </span>
                <h2 className="font-newsreader mx-auto mt-5 max-w-[500px] text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.1] text-[#141e13]">
                  Được tin dùng bởi những đội ngũ tốt nhất.
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.authorName} delay={i * 100}>
                  <div className={`relative rounded-[22px] border border-[#d4deca] bg-white/70 p-6 backdrop-blur-sm ${i === 1 ? 'md:-translate-y-4' : ''}`}>
                    {/* Large quotation mark */}
                    <span className="font-newsreader absolute -top-2 left-5 text-[72px] font-bold leading-none text-[#c5d6b6]/60">&ldquo;</span>

                    <p className="relative z-10 mt-6 text-[15px] italic leading-[1.75] text-[#3a4d38]">
                      {t.quote}
                    </p>

                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4f0d5] text-[13px] font-bold text-[#4a7c3f]">
                        {t.authorName[0]}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#1f2b1f]">{t.authorName}</p>
                        <p className="text-[12px] text-[#7b8f70]">{t.authorTitle}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ CTA ═══════════════════════ */}
        <section className="relative bg-[#f4f7ed] pb-24">
          <div className="mx-auto max-w-[1280px] px-8 max-xl:px-6 max-sm:px-5">
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#1e2a1f_0%,#2a3d2b_50%,#4a6d3a_100%)] px-10 py-16 max-sm:px-6 max-sm:py-10">
                {/* Decorative orbs */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#8bc34a]/15 blur-[60px]" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#bede8c]/10 blur-[40px]" />

                <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <h2 className="font-newsreader text-[clamp(2rem,3.5vw,2.8rem)] font-bold leading-[1.1] text-white">
                      Sẵn sàng nâng cấp cách đội ngũ bạn làm việc?
                    </h2>
                    <p className="mt-4 max-w-[420px] text-[15px] leading-[1.7] text-white/60">
                      Miễn phí, mã nguồn mở, không giới hạn thành viên. Triển khai trong 10 phút.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <Link
                        href="/login"
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[#d4f59f] px-7 py-3 text-[15px] font-semibold text-[#1c2b1b] transition hover:bg-[#c4ea8f] hover:shadow-[0_8px_30px_-8px_rgba(212,245,159,0.4)]"
                      >
                        Bắt đầu miễn phí
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        href="/docs"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[15px] font-medium text-white/80 transition hover:bg-white/8"
                      >
                        Xem Docs
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-3 max-lg:hidden">
                    {[
                      'AI Agent thực thi hành động trực tiếp',
                      'Kanban realtime với drag & drop',
                      'Dự báo rủi ro trễ hạn tự động',
                      'Governance flow cho doanh nghiệp',
                      'Mã nguồn mở, tùy chỉnh không giới hạn',
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-[14px] text-white/70">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8bc34a]/70" />
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer className="border-t border-[#d4deca] bg-[#f4f7ed] py-12">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-8 max-xl:px-6 max-sm:flex-col max-sm:gap-4 max-sm:px-5">
            <div className="flex items-center gap-2.5">
              <Image src="/assets/icons/logo-icon.svg" alt="VSmart" width={22} height={22} />
              <span className="text-[20px] font-semibold text-[#1f2b1f]">VSmart</span>
            </div>
            <div className="flex items-center gap-6 text-[14px] text-[#6b7f62]">
              <Link href="/docs" className="transition hover:text-[#1f2b1f]">Docs</Link>
              <a href="https://github.com/zaikaman/VSmart" target="_blank" rel="noreferrer" className="transition hover:text-[#1f2b1f]">GitHub</a>
            </div>
            <p className="text-[13px] text-[#8d9e82]">© 2025 VSmart. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
