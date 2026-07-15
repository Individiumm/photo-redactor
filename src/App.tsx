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

export default function App() {
  const hasImage = useEditor((s) => s.history !== null)
  const tool = useEditor((s) => s.activeTool)

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Фоторедактор</h1>
        {hasImage && <ExportBar />}
      </header>

      {!hasImage ? (
        <Uploader />
      ) : (
        <div className="flex flex-col gap-4">
          <Toolbar />
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="order-2 md:order-1"><CanvasPreview /></div>
            <aside className="order-1 md:order-2 rounded-xl bg-neutral-800/50 p-4">
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
  )
}
