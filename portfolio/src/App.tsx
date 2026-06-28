import { useState } from 'react'
import { tools } from './data/tools'

// =============================================
// サイト設定
// =============================================
const SITE_NAME = '福原｜AI業務サポート Official'
const CONTACT_EMAIL = 'gomesumauro204@gmail.com'
const CONTACT_MAILTO = 'mailto:tigers_number1@icloud.com'

// =============================================
// Header
// =============================================
function Header() {
  const [open, setOpen] = useState(false)
  const links = [
    { label: '制作実績', href: '#works' },
    { label: 'できること', href: '#services' },
    { label: 'プロフィール', href: '#profile' },
    { label: 'お問い合わせ', href: '#contact' },
  ]
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-sm font-bold tracking-wide text-navy">{SITE_NAME}</span>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-sm text-gray-500 hover:text-navy transition-colors">
              {l.label}
            </a>
          ))}
          <a href={CONTACT_MAILTO}
            className="text-sm font-semibold bg-navy text-white px-5 py-2 rounded-full hover:bg-navy-dark transition-colors">
            相談する
          </a>
        </nav>
        {/* mobile */}
        <button onClick={() => setOpen(v => !v)} className="md:hidden p-2 text-gray-500" aria-label="menu">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {open
              ? <><line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
              : <><line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
            }
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="text-sm text-gray-600 py-1">{l.label}</a>
          ))}
          <a href={CONTACT_MAILTO}
            className="text-sm font-semibold bg-navy text-white px-5 py-2.5 rounded-full text-center">
            相談する
          </a>
        </div>
      )}
    </header>
  )
}

// =============================================
// Hero
// =============================================
function Hero() {
  return (
    <section className="min-h-screen flex items-center bg-white pt-16">
      <div className="max-w-6xl mx-auto px-6 py-28 w-full">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-6">
            AI Business Support
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-8">
            AIを活用して、<br className="sm:hidden" />
            現場業務を<br />
            <span className="text-navy">わかりやすく、</span><br />
            使いやすいWebツールにします。
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-12 max-w-xl">
            介護・不動産・事務作業など、日々の業務に合わせた小規模Webツールの制作・運用支援を行っています。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#works"
              className="inline-flex items-center justify-center gap-2 bg-navy text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-navy-dark transition-colors">
              制作実績を見る
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href={CONTACT_MAILTO}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-base px-8 py-4 rounded-full hover:border-navy hover:text-navy transition-colors">
              相談する
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================
// Works
// =============================================
function Works() {
  return (
    <section id="works" className="py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-3">Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">制作実績・サンプルツール</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <div key={tool.title}
              className="bg-white rounded-2xl p-8 flex flex-col gap-5 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  tool.status === '公開中'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {tool.status}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{tool.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tool.tags.map(tag => (
                  <span key={tag} className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-auto">
                {tool.status === '公開中' && tool.link ? (
                  <a href={tool.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline">
                    ツールを見る
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                ) : (
                  <span className="text-sm text-gray-300 font-medium">準備中</span>
                )}
              </div>
            </div>
          ))}

          {/* 追加予告カード */}
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-3 border border-dashed border-gray-200 text-center min-h-[240px]">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="text-sm text-gray-400">順次追加予定</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================
// Services
// =============================================
function Services() {
  const items = [
    {
      icon: '💬',
      title: '業務ヒアリング',
      body: '現場の作業内容や困りごとを丁寧に確認し、課題を整理します。',
    },
    {
      icon: '🛠',
      title: '小規模Webツール制作',
      body: '記録・管理・共有に特化した、シンプルで使いやすいWebアプリを制作します。',
    },
    {
      icon: '📋',
      title: '入力フォーム・管理画面',
      body: 'スプレッドシートで管理していた業務を、Webツールとして整理・可視化します。',
    },
    {
      icon: '📈',
      title: '業務効率化の提案',
      body: '今の業務フローを見直し、手間を減らせる仕組みをご提案します。',
    },
    {
      icon: '🤖',
      title: 'AI活用支援',
      body: '文章作成・整理・自動化など、AIを使った業務サポートに対応します。',
    },
  ]
  return (
    <section id="services" className="py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-3">Services</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">できること</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.title} className="p-8 rounded-2xl bg-gray-50 flex flex-col gap-4">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Process
// =============================================
function Process() {
  const steps = [
    { num: '01', title: '現状の業務を確認', body: '今どんな作業をしているか、どこに手間がかかっているかをヒアリングします。' },
    { num: '02', title: '課題や目的を整理', body: '誰が・何を・どう管理したいのかを明確にし、必要な機能を絞り込みます。' },
    { num: '03', title: '小さく試せるWebツールを制作', body: 'まず使える形で試作し、実際の画面や操作感を確認します。' },
    { num: '04', title: '実際の運用を想定して改善', body: '使ってみてから気づいた点を修正し、現場に合った形に仕上げます。' },
  ]
  return (
    <section className="py-32 bg-navy">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase mb-3">Process</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">制作の流れ</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(step => (
            <div key={step.num} className="flex flex-col gap-4">
              <span className="text-4xl font-bold text-blue-400/40">{step.num}</span>
              <h3 className="text-base font-bold text-white">{step.title}</h3>
              <p className="text-sm text-blue-100/70 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Profile
// =============================================
function Profile() {
  return (
    <section id="profile" className="py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-3">Profile</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10">プロフィール</h2>
          <div className="flex flex-col gap-5 text-gray-600 leading-relaxed text-base">
            <p>AIを活用した業務改善ツール制作に取り組んでいます。</p>
            <p>現場で使いやすいこと、導入後に迷わず使えることを重視しています。</p>
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
// Contact
// =============================================
function Contact() {
  return (
    <section id="contact" className="py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-3">Contact</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">お問い合わせ</h2>
        <p className="text-gray-500 leading-relaxed mb-10">
          相談や制作依頼はメールからお願いします。<br />
          小さな業務改善ツールからでも、お気軽にご連絡ください。
        </p>
        <a href={CONTACT_MAILTO}
          className="inline-flex items-center gap-2 bg-navy text-white font-semibold text-base px-10 py-4 rounded-full hover:bg-navy-dark transition-colors mb-8">
          メールで相談する
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </a>
        <p className="text-sm text-gray-400">{CONTACT_EMAIL}</p>
      </div>
    </section>
  )
}

// =============================================
// Footer
// =============================================
function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-bold text-navy">{SITE_NAME}</span>
        <span className="text-xs text-gray-400">業務改善ツールの開発・運用支援</span>
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
        <Works />
        <Services />
        <Process />
        <Profile />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
