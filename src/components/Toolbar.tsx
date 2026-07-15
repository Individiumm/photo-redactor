import { useEditor, ToolId } from '../state/editorStore'
import { canUndo, canRedo } from '../core/history'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'adjust', label: 'Улучшение' },
  { id: 'filters', label: 'Фильтры' },
  { id: 'background', label: 'Фон' },
  { id: 'heal', label: 'Лечащая кисть' },
  { id: 'transform', label: 'Кадр' },
]

export default function Toolbar() {
  const { activeTool, setTool, history, undo, redo, resetToOriginal, showBefore, setShowBefore } =
    useEditor()
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`px-3 py-1 rounded ${activeTool === t.id ? 'bg-indigo-600' : 'bg-neutral-800'}`}
        >
          {t.label}
        </button>
      ))}
      <span className="mx-2 h-5 w-px bg-neutral-700" />
      <button disabled={!history || !canUndo(history)} onClick={undo} className="px-3 py-1 rounded bg-neutral-800 disabled:opacity-40">← Отмена</button>
      <button disabled={!history || !canRedo(history)} onClick={redo} className="px-3 py-1 rounded bg-neutral-800 disabled:opacity-40">Повтор →</button>
      <button onClick={resetToOriginal} className="px-3 py-1 rounded bg-neutral-800">Сбросить</button>
      <button
        onMouseDown={() => setShowBefore(true)}
        onMouseUp={() => setShowBefore(false)}
        onMouseLeave={() => setShowBefore(false)}
        className={`px-3 py-1 rounded ${showBefore ? 'bg-amber-600' : 'bg-neutral-800'}`}
      >
        Показать «до»
      </button>
    </div>
  )
}
