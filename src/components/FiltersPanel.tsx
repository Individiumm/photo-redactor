import { useEditor } from '../state/editorStore'
import { PRESETS } from '../core/filters'

export default function FiltersPanel() {
  const { current, commit } = useEditor()
  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((f) => (
        <button
          key={f.id}
          onClick={() => {
            const p = current()
            if (p) commit(f.apply(p))
          }}
          className="rounded-sm border border-paper/10 py-2.5 text-sm text-paper/75 transition-colors duration-150 hover:border-clay/40 hover:text-clay-strong"
        >
          {f.name}
        </button>
      ))}
    </div>
  )
}
