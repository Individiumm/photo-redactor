import { useEditor, ToolId } from '../state/editorStore'
import { canUndo, canRedo } from '../core/history'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'adjust', label: 'Улучшение' },
  { id: 'filters', label: 'Фильтры' },
  { id: 'background', label: 'Фон' },
  { id: 'heal', label: 'Лечащая кисть' },
  { id: 'transform', label: 'Кадр' },
]

function UndoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 6H9.5C11.4 6 13 7.6 13 9.5C13 11.4 11.4 13 9.5 13H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 3L3 6L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function RedoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12 6H5.5C3.6 6 2 7.6 2 9.5C2 11.4 3.6 13 5.5 13H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 3L12 6L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12.5 7.5A5 5 0 1 1 10.9 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 2.5V6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 7.5C1.5 7.5 4 3 7.5 3C11 3 13.5 7.5 13.5 7.5C13.5 7.5 11 12 7.5 12C4 12 1.5 7.5 1.5 7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export default function Toolbar() {
  const { activeTool, setTool, history, undo, redo, resetToOriginal, showBefore, setShowBefore } =
    useEditor()

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper/10 pb-4">
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`rounded-sm px-3.5 py-1.5 text-sm transition-colors duration-150 ${
              activeTool === t.id
                ? 'bg-clay/15 text-clay-strong'
                : 'text-paper/55 hover:bg-paper/5 hover:text-paper/85'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 text-paper/50">
        <button
          disabled={!history || !canUndo(history)}
          onClick={undo}
          title="Отменить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <UndoIcon />
        </button>
        <button
          disabled={!history || !canRedo(history)}
          onClick={redo}
          title="Повторить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <RedoIcon />
        </button>
        <button
          onClick={resetToOriginal}
          title="Сбросить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper"
        >
          <ResetIcon />
        </button>
        <span className="mx-1 h-4 w-px bg-paper/10" />
        <button
          onMouseDown={() => setShowBefore(true)}
          onMouseUp={() => setShowBefore(false)}
          onMouseLeave={() => setShowBefore(false)}
          title="Показать «до»"
          className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition-colors duration-150 ${
            showBefore ? 'bg-clay/15 text-clay-strong' : 'hover:bg-paper/5 hover:text-paper'
          }`}
        >
          <EyeIcon />
          <span className="hidden sm:inline">до / после</span>
        </button>
      </div>
    </div>
  )
}
