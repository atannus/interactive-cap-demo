import './App.css'

function PositionBox({ lang, title }: { lang: 'ts' | 'py'; title: string }) {
  return (
    <div className="position-box">
      <div className="box-header">
        <span className={`box-badge ${lang}`}>{lang === 'ts' ? 'TypeScript' : 'Python'}</span>
        <span className="box-title">{title}</span>
      </div>
      <div className="box-canvas" />
    </div>
  )
}

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          Over<span>·</span>Engineering
        </div>
        <nav>
          <a href="#" className="active">App</a>
          <a href="#">About</a>
        </nav>
      </header>
      <main className="main">
        <PositionBox lang="ts" title="NestJS" />
        <PositionBox lang="py" title="FastAPI" />
      </main>
    </div>
  )
}
