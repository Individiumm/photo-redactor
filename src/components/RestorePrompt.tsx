interface Props {
  onRestore: () => void
  onDiscard: () => void
}

export default function RestorePrompt({ onRestore, onDiscard }: Props) {
  return (
    <div className="animate-rise-in flex flex-col items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 px-8 py-16 text-center">
      <p className="font-display text-xl italic text-paper/90">Есть незавершённая работа</p>
      <p className="mt-2 max-w-sm text-sm text-paper/50">
        Нашли фото, которое вы редактировали в прошлый раз. Продолжить с того места?
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onRestore}
          className="rounded-sm bg-clay px-5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong"
        >
          Продолжить
        </button>
        <button
          onClick={onDiscard}
          className="rounded-sm border border-paper/15 px-5 py-2 text-sm text-paper/70 transition-colors duration-150 hover:border-paper/30"
        >
          Начать заново
        </button>
      </div>
    </div>
  )
}
