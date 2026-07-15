import { describe, it, expect } from 'vitest'
import { initHistory, pushHistory, undo, redo, canUndo, canRedo } from '../../src/core/history'

describe('history', () => {
  it('starts with no undo/redo', () => {
    const h = initHistory('a')
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe('a')
  })

  it('push then undo restores previous present', () => {
    let h = initHistory('a')
    h = pushHistory(h, 'b')
    expect(h.present).toBe('b')
    h = undo(h)
    expect(h.present).toBe('a')
    expect(canRedo(h)).toBe(true)
  })

  it('redo re-applies undone state', () => {
    let h = pushHistory(initHistory('a'), 'b')
    h = redo(undo(h))
    expect(h.present).toBe('b')
  })

  it('push clears the redo future', () => {
    let h = pushHistory(initHistory('a'), 'b')
    h = undo(h)
    h = pushHistory(h, 'c')
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe('c')
  })

  it('undo/redo at the edges are no-ops', () => {
    const h = initHistory('a')
    expect(undo(h).present).toBe('a')
    expect(redo(h).present).toBe('a')
  })
})
