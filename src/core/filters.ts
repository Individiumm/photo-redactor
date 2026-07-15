import { Pixels, clonePixels } from './pixels'
import { grayscale, contrast, saturation, warmth, brightness } from './adjust'

export interface FilterPreset {
  id: string
  name: string
  apply(p: Pixels): Pixels
}

export const PRESETS: FilterPreset[] = [
  { id: 'original', name: 'Оригинал', apply: (p) => clonePixels(p) },
  { id: 'noir', name: 'Нуар', apply: (p) => contrast(grayscale(p), 25) },
  { id: 'vintage', name: 'Винтаж', apply: (p) => saturation(warmth(contrast(p, -15), 35), -20) },
  { id: 'warm', name: 'Тёплый', apply: (p) => saturation(warmth(p, 45), 10) },
  { id: 'cool', name: 'Холодный', apply: (p) => saturation(warmth(p, -45), 10) },
  { id: 'cinema', name: 'Кино', apply: (p) => saturation(contrast(warmth(p, 15), 25), 15) },
  { id: 'matte', name: 'Матовый', apply: (p) => contrast(brightness(p, 8), -25) },
]

export function getPreset(id: string): FilterPreset | undefined {
  return PRESETS.find((f) => f.id === id)
}
