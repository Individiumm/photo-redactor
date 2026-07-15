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
          className="rounded bg-neutral-800 py-2 text-sm hover:bg-neutral-700"
        >
          {f.name}
        </button>
      ))}
    </div>
  )
}
