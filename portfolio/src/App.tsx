import { useState } from 'react'
import { tools } from './data/tools'

// =============================================
// サイト設定
// =============================================
const SITE_NAME     = '福原｜AI業務サポート Official'
const CONTACT_MAILTO = 'mailto:tigers_number1@icloud.com'
const CONTACT_EMAIL  = 'tigers_number1@icloud.com'

// =============================================
// SVGアイコン
// =============================================
function IconArrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconExternal({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M6 2H2a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V8M8 1h5m0 0v5m0-5L6 8"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// =============================================
// セクション見出しコンポーネント
// =============================================
function SectionLabel({
  en, ja, light = false,
}: { en: string; ja: string; light?: boolean }) {
  return (
    <div className="mb-5">
      <p className={`text-[10px] font-bold tracking-[0.35em] uppercase ${
        light ? 'text-blue-300' : 'text-blue-500'
      }`}>
        {en}
      </p>
      <p className={`text-xs tracking-wide mt-0.5 ${
        light ? 'text-white/40' : 'text-gray-400'
      }`}>
        {ja}
      </p>
    </div>
  )
}

// =============================================
// Header
// =============================================
function Header() {
  const [open, setOpen] = useState(false)
  const links = [
    { en: 'About',   ja: '私について', href: '#about' },
    { en: 'Service', ja: 'できること',   href: '#service' },
    { en: 'Works',   ja: '制作実績',       href: '#works' },
    { en: 'Process', ja: '制作の流れ',     href: '#process' },
    { en: 'Profile', ja: 'プロフィール',   href: '#profile' },
  ]
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/96 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <a href="#" className="text-sm font-bold tracking-wide text-navy leading-tight">
          {SITE_NAME}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <a key={l.en} href={l.href}
              className="flex flex-col items-center hover:text-navy transition-colors group">
              <span className="text-[10px] font-bold tracking-widest text-gray-400
                group-hover:text-navy transition-colors uppercase">
                {l.en}
              </span>
              <span className="text-[9px] text-gray-300 group-hover:text-blue-400
                transition-colors tracking-wide mt-px">
                {l.ja}
              </span>
            </a>
          ))}
          <a href={CONTACT_MAILTO}
            className="text-[10px] font-bold tracking-widest bg-navy text-white
              px-5 py-2.5 hover:bg-navy-mid transition-colors uppercase ml-2">
            Contact
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(v => !v)} aria-label="メニュー"
          className="md:hidden p-2 text-gray-600">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {open ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="6"  x2="19" y2="6"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-6 flex flex-col gap-1">
          {links.map(l => (
            <a key={l.en} href={l.href} onClick={() => setOpen(false)}
              className="flex items-center justify-between py-3 border-b border-gray-50
                hover:text-navy transition-colors">
              <span className="text-sm font-semibold text-navy">{l.ja}</span>
              <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">
                {l.en}
              </span>
            </a>
          ))}
          <a href={CONTACT_MAILTO}
            className="mt-4 text-xs font-bold tracking-wider bg-navy text-white
              px-6 py-3.5 text-center uppercase">
            Contact / お問い合わせ
          </a>
        </div>
      )}
    </header>
  )
}

// =============================================
// 01. Hero
// =============================================
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* z=0: ベースグラデーション（常時表示） */}
      <div className="absolute inset-0 hero-bg-base" />

      {/* z=1: 背景動画 public/hero-video.mp4 */}
      <video
        autoPlay muted loop playsInline
        className="hero-video"
        aria-hidden="true"
      >
        <source src="/hero-video.mp4"  type="video/mp4" />
        <source src="/hero-video.webm" type="video/webm" />
      </video>

      {/* z=2: オーバーレイ（テキスト保護） */}
      <div className="hero-overlay" />

      {/* z=3: CSS装飾（グリッド・データライン・UIパネル）*/}
      <div className="hero-deco">
        <div className="hero-grid" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="data-line data-line-1" />
        <div className="data-line data-line-2" />
        <div className="data-line data-line-3" />
        <div className="data-line data-line-4" />
        <div className="ui-panel ui-panel-1" />
        <div className="ui-panel ui-panel-2" />
      </div>

      {/* z=10: コンテンツ */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-36 pb-24 w-full">
        <p className="text-[10px] font-bold tracking-[0.35em] text-blue-300 uppercase mb-8">
          AI Business Support
        </p>

        <h1 className="text-[2.6rem] sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white
          leading-[1.25] mb-8 max-w-3xl">
          <span className="block">AIとWebツールで、</span>
          <span className="block">現場業務を</span>
          <span className="block">前に進める。</span>
        </h1>

        <p className="text-sm sm:text-base text-gray-300 leading-[1.9] mb-12 max-w-lg">
          日々の記録、確認、情報整理、申し送りなどの業務を、
          使いやすい小規模Webツールとして形にします。
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a href="#works"
            className="inline-flex items-center justify-center gap-2.5 bg-white text-navy
              font-bold text-xs tracking-widest px-8 py-4 hover:bg-gray-100
              transition-colors uppercase">
            制作実績を見る
            <IconArrow />
          </a>
          <a href={CONTACT_MAILTO}
            className="inline-flex items-center justify-center gap-2.5
              border border-white/40 text-white font-bold text-xs tracking-widest
              px-8 py-4 hover:bg-white/10 hover:border-white/60 transition-colors uppercase">
            相談する
          </a>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10
        flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-[9px] tracking-[0.3em] text-white/30 uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  )
}

// =============================================
// 02. About
// =============================================
function About() {
  return (
    <section id="about" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel en="About" ja="私について" />
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-6 leading-tight">
              AIを活用した<br />業務改善ツール制作
            </h2>
            <div className="w-10 h-0.5 bg-blue-500 mb-8" />
            <p className="text-gray-600 leading-[1.9] mb-5">
              介護・不動産・事務作業など、現場の日常業務に特化した
              小規模Webツールを制作しています。
              記録、確認、共有、申し送りといった繰り返しの作業を、
              シンプルなWebアプリとして整理します。
            </p>
            <p className="text-gray-600 leading-[1.9]">
              いきなり大きなシステムを導入するのではなく、まず小さく動くものを作り、
              実際の業務に合わせて改善していくアプローチを大切にしています。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { num: '01', label: '現場に合わせた設計' },
              { num: '02', label: 'シンプルな操作性' },
              { num: '03', label: '小さく始める開発' },
              { num: '04', label: '実務を想定した改善' },
            ].map(item => (
              <div key={item.num}
                className="border border-gray-100 bg-gray-50 p-7">
                <p className="text-3xl font-bold text-gray-150 mb-4 leading-none
                  text-gray-200">{item.num}</p>
                <p className="text-sm font-semibold text-navy">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================
// 03. Service
// =============================================
function Service() {
  const services = [
    { num: '01', title: '業務ヒアリング',       body: '現場の作業内容や困りごとを丁寧に確認し、必要な機能と優先順位を整理します。' },
    { num: '02', title: '小規模Webツール制作',   body: '記録・管理・共有に特化した、シンプルで使いやすいWebアプリを制作します。' },
    { num: '03', title: '入力フォーム・管理画面', body: 'スプレッドシートで管理していた業務をWebツールとして整理・可視化します。' },
    { num: '04', title: '業務効率化の提案',       body: '現在の業務フローを見直し、手間を減らせる仕組みや導線をご提案します。' },
    { num: '05', title: 'AI活用による支援',       body: '文章の作成・整理・自動化など、AIを業務に組み込む支援を行います。' },
  ]
  return (
    <section id="service" className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <SectionLabel en="Service" ja="できること" />
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">できること</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
          {services.map(s => (
            <div key={s.num} className="bg-white p-10 flex flex-col gap-5">
              <span className="text-4xl font-bold text-gray-100 leading-none select-none">
                {s.num}
              </span>
              <h3 className="text-base font-bold text-navy">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-[1.8]">{s.body}</p>
            </div>
          ))}
          {/* グリッド調整 */}
          <div className="bg-gray-50 hidden lg:block" />
        </div>
      </div>
    </section>
  )
}

// =============================================
// 04. Works
// =============================================
function Works() {
  return (
    <section id="works" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <SectionLabel en="Works" ja="制作実績" />
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">制作実績</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <div key={tool.title}
              className="border border-gray-100 bg-white flex flex-col
                hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-0.5 bg-navy w-full" />
              <div className="p-8 flex flex-col gap-5 flex-1">
                <span className={`self-start text-[10px] font-bold tracking-wider px-3 py-1 ${
                  tool.status === '公開中'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {tool.status}
                </span>
                <h3 className="text-xl font-bold text-navy">{tool.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.8] flex-1">
                  {tool.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tool.tags.map(tag => (
                    <span key={tag}
                      className="text-xs text-gray-400 border border-gray-200 px-2.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  {tool.status === '公開中' && tool.link ? (
                    <a href={tool.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-navy
                        hover:text-blue-600 transition-colors tracking-wide">
                      ツールを見る
                      <IconExternal />
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-300 tracking-widest uppercase">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 追加予定カード */}
          <div className="border border-dashed border-gray-200 bg-gray-50/50 p-8
            flex flex-col items-center justify-center gap-3 min-h-[280px]">
            <div className="w-6 h-px bg-gray-300" />
            <p className="text-[10px] text-gray-300 tracking-widest uppercase">
              More Works Coming
            </p>
            <div className="w-6 h-px bg-gray-300" />
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================
// 05. Process
// =============================================
function Process() {
  const steps = [
    { num: '01', title: '現状業務の確認',          body: '今どんな作業をしているか、どこに時間や手間がかかっているかをヒアリングします。' },
    { num: '02', title: '課題と目的の整理',         body: '誰が・何を・どう管理したいのかを明確にし、必要な機能を絞り込みます。' },
    { num: '03', title: '小さく試せるツールを制作', body: 'まず動く形を作り、実際の画面や操作感を確認しながら進めます。' },
    { num: '04', title: '実際の運用を想定して改善', body: '使ってみて気づいた点を修正し、現場に合った形に仕上げていきます。' },
  ]
  return (
    <section id="process" className="py-32 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <SectionLabel en="Process" ja="制作の流れ" light />
          <h2 className="text-3xl sm:text-4xl font-bold text-white">制作の流れ</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {steps.map((step, i) => (
            <div key={step.num} className="relative flex flex-col gap-5">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-16 right-0
                  h-px bg-white/8" />
              )}
              <span className="text-5xl font-bold text-white/10 leading-none select-none">
                {step.num}
              </span>
              <div className="w-8 h-0.5 bg-blue-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-[1.8]">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// 06. Profile
// =============================================
function Profile() {
  return (
    <section id="profile" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <SectionLabel en="Profile" ja="プロフィール" />
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-6">
              プロフィール
            </h2>
            <div className="w-10 h-0.5 bg-blue-500" />
          </div>
          <div className="flex flex-col gap-5 text-gray-600 leading-[1.9] text-base
            lg:pt-16">
            <p>AIを活用した業務改善ツール制作に取り組んでいます。</p>
            <p>
              単に機能を作るだけでなく、誰が使うのか、何を達成したいのかを整理した上で、
              実務で使いやすい形にすることを重視しています。
            </p>
            <p>
              小規模な業務改善ツールから、実務に合わせた仕組みづくりまで対応できるよう
              学習・制作を進めています。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================
// 07. Contact
// =============================================
function Contact() {
  return (
    <section id="contact" className="py-32 bg-gray-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <SectionLabel en="Contact" ja="お問い合わせ" light />
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          お問い合わせ
        </h2>
        <p className="text-gray-400 leading-[1.9] mb-12 max-w-md mx-auto text-sm">
          相談や制作依頼はメールからお願いします。<br />
          小さな業務改善ツールからでも、お気軽にご連絡ください。
        </p>
        <a href={CONTACT_MAILTO}
          className="inline-flex items-center gap-3 bg-white text-navy font-bold
            text-xs tracking-widest px-10 py-4 hover:bg-gray-100
            transition-colors uppercase">
          メールで相談する
          <IconArrow />
        </a>
        <p className="text-gray-600 text-xs mt-8 tracking-wider">{CONTACT_EMAIL}</p>
      </div>
    </section>
  )
}

// =============================================
// Footer
// =============================================
function Footer() {
  return (
    <footer className="bg-navy py-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-12
        flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs font-bold text-white/60 tracking-wide">
          {SITE_NAME}
        </span>
        <a href={CONTACT_MAILTO}
          className="text-xs text-gray-500 hover:text-white transition-colors tracking-wider">
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  )
}

// =============================================
// App
// =============================================
export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Service />
        <Works />
        <Process />
        <Profile />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
