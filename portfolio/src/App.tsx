import { useState } from 'react'
import { tools, type Tool } from './data/tools'

// =============================================
// サイト全体の設定
// =============================================
const SITE_NAME = '福原｜AI業務サポート Official'

// 相談ボタンのリンク先（クラウドワークスやXのURLに変更してください）
const CONTACT_LINK = '#contact'

// =============================================
// Header
// =============================================
function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { label: '制作実績', href: '#works' },
    { label: '強み', href: '#strengths' },
    { label: '対応範囲', href: '#services' },
    { label: 'プロフィール', href: '#profile' },
    { label: '相談する', href: CONTACT_LINK, primary: true },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#" className="text-lg font-bold text-blue-900 leading-tight">
          {SITE_NAME}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) =>
            item.primary ? (
              <a
                key={item.label}
                href={item.href}
                className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-700 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="メニューを開く"
        >
          <div className="w-6 h-0.5 bg-current mb-1.5" />
          <div className="w-6 h-0.5 bg-current mb-1.5" />
          <div className="w-6 h-0.5 bg-current" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-base font-medium ${item.primary ? 'text-blue-700' : 'text-gray-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}

// =============================================
// Hero Section
// =============================================
function HeroSection() {
  return (
    <section className="bg-white py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-5 leading-snug">
          業務改善ツールの開発・運用支援
        </h1>
        <p className="text-xl text-blue-700 font-semibold mb-6">
          現場の課題を整理し、使いやすいWebツールとして形にします。
        </p>
        <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-2xl mx-auto">
          介護・不動産・事務作業など、日々の業務で発生する記録・管理・共有の手間を減らすためのツール開発を行っています。<br />
          小規模な業務改善ツールから、実務運用を想定したWebツールの試作・改善まで対応します。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#works"
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            制作実績を見る
          </a>
          <a
            href={CONTACT_LINK}
            className="border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            相談する
          </a>
        </div>
      </div>
    </section>
  )
}

// =============================================
// Works Section
// =============================================
function ToolCard({ tool }: { tool: Tool }) {
  const isLive = tool.status === '公開中'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-block bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          {tool.industry}
        </span>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            isLive
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {tool.status}
        </span>
      </div>

      <h3 className="text-xl font-bold text-gray-900">{tool.title}</h3>

      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">課題</p>
        <p className="text-sm text-gray-600 leading-relaxed">{tool.problem}</p>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">主な機能</p>
        <ul className="flex flex-col gap-1">
          {tool.features.map((f) => (
            <li key={f} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-2">
        {isLive && tool.link ? (
          <a
            href={tool.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
          >
            ツールを見る →
          </a>
        ) : (
          <span className="inline-block bg-gray-100 text-gray-400 font-semibold text-sm px-6 py-3 rounded-lg cursor-not-allowed">
            準備中
          </span>
        )}
      </div>
    </div>
  )
}

function WorksSection() {
  // industryを自動抽出してフィルターを生成
  const industries = ['すべて', ...Array.from(new Set(tools.map((t) => t.industry)))]
  const [activeFilter, setActiveFilter] = useState('すべて')

  const filtered = activeFilter === 'すべて' ? tools : tools.filter((t) => t.industry === activeFilter)

  return (
    <section id="works" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-blue-900 mb-4">制作実績・サンプルツール</h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
            実際の業務課題を想定し、記録・共有・管理をしやすくするためのWebツールを制作しています。<br />
            公開中のものはリンクから確認できます。
          </p>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setActiveFilter(ind)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeFilter === ind
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>

        {/* カード一覧 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {filtered.map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Strengths Section
// =============================================
function StrengthsSection() {
  const strengths = [
    {
      icon: '🔍',
      title: '現場の課題整理',
      body: 'いきなり作るのではなく、誰が・何に困っているのかを整理してから設計します。',
    },
    {
      icon: '🖥️',
      title: 'シンプルで使いやすい設計',
      body: '専門知識がなくても使いやすい、見やすい画面設計を意識しています。',
    },
    {
      icon: '⚡',
      title: '小規模ツールの素早い試作',
      body: 'まずは使える形にし、実際の業務に合わせて改善していく進め方を重視しています。',
    },
  ]

  return (
    <section id="strengths" className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
          業務改善ツール制作で大切にしていること
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strengths.map((s) => (
            <div key={s.title} className="bg-blue-50 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="text-lg font-bold text-blue-900 mb-3">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Services Section
// =============================================
function ServicesSection() {
  const services = [
    '業務管理ツールの試作',
    '入力フォーム・一覧画面の作成',
    '既存業務の整理',
    'スプレッドシート業務のWeb化',
    'スマホで確認しやすい画面設計',
    '小規模な社内ツール開発',
    '記録・共有・管理フローの整理',
    '業務に合わせた簡易Webアプリ制作',
  ]

  return (
    <section id="services" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">対応できること</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s) => (
            <div key={s} className="bg-white rounded-xl px-6 py-4 flex items-center gap-3 border border-gray-100 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-gray-800 font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Process Section
// =============================================
function ProcessSection() {
  const steps = [
    {
      step: 'STEP 1',
      title: '業務内容のヒアリング',
      body: '現在の作業内容や困っていることを整理します。',
    },
    {
      step: 'STEP 2',
      title: '必要な機能の整理',
      body: '誰が使うのか、何を管理したいのかを明確にします。',
    },
    {
      step: 'STEP 3',
      title: '試作品の作成',
      body: 'まずは小さく使える形にして、画面や機能を確認します。',
    },
    {
      step: 'STEP 4',
      title: '改善・調整',
      body: '実際の使い方に合わせて、見やすさや操作性を改善します。',
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">制作の進め方</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-xs font-bold text-blue-600 mb-2 tracking-wider">{s.step}</p>
                <h3 className="text-base font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 text-gray-300 text-2xl -translate-y-1/2">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================
// Profile Section
// =============================================
function ProfileSection() {
  return (
    <section id="profile" className="py-20 px-4 sm:px-6 bg-blue-900 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8">プロフィール</h2>
        <div className="text-blue-100 text-base leading-loose space-y-5 text-left sm:text-center">
          <p>
            AIを活用した業務改善ツールの開発・設計に取り組んでいます。<br />
            単にツールを作るだけではなく、実際に使う人の業務内容や課題を整理し、現場で使いやすい形に落とし込むことを重視しています。
          </p>
          <p>
            介護・不動産・事務作業など、記録・共有・管理が必要な業務を中心に、小規模なWebツールの開発支援を行っています。
          </p>
          <p>
            クラウドワークスや求人サイトでは、業務改善ツールの試作、入力フォーム作成、一覧管理画面の制作、スプレッドシート業務のWeb化などを中心に対応していきたいと考えています。
          </p>
        </div>
      </div>
    </section>
  )
}

// =============================================
// Contact Section
// =============================================
function ContactSection() {
  return (
    <section id="contact" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-blue-900 mb-5">業務に合わせたツール制作のご相談</h2>
        <p className="text-gray-600 leading-relaxed mb-10">
          小さな業務改善ツールから相談可能です。<br />
          まずは現在の作業内容や困っていることをお聞きし、必要な形をご提案します。
        </p>

        {/* =============================================
            相談ボタンのリンク先を変更する場合は
            下の href を編集してください。
            例：クラウドワークス、X、メールアドレスなど
            ============================================= */}
        <a
          href={CONTACT_LINK}
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-bold text-xl px-12 py-5 rounded-xl transition-colors shadow-md"
        >
          相談する
        </a>

        <p className="text-gray-400 text-xs mt-6">
          ※ クラウドワークス・X・メールなどのリンクに変更可能です
        </p>
      </div>
    </section>
  )
}

// =============================================
// Footer
// =============================================
function Footer() {
  return (
    <footer className="bg-blue-900 text-blue-200 py-8 px-4 text-center text-sm">
      <p className="font-semibold text-white mb-1">{SITE_NAME}</p>
      <p>業務改善ツールの開発・運用支援</p>
    </footer>
  )
}

// =============================================
// App (ページ全体の構成)
// =============================================
export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <WorksSection />
        <StrengthsSection />
        <ServicesSection />
        <ProcessSection />
        <ProfileSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
