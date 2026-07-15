import { useEditor } from './state/editorStore'
import Uploader from './components/Uploader'
import CanvasPreview from './components/CanvasPreview'

export default function App() {
  const hasImage = useEditor((s) => s.history !== null)
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-6">
      <h1 className="text-2xl font-semibold mb-6">Фоторедактор</h1>
      {hasImage ? <CanvasPreview /> : <Uploader />}
    </div>
  )
}
