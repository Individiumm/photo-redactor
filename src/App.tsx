import { useState } from 'react'
import { useEditor } from './state/editorStore'
import Uploader from './components/Uploader'
import CanvasPreview from './components/CanvasPreview'
import Toolbar from './components/Toolbar'
import AdjustPanel from './components/AdjustPanel'
import FiltersPanel from './components/FiltersPanel'
import BackgroundPanel from './components/BackgroundPanel'
import HealPanel from './components/HealPanel'
import TransformPanel from './components/TransformPanel'
import ExportBar from './components/ExportBar'
import BatchView from './components/BatchView'
import RestorePrompt from './components/RestorePrompt'
import { useSessionRestore } from './state/persistenceSync'

type Mode = 'editor' | 'batch'

export default function App() {
  const hasImage = useEditor((s) => s.history !== null)
  const tool = useEditor((s) => s.activeTool)
  const [mode, setMode] = useState<Mode>('editor')
  const restore = useSessionRestore()

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-6 animate-rise-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-paper/40">Домашняя фотостудия</p>
            <h1 className="mt-1 font-display text-3xl italic text-paper md:text-4xl">Фоторедактор</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1">
              <button
                onClick={() => setMode('editor')}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors duration-150 ${
                  mode === 'editor' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
                }`}
              >
                Редактор
              </button>
              <button
                onClick={() => setMode('batch')}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors duration-150 ${
                  mode === 'batch' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
                }`}
              >
                Пакетная обработка
              </button>
            </div>
            {mode === 'editor' && hasImage && <ExportBar />}
          </div>
        </header>

        {mode === 'batch' ? (
          <BatchView />
        ) : restore.status === 'checking' ? null : restore.status === 'found' ? (
          <RestorePrompt onRestore={restore.accept} onDiscard={restore.discard} />
        ) : !hasImage ? (
          <Uploader />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="animate-rise-in [animation-delay:80ms]">
              <Toolbar />
            </div>
            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
              <div className="order-2 md:order-1 animate-rise-in [animation-delay:140ms]">
                <CanvasPreview />
              </div>
              <aside className="order-1 md:order-2 h-fit rounded-md border border-paper/10 bg-ink-raised p-5 animate-rise-in [animation-delay:180ms]">
                {tool === 'adjust' && <AdjustPanel />}
                {tool === 'filters' && <FiltersPanel />}
                {tool === 'background' && <BackgroundPanel />}
                {tool === 'heal' && <HealPanel />}
                {tool === 'transform' && <TransformPanel />}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
