# Фоторедактор — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Клиентский веб-редактор фото (React SPA), который в браузере удаляет/меняет фон, улучшает и фильтрует изображение, убирает мелкие объекты лечащей кистью, кадрирует и экспортирует — бесплатно, без бэкенда.

**Architecture:** Всё ядро обработки — чистые функции над типом `Pixels` (`{ data, width, height }`), не зависящие от DOM и потому тестируемые в Node. UI-компоненты и «тяжёлые» модули (фон, inpaint, экспорт) — тонкие обёртки поверх этого ядра. Единый источник истины — zustand-стор с историей `History<Pixels>` (undo/redo). Инструменты не знают друг о друге: читают текущее изображение из стора и коммитят новое.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind CSS 3, zustand (стор), Vitest (тесты), `@imgly/background-removal` (удаление фона, WASM), ~~`@techstark/opencv-js` (inpaint)~~ — **см. addendum ниже: заменён на собственный алгоритм.**

## Addendum (после Task 12): замена `@techstark/opencv-js`

При ручной проверке в реальном браузере (после исправления бага координат в
`HealPanel.tsx`, commit `bf2d645`) обнаружилось, что `@techstark/opencv-js`
(версии `4.10.0-release.1` и `4.9.0-release.3`) не инициализируется — промис
готовности модуля не резолвится за 90+ секунд ни в браузере, ни в Node. Это
делает лечащую кисть полностью нерабочей независимо от UI-кода.

По решению пользователя `src/modules/heal.ts` переписан (commit `29d4d9d`) на
собственный чистый JS-алгоритм диффузии (bounding-box-limited Gauss-Seidel
relaxation, приближение уравнения Лапласа) без внешних зависимостей — той же
формы `inpaint(p: Pixels, mask: Mask): Promise<Pixels>`, с тем же контрактом
`EMPTY_MASK`. Зависимость `@techstark/opencv-js` удалена из `package.json`.
Дизайн-спека (`docs/superpowers/specs/2026-07-14-photo-editor-design.md`)
обновлена соответственно.

Тексты Task 9 и Task 12 ниже (включая File Structure и упоминания opencv)
оставлены как есть для истории хода разработки — они не отражают финальную
реализацию. Актуальный код: `src/modules/heal.ts`. Актуальные тесты:
`tests/modules/heal.test.ts` (полностью реальные, без моков opencv).

## Global Constraints

- Node.js >= 18.
- TypeScript strict-режим включён (`"strict": true`).
- Бэкенда нет. Ни одно изображение не отправляется по сети. Все зависимости работают в браузере клиента.
- Ядро обработки (`src/core/**`, `src/modules/transform.ts`) — **чистые функции без обращения к `document`/`window`/`canvas`**, чтобы тесты шли в Node без jsdom-canvas.
- Тип обмена данными между всеми инструментами — `Pixels` из `src/core/pixels.ts`.
- Каждый шаг с кодом показывает полный код. Частые коммиты после каждой задачи.
- UI и весь пользовательский текст — на русском языке.

---

## File Structure

```
src/
  main.tsx                     # точка входа React
  App.tsx                      # общий layout: превью + панель инструментов
  index.css                    # Tailwind-директивы
  core/
    pixels.ts                  # тип Pixels + чистые помощники (clone/create/equalsSize)
    adjust.ts                  # brightness/contrast/saturation/warmth/sharpen/grayscale/autoEnhance
    filters.ts                 # реестр трендовых пресетов
    history.ts                 # generic History<T>: undo/redo
    canvas.ts                  # БРАУЗЕРНЫЕ мосты Pixels<->Canvas/File (не тестируется в Node)
  modules/
    transform.ts               # чистые crop/rotate90/resize + пресеты кадрирования
    background.ts              # обёртка @imgly + композиция фона
    heal.ts                    # обёртка opencv.js cv.inpaint
    exporter.ts                # Pixels -> PNG/JPG download
  state/
    editorStore.ts             # zustand: History<Pixels> + действия
  components/
    Uploader.tsx
    CanvasPreview.tsx          # рисует Pixels, режим «до/после»
    Toolbar.tsx                # выбор активного инструмента
    AdjustPanel.tsx
    FiltersPanel.tsx
    BackgroundPanel.tsx
    HealPanel.tsx              # рисование маски кистью
    TransformPanel.tsx
    ExportBar.tsx
tests/
  core/pixels.test.ts
  core/adjust.test.ts
  core/filters.test.ts
  core/history.test.ts
  modules/transform.test.ts
  modules/exporter.test.ts
```

---

## Task 0: Scaffolding проекта

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`, `vitest.config.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: —
- Produces: рабочий Vite+React+TS+Tailwind проект; команды `npm run dev`, `npm run build`, `npm test`.

- [ ] **Step 1: Инициализировать git и создать `.gitignore`**

```bash
git init
```

`.gitignore`:
```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 2: Создать `package.json`**

```json
{
  "name": "photo-editor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5",
    "@imgly/background-removal": "^1.5.5",
    "@techstark/opencv-js": "4.10.0-release.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Создать конфиги**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
})
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node' },
})
```

`postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Создать входные файлы приложения**

`index.html`:
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Фоторедактор</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="min-h-screen bg-neutral-900 text-neutral-100">Фоторедактор</div>
}
```

- [ ] **Step 5: Написать дымовой тест**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('math works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Установить и проверить**

Run: `npm install && npm test`
Expected: тест `smoke` проходит (1 passed).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite+react+ts+tailwind photo editor"
```

---

## Task 1: Ядро — тип Pixels

**Files:**
- Create: `src/core/pixels.ts`
- Test: `tests/core/pixels.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface Pixels { data: Uint8ClampedArray; width: number; height: number }`
  - `createPixels(width: number, height: number): Pixels` — прозрачное изображение (все нули).
  - `clonePixels(p: Pixels): Pixels` — глубокая копия.
  - `getPixel(p: Pixels, x: number, y: number): [number, number, number, number]`
  - `setPixel(p: Pixels, x: number, y: number, rgba: [number, number, number, number]): void`

- [ ] **Step 1: Написать падающий тест**

`tests/core/pixels.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPixels, clonePixels, getPixel, setPixel } from '../../src/core/pixels'

describe('pixels', () => {
  it('createPixels makes transparent buffer of right size', () => {
    const p = createPixels(2, 3)
    expect(p.width).toBe(2)
    expect(p.height).toBe(3)
    expect(p.data.length).toBe(2 * 3 * 4)
    expect([...p.data].every((v) => v === 0)).toBe(true)
  })

  it('setPixel/getPixel round-trip', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [10, 20, 30, 40])
    expect(getPixel(p, 0, 0)).toEqual([10, 20, 30, 40])
  })

  it('clonePixels is a deep copy', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [1, 2, 3, 4])
    const c = clonePixels(p)
    setPixel(c, 0, 0, [9, 9, 9, 9])
    expect(getPixel(p, 0, 0)).toEqual([1, 2, 3, 4])
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/core/pixels.test.ts`
Expected: FAIL (модуль `pixels` не найден).

- [ ] **Step 3: Реализовать**

`src/core/pixels.ts`:
```ts
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function createPixels(width: number, height: number): Pixels {
  return { data: new Uint8ClampedArray(width * height * 4), width, height }
}

export function clonePixels(p: Pixels): Pixels {
  return { data: new Uint8ClampedArray(p.data), width: p.width, height: p.height }
}

export function getPixel(p: Pixels, x: number, y: number): [number, number, number, number] {
  const i = (y * p.width + x) * 4
  return [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]]
}

export function setPixel(
  p: Pixels,
  x: number,
  y: number,
  rgba: [number, number, number, number],
): void {
  const i = (y * p.width + x) * 4
  p.data[i] = rgba[0]
  p.data[i + 1] = rgba[1]
  p.data[i + 2] = rgba[2]
  p.data[i + 3] = rgba[3]
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/core/pixels.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/core/pixels.ts tests/core/pixels.test.ts
git commit -m "feat: add Pixels core type and helpers"
```

---

## Task 2: Ядро — коррекции (adjust)

**Files:**
- Create: `src/core/adjust.ts`
- Test: `tests/core/adjust.test.ts`

**Interfaces:**
- Consumes: `Pixels`, `clonePixels` из `src/core/pixels.ts`.
- Produces (все возвращают **новый** `Pixels`, не мутируют вход):
  - `interface AdjustSettings { brightness: number; contrast: number; saturation: number; warmth: number; sharpness: number }` (все 0 = без изменений, диапазон -100..100, sharpness 0..100)
  - `const NEUTRAL_ADJUST: AdjustSettings`
  - `brightness(p: Pixels, amount: number): Pixels`
  - `contrast(p: Pixels, amount: number): Pixels`
  - `saturation(p: Pixels, amount: number): Pixels`
  - `warmth(p: Pixels, amount: number): Pixels`
  - `grayscale(p: Pixels): Pixels`
  - `sharpen(p: Pixels, amount: number): Pixels`
  - `applyAdjustments(p: Pixels, s: AdjustSettings): Pixels`
  - `autoEnhance(p: Pixels): Pixels`

- [ ] **Step 1: Написать падающий тест**

`tests/core/adjust.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import {
  brightness, contrast, saturation, warmth, grayscale,
  applyAdjustments, autoEnhance, NEUTRAL_ADJUST,
} from '../../src/core/adjust'

function solid(r: number, g: number, b: number, a = 255) {
  const p = createPixels(1, 1)
  setPixel(p, 0, 0, [r, g, b, a])
  return p
}

describe('adjust', () => {
  it('brightness lightens and does not mutate input', () => {
    const p = solid(100, 100, 100)
    const out = brightness(p, 50)
    expect(getPixel(out, 0, 0)[0]).toBeGreaterThan(100)
    expect(getPixel(p, 0, 0)[0]).toBe(100)
  })

  it('brightness clamps at 255', () => {
    const out = brightness(solid(250, 250, 250), 100)
    expect(getPixel(out, 0, 0)[0]).toBe(255)
  })

  it('grayscale equalizes channels', () => {
    const [r, g, b] = getPixel(grayscale(solid(255, 0, 0)), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('warmth adds red and removes blue', () => {
    const [r, , b] = getPixel(warmth(solid(100, 100, 100), 100), 0, 0)
    expect(r).toBeGreaterThan(100)
    expect(b).toBeLessThan(100)
  })

  it('saturation 0 keeps a gray pixel gray', () => {
    const [r, g, b] = getPixel(saturation(solid(120, 120, 120), 100), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('contrast pushes mid values away from 128', () => {
    const out = contrast(solid(200, 200, 200), 50)
    expect(getPixel(out, 0, 0)[0]).toBeGreaterThan(200)
  })

  it('applyAdjustments with NEUTRAL keeps pixel unchanged', () => {
    const out = applyAdjustments(solid(77, 88, 99), NEUTRAL_ADJUST)
    expect(getPixel(out, 0, 0)).toEqual([77, 88, 99, 255])
  })

  it('autoEnhance stretches a low-contrast gradient', () => {
    const p = createPixels(2, 1)
    setPixel(p, 0, 0, [100, 100, 100, 255])
    setPixel(p, 1, 0, [150, 150, 150, 255])
    const out = autoEnhance(p)
    expect(getPixel(out, 0, 0)[0]).toBeLessThan(100)
    expect(getPixel(out, 1, 0)[0]).toBeGreaterThan(150)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/core/adjust.test.ts`
Expected: FAIL (модуль `adjust` не найден).

- [ ] **Step 3: Реализовать**

`src/core/adjust.ts`:
```ts
import { Pixels, clonePixels } from './pixels'

export interface AdjustSettings {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  sharpness: number
}

export const NEUTRAL_ADJUST: AdjustSettings = {
  brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0,
}

function mapChannels(p: Pixels, fn: (r: number, g: number, b: number) => [number, number, number]): Pixels {
  const out = clonePixels(p)
  for (let i = 0; i < out.data.length; i += 4) {
    const [r, g, b] = fn(out.data[i], out.data[i + 1], out.data[i + 2])
    out.data[i] = r
    out.data[i + 1] = g
    out.data[i + 2] = b
  }
  return out
}

export function brightness(p: Pixels, amount: number): Pixels {
  const add = (amount / 100) * 255
  return mapChannels(p, (r, g, b) => [r + add, g + add, b + add])
}

export function contrast(p: Pixels, amount: number): Pixels {
  const c = (amount / 100) * 128
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  const f = (v: number) => factor * (v - 128) + 128
  return mapChannels(p, (r, g, b) => [f(r), f(g), f(b)])
}

export function saturation(p: Pixels, amount: number): Pixels {
  const s = 1 + amount / 100
  return mapChannels(p, (r, g, b) => {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    return [gray + (r - gray) * s, gray + (g - gray) * s, gray + (b - gray) * s]
  })
}

export function warmth(p: Pixels, amount: number): Pixels {
  const d = (amount / 100) * 40
  return mapChannels(p, (r, g, b) => [r + d, g, b - d])
}

export function grayscale(p: Pixels): Pixels {
  return mapChannels(p, (r, g, b) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    return [y, y, y]
  })
}

export function sharpen(p: Pixels, amount: number): Pixels {
  if (amount <= 0) return clonePixels(p)
  const s = amount / 100
  const out = clonePixels(p)
  const { width: w, height: h, data } = p
  const at = (x: number, y: number, c: number) => {
    const cx = Math.min(w - 1, Math.max(0, x))
    const cy = Math.min(h - 1, Math.max(0, y))
    return data[(cy * w + cx) * 4 + c]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = at(x, y, c)
        const lap =
          center * (1 + 4 * s) -
          s * (at(x - 1, y, c) + at(x + 1, y, c) + at(x, y - 1, c) + at(x, y + 1, c))
        out.data[i + c] = lap
      }
    }
  }
  return out
}

export function applyAdjustments(p: Pixels, s: AdjustSettings): Pixels {
  let out = p
  if (s.brightness !== 0) out = brightness(out, s.brightness)
  if (s.contrast !== 0) out = contrast(out, s.contrast)
  if (s.saturation !== 0) out = saturation(out, s.saturation)
  if (s.warmth !== 0) out = warmth(out, s.warmth)
  if (s.sharpness !== 0) out = sharpen(out, s.sharpness)
  return out === p ? clonePixels(p) : out
}

export function autoEnhance(p: Pixels): Pixels {
  let min = 255
  let max = 0
  for (let i = 0; i < p.data.length; i += 4) {
    const y = 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]
    if (y < min) min = y
    if (y > max) max = y
  }
  if (max - min < 1) return clonePixels(p)
  const scale = 255 / (max - min)
  return mapChannels(p, (r, g, b) => [(r - min) * scale, (g - min) * scale, (b - min) * scale])
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/core/adjust.test.ts`
Expected: PASS (8 passed).

- [ ] **Step 5: Commit**

```bash
git add src/core/adjust.ts tests/core/adjust.test.ts
git commit -m "feat: add pixel adjustment core (brightness/contrast/saturation/warmth/sharpen/auto)"
```

---

## Task 3: Ядро — трендовые фильтры (presets)

**Files:**
- Create: `src/core/filters.ts`
- Test: `tests/core/filters.test.ts`

**Interfaces:**
- Consumes: `Pixels`; `grayscale`, `contrast`, `saturation`, `warmth`, `brightness` из `src/core/adjust.ts`.
- Produces:
  - `interface FilterPreset { id: string; name: string; apply(p: Pixels): Pixels }`
  - `const PRESETS: FilterPreset[]` — минимум: `original`, `noir`, `vintage`, `warm`, `cool`, `cinema`, `matte`.
  - `getPreset(id: string): FilterPreset | undefined`

- [ ] **Step 1: Написать падающий тест**

`tests/core/filters.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { PRESETS, getPreset } from '../../src/core/filters'

function solid(r: number, g: number, b: number) {
  const p = createPixels(1, 1)
  setPixel(p, 0, 0, [r, g, b, 255])
  return p
}

describe('filters', () => {
  it('exposes named presets with stable ids', () => {
    const ids = PRESETS.map((f) => f.id)
    expect(ids).toContain('noir')
    expect(ids).toContain('vintage')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('original preset returns an equal-looking pixel', () => {
    const out = getPreset('original')!.apply(solid(50, 100, 150))
    expect(getPixel(out, 0, 0)).toEqual([50, 100, 150, 255])
  })

  it('noir makes the image grayscale', () => {
    const [r, g, b] = getPixel(getPreset('noir')!.apply(solid(200, 50, 10)), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('every preset preserves dimensions and alpha', () => {
    for (const preset of PRESETS) {
      const out = preset.apply(solid(120, 120, 120))
      expect(out.width).toBe(1)
      expect(getPixel(out, 0, 0)[3]).toBe(255)
    }
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/core/filters.test.ts`
Expected: FAIL (модуль `filters` не найден).

- [ ] **Step 3: Реализовать**

`src/core/filters.ts`:
```ts
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
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/core/filters.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/core/filters.ts tests/core/filters.test.ts
git commit -m "feat: add trendy filter presets"
```

---

## Task 4: Ядро — история (undo/redo)

**Files:**
- Create: `src/core/history.ts`
- Test: `tests/core/history.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface History<T> { past: T[]; present: T; future: T[] }`
  - `initHistory<T>(present: T): History<T>`
  - `pushHistory<T>(h: History<T>, next: T): History<T>` (очищает future)
  - `undo<T>(h: History<T>): History<T>`
  - `redo<T>(h: History<T>): History<T>`
  - `canUndo<T>(h: History<T>): boolean`
  - `canRedo<T>(h: History<T>): boolean`

- [ ] **Step 1: Написать падающий тест**

`tests/core/history.test.ts`:
```ts
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
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/core/history.test.ts`
Expected: FAIL (модуль `history` не найден).

- [ ] **Step 3: Реализовать**

`src/core/history.ts`:
```ts
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

export function pushHistory<T>(h: History<T>, next: T): History<T> {
  return { past: [...h.past, h.present], present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  const previous = h.past[h.past.length - 1]
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
  }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  const next = h.future[0]
  return {
    past: [...h.past, h.present],
    present: next,
    future: h.future.slice(1),
  }
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/core/history.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add src/core/history.ts tests/core/history.test.ts
git commit -m "feat: add generic undo/redo history"
```

---

## Task 5: Ядро — трансформации (crop/rotate/resize)

**Files:**
- Create: `src/modules/transform.ts`
- Test: `tests/modules/transform.test.ts`

**Interfaces:**
- Consumes: `Pixels`, `createPixels`, `getPixel`, `setPixel` из `src/core/pixels.ts`.
- Produces (все возвращают новый `Pixels`):
  - `crop(p: Pixels, x: number, y: number, w: number, h: number): Pixels`
  - `rotate90(p: Pixels, dir: 'cw' | 'ccw'): Pixels`
  - `resize(p: Pixels, w: number, h: number): Pixels` (билинейная интерполяция)
  - `interface AspectPreset { id: string; name: string; ratio: number | null }` (null = свободный)
  - `const ASPECTS: AspectPreset[]` — `free`, `1:1`, `4:5`, `16:9`, `9:16`.

- [ ] **Step 1: Написать падающий тест**

`tests/modules/transform.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { crop, rotate90, resize, ASPECTS } from '../../src/modules/transform'

function grid2x2() {
  const p = createPixels(2, 2)
  setPixel(p, 0, 0, [10, 0, 0, 255])
  setPixel(p, 1, 0, [20, 0, 0, 255])
  setPixel(p, 0, 1, [30, 0, 0, 255])
  setPixel(p, 1, 1, [40, 0, 0, 255])
  return p
}

describe('transform', () => {
  it('crop extracts a sub-rectangle', () => {
    const out = crop(grid2x2(), 1, 0, 1, 2)
    expect(out.width).toBe(1)
    expect(out.height).toBe(2)
    expect(getPixel(out, 0, 0)[0]).toBe(20)
    expect(getPixel(out, 0, 1)[0]).toBe(40)
  })

  it('rotate90 cw swaps dimensions and moves top-left to top-right', () => {
    const out = rotate90(grid2x2(), 'cw')
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    expect(getPixel(out, 1, 0)[0]).toBe(10)
  })

  it('resize changes dimensions', () => {
    const out = resize(grid2x2(), 4, 4)
    expect(out.width).toBe(4)
    expect(out.height).toBe(4)
    expect(getPixel(out, 0, 0)[3]).toBe(255)
  })

  it('exposes aspect presets', () => {
    expect(ASPECTS.map((a) => a.id)).toContain('1:1')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/modules/transform.test.ts`
Expected: FAIL (модуль `transform` не найден).

- [ ] **Step 3: Реализовать**

`src/modules/transform.ts`:
```ts
import { Pixels, createPixels, getPixel, setPixel } from '../core/pixels'

export function crop(p: Pixels, x: number, y: number, w: number, h: number): Pixels {
  const out = createPixels(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      setPixel(out, i, j, getPixel(p, x + i, y + j))
    }
  }
  return out
}

export function rotate90(p: Pixels, dir: 'cw' | 'ccw'): Pixels {
  const out = createPixels(p.height, p.width)
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const rgba = getPixel(p, x, y)
      if (dir === 'cw') setPixel(out, p.height - 1 - y, x, rgba)
      else setPixel(out, y, p.width - 1 - x, rgba)
    }
  }
  return out
}

export function resize(p: Pixels, w: number, h: number): Pixels {
  const out = createPixels(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const sx = ((i + 0.5) * p.width) / w - 0.5
      const sy = ((j + 0.5) * p.height) / h - 0.5
      const x0 = Math.max(0, Math.floor(sx))
      const y0 = Math.max(0, Math.floor(sy))
      const x1 = Math.min(p.width - 1, x0 + 1)
      const y1 = Math.min(p.height - 1, y0 + 1)
      const fx = sx - x0
      const fy = sy - y0
      const c00 = getPixel(p, x0, y0)
      const c10 = getPixel(p, x1, y0)
      const c01 = getPixel(p, x0, y1)
      const c11 = getPixel(p, x1, y1)
      const out4: [number, number, number, number] = [0, 0, 0, 0]
      for (let c = 0; c < 4; c++) {
        const top = c00[c] * (1 - fx) + c10[c] * fx
        const bot = c01[c] * (1 - fx) + c11[c] * fx
        out4[c] = top * (1 - fy) + bot * fy
      }
      setPixel(out, i, j, out4)
    }
  }
  return out
}

export interface AspectPreset {
  id: string
  name: string
  ratio: number | null
}

export const ASPECTS: AspectPreset[] = [
  { id: 'free', name: 'Свободно', ratio: null },
  { id: '1:1', name: 'Квадрат 1:1', ratio: 1 },
  { id: '4:5', name: 'Пост 4:5', ratio: 4 / 5 },
  { id: '16:9', name: 'Широкий 16:9', ratio: 16 / 9 },
  { id: '9:16', name: 'Сторис 9:16', ratio: 9 / 16 },
]
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/modules/transform.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/modules/transform.ts tests/modules/transform.test.ts
git commit -m "feat: add crop/rotate/resize transforms"
```

---

## Task 6: Браузерные мосты Canvas <-> Pixels

**Files:**
- Create: `src/core/canvas.ts`

**Interfaces:**
- Consumes: `Pixels`, `createPixels` из `src/core/pixels.ts`.
- Produces (браузер-only, тестируется вручную в UI-задачах):
  - `fileToPixels(file: File): Promise<Pixels>` — читает файл-изображение, возвращает Pixels; при ошибке декодирования — throw `Error('NOT_AN_IMAGE')`.
  - `pixelsToImageData(p: Pixels): ImageData`
  - `pixelsToCanvas(p: Pixels): HTMLCanvasElement`
  - `pixelsToBlob(p: Pixels, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob>`
  - `MAX_DIMENSION = 2000` и `downscaleIfNeeded(p: Pixels): Pixels` (использует `resize` из transform).

- [ ] **Step 1: Реализовать (без юнит-теста — DOM/Canvas недоступны в Node; проверка ручная в Task 9/10)**

`src/core/canvas.ts`:
```ts
import { Pixels, createPixels } from './pixels'
import { resize } from '../modules/transform'

export const MAX_DIMENSION = 2000

export function pixelsToImageData(p: Pixels): ImageData {
  return new ImageData(new Uint8ClampedArray(p.data), p.width, p.height)
}

export function pixelsToCanvas(p: Pixels): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = p.width
  canvas.height = p.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(pixelsToImageData(p), 0, 0)
  return canvas
}

export function downscaleIfNeeded(p: Pixels): Pixels {
  const longest = Math.max(p.width, p.height)
  if (longest <= MAX_DIMENSION) return p
  const scale = MAX_DIMENSION / longest
  return resize(p, Math.round(p.width * scale), Math.round(p.height * scale))
}

export function fileToPixels(file: File): Promise<Pixels> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const p = createPixels(canvas.width, canvas.height)
      p.data.set(data.data)
      resolve(downscaleIfNeeded(p))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('NOT_AN_IMAGE'))
    }
    img.src = url
  })
}

export function pixelsToBlob(
  p: Pixels,
  type: 'image/png' | 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    pixelsToCanvas(p).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('EXPORT_FAILED'))),
      type,
      quality,
    )
  })
}
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npx tsc -b`
Expected: без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add src/core/canvas.ts
git commit -m "feat: add browser Canvas<->Pixels bridges"
```

---

## Task 7: Стор редактора (zustand + история)

**Files:**
- Create: `src/state/editorStore.ts`

**Interfaces:**
- Consumes: `Pixels`, `clonePixels`; `History<Pixels>` и функции истории из `src/core/history.ts`.
- Produces (zustand-хук `useEditor`):
  - state: `original: Pixels | null`, `history: History<Pixels> | null`, `activeTool: ToolId`, `showBefore: boolean`, `busy: boolean`
  - `type ToolId = 'adjust' | 'filters' | 'background' | 'heal' | 'transform'`
  - actions: `load(p: Pixels): void`, `commit(next: Pixels): void`, `undo(): void`, `redo(): void`, `resetToOriginal(): void`, `setTool(t: ToolId): void`, `setShowBefore(v: boolean): void`, `setBusy(v: boolean): void`
  - selectors-геттеры: `current(): Pixels | null` (history?.present)

- [ ] **Step 1: Реализовать (стор проверяется через UI; типовой самотест — сборка)**

`src/state/editorStore.ts`:
```ts
import { create } from 'zustand'
import { Pixels } from '../core/pixels'
import {
  History, initHistory, pushHistory, undo as undoH, redo as redoH,
} from '../core/history'

export type ToolId = 'adjust' | 'filters' | 'background' | 'heal' | 'transform'

interface EditorState {
  original: Pixels | null
  history: History<Pixels> | null
  activeTool: ToolId
  showBefore: boolean
  busy: boolean
  current: () => Pixels | null
  load: (p: Pixels) => void
  commit: (next: Pixels) => void
  undo: () => void
  redo: () => void
  resetToOriginal: () => void
  setTool: (t: ToolId) => void
  setShowBefore: (v: boolean) => void
  setBusy: (v: boolean) => void
}

export const useEditor = create<EditorState>((set, get) => ({
  original: null,
  history: null,
  activeTool: 'adjust',
  showBefore: false,
  busy: false,
  current: () => get().history?.present ?? null,
  load: (p) => set({ original: p, history: initHistory(p) }),
  commit: (next) =>
    set((s) => (s.history ? { history: pushHistory(s.history, next) } : {})),
  undo: () => set((s) => (s.history ? { history: undoH(s.history) } : {})),
  redo: () => set((s) => (s.history ? { history: redoH(s.history) } : {})),
  resetToOriginal: () =>
    set((s) => (s.original ? { history: initHistory(s.original) } : {})),
  setTool: (t) => set({ activeTool: t }),
  setShowBefore: (v) => set({ showBefore: v }),
  setBusy: (v) => set({ busy: v }),
}))
```

- [ ] **Step 2: Проверить сборку**

Run: `npx tsc -b`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/state/editorStore.ts
git commit -m "feat: add zustand editor store with history"
```

---

## Task 8: Модуль фона (@imgly) + композиция

**Files:**
- Create: `src/modules/background.ts`
- Test: `tests/modules/background.test.ts`

**Interfaces:**
- Consumes: `Pixels`, `clonePixels`, `createPixels`, `getPixel`, `setPixel`; `pixelsToBlob` из `src/core/canvas.ts`; `@imgly/background-removal`.
- Produces:
  - `removeBackground(p: Pixels): Promise<Pixels>` — возвращает Pixels с прозрачным фоном (alpha=0 у фона). Внутри: `pixelsToBlob(p,'image/png')` -> `imglyRemoveBackground(blob)` -> декод обратно в Pixels.
  - `fillBackground(fg: Pixels, color: [number, number, number]): Pixels` — заливает прозрачные пиксели цветом (чистая функция, тестируется).
  - `compositeOver(fg: Pixels, bg: Pixels): Pixels` — накладывает fg (с альфой) на bg одинакового размера (чистая функция, тестируется).

Замечание: `removeBackground` использует сеть только для загрузки весов модели с CDN самой библиотеки; **изображение остаётся в браузере**. В тесте `@imgly/background-removal` мокается.

- [ ] **Step 1: Написать падающий тест (чистые функции + мок removeBackground)**

`tests/modules/background.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { fillBackground, compositeOver } from '../../src/modules/background'

vi.mock('@imgly/background-removal', () => ({ removeBackground: vi.fn() }))

describe('background composition', () => {
  it('fillBackground replaces transparent pixels with color', () => {
    const p = createPixels(1, 1) // alpha 0
    const out = fillBackground(p, [255, 0, 0])
    expect(getPixel(out, 0, 0)).toEqual([255, 0, 0, 255])
  })

  it('fillBackground leaves opaque pixels intact', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [1, 2, 3, 255])
    expect(getPixel(fillBackground(p, [255, 0, 0]), 0, 0)).toEqual([1, 2, 3, 255])
  })

  it('compositeOver blends a half-transparent foreground', () => {
    const fg = createPixels(1, 1)
    setPixel(fg, 0, 0, [200, 200, 200, 128])
    const bg = createPixels(1, 1)
    setPixel(bg, 0, 0, [0, 0, 0, 255])
    const [r] = getPixel(compositeOver(fg, bg), 0, 0)
    expect(r).toBeGreaterThan(90)
    expect(r).toBeLessThan(110)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/modules/background.test.ts`
Expected: FAIL (модуль `background` не найден).

- [ ] **Step 3: Реализовать**

`src/modules/background.ts`:
```ts
import { removeBackground as imglyRemove } from '@imgly/background-removal'
import { Pixels, createPixels, getPixel, setPixel, clonePixels } from '../core/pixels'
import { pixelsToBlob } from '../core/canvas'

export function fillBackground(fg: Pixels, color: [number, number, number]): Pixels {
  const out = clonePixels(fg)
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 255) {
      const a = out.data[i + 3] / 255
      out.data[i] = color[0] * (1 - a) + out.data[i] * a
      out.data[i + 1] = color[1] * (1 - a) + out.data[i + 1] * a
      out.data[i + 2] = color[2] * (1 - a) + out.data[i + 2] * a
      out.data[i + 3] = 255
    }
  }
  return out
}

export function compositeOver(fg: Pixels, bg: Pixels): Pixels {
  const out = createPixels(fg.width, fg.height)
  for (let y = 0; y < fg.height; y++) {
    for (let x = 0; x < fg.width; x++) {
      const [fr, fgc, fb, fa] = getPixel(fg, x, y)
      const [br, bgc, bb] = getPixel(bg, x, y)
      const a = fa / 255
      setPixel(out, x, y, [
        fr * a + br * (1 - a),
        fgc * a + bgc * (1 - a),
        fb * a + bb * (1 - a),
        255,
      ])
    }
  }
  return out
}

export async function removeBackground(p: Pixels): Promise<Pixels> {
  const inputBlob = await pixelsToBlob(p, 'image/png')
  const resultBlob = await imglyRemove(inputBlob)
  const bitmap = await createImageBitmap(resultBlob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const out = createPixels(canvas.width, canvas.height)
  out.data.set(data.data)
  return out
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/modules/background.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/modules/background.ts tests/modules/background.test.ts
git commit -m "feat: add background removal and compositing module"
```

---

## Task 9: Модуль лечащей кисти (opencv.js inpaint)

**Files:**
- Create: `src/modules/heal.ts`
- Test: `tests/modules/heal.test.ts`

**Interfaces:**
- Consumes: `Pixels`, `createPixels`; `@techstark/opencv-js`.
- Produces:
  - `type Mask = { data: Uint8Array; width: number; height: number }` — 0/255, где 255 = «замазать».
  - `createMask(width: number, height: number): Mask`
  - `paintMask(mask: Mask, x: number, y: number, radius: number): void` (чистая, тестируется)
  - `isMaskEmpty(mask: Mask): boolean` (чистая, тестируется)
  - `inpaint(p: Pixels, mask: Mask): Promise<Pixels>` — если маска пустая → throw `Error('EMPTY_MASK')`; иначе cv.inpaint (Telea, radius 3).

- [ ] **Step 1: Написать падающий тест (чистые функции; cv мокается)**

`tests/modules/heal.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { createMask, paintMask, isMaskEmpty, inpaint } from '../../src/modules/heal'
import { createPixels } from '../../src/core/pixels'

vi.mock('@techstark/opencv-js', () => ({ default: {} }))

describe('heal mask', () => {
  it('new mask is empty', () => {
    expect(isMaskEmpty(createMask(4, 4))).toBe(true)
  })

  it('paintMask marks pixels within radius', () => {
    const m = createMask(5, 5)
    paintMask(m, 2, 2, 1)
    expect(m.data[2 * 5 + 2]).toBe(255)
    expect(isMaskEmpty(m)).toBe(false)
  })

  it('inpaint rejects an empty mask', async () => {
    await expect(inpaint(createPixels(4, 4), createMask(4, 4))).rejects.toThrow('EMPTY_MASK')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/modules/heal.test.ts`
Expected: FAIL (модуль `heal` не найден).

- [ ] **Step 3: Реализовать**

`src/modules/heal.ts`:
```ts
import { Pixels, createPixels } from '../core/pixels'

export interface Mask {
  data: Uint8Array
  width: number
  height: number
}

export function createMask(width: number, height: number): Mask {
  return { data: new Uint8Array(width * height), width, height }
}

export function paintMask(mask: Mask, cx: number, cy: number, radius: number): void {
  for (let y = Math.max(0, cy - radius); y <= Math.min(mask.height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(mask.width - 1, cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        mask.data[y * mask.width + x] = 255
      }
    }
  }
}

export function isMaskEmpty(mask: Mask): boolean {
  return !mask.data.some((v) => v > 0)
}

export async function inpaint(p: Pixels, mask: Mask): Promise<Pixels> {
  if (isMaskEmpty(mask)) throw new Error('EMPTY_MASK')
  const cvModule = await import('@techstark/opencv-js')
  const cv = (cvModule.default ?? cvModule) as any
  const src = cv.matFromImageData({ data: p.data, width: p.width, height: p.height })
  const rgb = new cv.Mat()
  cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
  const maskMat = cv.matFromArray(mask.height, mask.width, cv.CV_8UC1, Array.from(mask.data))
  const dst = new cv.Mat()
  cv.inpaint(rgb, maskMat, dst, 3, cv.INPAINT_TELEA)
  const rgba = new cv.Mat()
  cv.cvtColor(dst, rgba, cv.COLOR_RGB2RGBA)
  const out = createPixels(p.width, p.height)
  out.data.set(rgba.data)
  src.delete(); rgb.delete(); maskMat.delete(); dst.delete(); rgba.delete()
  return out
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/modules/heal.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/modules/heal.ts tests/modules/heal.test.ts
git commit -m "feat: add healing brush inpaint module"
```

---

## Task 10: Модуль экспорта

**Files:**
- Create: `src/modules/exporter.ts`
- Test: `tests/modules/exporter.test.ts`

**Interfaces:**
- Consumes: `Pixels`; `pixelsToBlob` из `src/core/canvas.ts`.
- Produces:
  - `type ExportFormat = 'png' | 'jpeg'`
  - `buildFileName(format: ExportFormat): string` (чистая, тестируется) — вид `photo-edited.<ext>`.
  - `exportImage(p: Pixels, format: ExportFormat, quality: number): Promise<void>` — создаёт Blob и триггерит скачивание (браузер).

- [ ] **Step 1: Написать падающий тест (чистая функция имени файла)**

`tests/modules/exporter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildFileName } from '../../src/modules/exporter'

describe('exporter', () => {
  it('png filename ends with .png', () => {
    expect(buildFileName('png')).toMatch(/\.png$/)
  })
  it('jpeg filename ends with .jpg', () => {
    expect(buildFileName('jpeg')).toMatch(/\.jpg$/)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run tests/modules/exporter.test.ts`
Expected: FAIL (модуль `exporter` не найден).

- [ ] **Step 3: Реализовать**

`src/modules/exporter.ts`:
```ts
import { Pixels } from '../core/pixels'
import { pixelsToBlob } from '../core/canvas'

export type ExportFormat = 'png' | 'jpeg'

export function buildFileName(format: ExportFormat): string {
  return `photo-edited.${format === 'png' ? 'png' : 'jpg'}`
}

export async function exportImage(
  p: Pixels,
  format: ExportFormat,
  quality: number,
): Promise<void> {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await pixelsToBlob(p, mime, quality)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildFileName(format)
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run tests/modules/exporter.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/modules/exporter.ts tests/modules/exporter.test.ts
git commit -m "feat: add PNG/JPG exporter"
```

---

## Task 11: UI — загрузка и превью

**Files:**
- Create: `src/components/Uploader.tsx`, `src/components/CanvasPreview.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useEditor` (`load`, `current`, `original`, `showBefore`); `fileToPixels` из `src/core/canvas.ts`; `pixelsToCanvas` из `src/core/canvas.ts`.
- Produces: рабочий экран — до загрузки показывается `Uploader`, после — `CanvasPreview` с текущим изображением и режимом «до/после».

- [ ] **Step 1: Реализовать Uploader**

`src/components/Uploader.tsx`:
```tsx
import { useState, DragEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { fileToPixels } from '../core/canvas'

export default function Uploader() {
  const load = useEditor((s) => s.load)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      load(await fileToPixels(file))
    } catch {
      setError('Это не похоже на изображение. Загрузите JPG, PNG или WebP.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-2xl p-16 text-center"
    >
      <p className="text-lg mb-4">Перетащите фото сюда или выберите файл</p>
      <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-500">
        Выбрать файл
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Реализовать CanvasPreview**

`src/components/CanvasPreview.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToCanvas } from '../core/canvas'

export default function CanvasPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const history = useEditor((s) => s.history)
  const original = useEditor((s) => s.original)
  const showBefore = useEditor((s) => s.showBefore)

  const shown = showBefore ? original : history?.present ?? null

  useEffect(() => {
    if (!ref.current || !shown) return
    const canvas = pixelsToCanvas(shown)
    canvas.className = 'max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg'
    ref.current.replaceChildren(canvas)
  }, [shown])

  return <div ref={ref} className="flex items-center justify-center" />
}
```

- [ ] **Step 3: Связать в App**

`src/App.tsx`:
```tsx
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
```

- [ ] **Step 4: Ручная проверка**

Run: `npm run dev`
Expected: открывается страница; загрузка картинки показывает её в превью; загрузка текстового файла — сообщение об ошибке.

- [ ] **Step 5: Commit**

```bash
git add src/components/Uploader.tsx src/components/CanvasPreview.tsx src/App.tsx
git commit -m "feat: add uploader and canvas preview"
```

---

## Task 12: UI — панель инструментов и подключение всех модулей

**Files:**
- Create: `src/components/Toolbar.tsx`, `src/components/AdjustPanel.tsx`, `src/components/FiltersPanel.tsx`, `src/components/BackgroundPanel.tsx`, `src/components/HealPanel.tsx`, `src/components/TransformPanel.tsx`, `src/components/ExportBar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useEditor`; ядро (`applyAdjustments`, `autoEnhance`, `NEUTRAL_ADJUST`, `PRESETS`); модули (`removeBackground`, `fillBackground`, `inpaint`, `createMask`, `paintMask`, `crop`, `rotate90`, `ASPECTS`, `exportImage`); `pixelsToCanvas`.
- Produces: полностью рабочий редактор: выбор инструмента слева/сверху, контекстная панель, undo/redo/«до/после»/сброс, экспорт.

- [ ] **Step 1: Toolbar (выбор инструмента + история)**

`src/components/Toolbar.tsx`:
```tsx
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
```

- [ ] **Step 2: AdjustPanel**

`src/components/AdjustPanel.tsx`:
```tsx
import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { AdjustSettings, NEUTRAL_ADJUST, applyAdjustments, autoEnhance } from '../core/adjust'

const FIELDS: { key: keyof AdjustSettings; label: string; min: number }[] = [
  { key: 'brightness', label: 'Яркость', min: -100 },
  { key: 'contrast', label: 'Контраст', min: -100 },
  { key: 'saturation', label: 'Насыщенность', min: -100 },
  { key: 'warmth', label: 'Теплота', min: -100 },
  { key: 'sharpness', label: 'Резкость', min: 0 },
]

export default function AdjustPanel() {
  const { current, commit } = useEditor()
  const [s, setS] = useState<AdjustSettings>(NEUTRAL_ADJUST)

  function apply() {
    const p = current()
    if (p) commit(applyAdjustments(p, s))
    setS(NEUTRAL_ADJUST)
  }
  function auto() {
    const p = current()
    if (p) commit(autoEnhance(p))
  }

  return (
    <div className="space-y-3">
      <button onClick={auto} className="w-full rounded bg-emerald-600 py-2">Авто-улучшение</button>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-sm">
          {f.label}: {s[f.key]}
          <input
            type="range" min={f.min} max={100} value={s[f.key]}
            onChange={(e) => setS({ ...s, [f.key]: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      ))}
      <button onClick={apply} className="w-full rounded bg-indigo-600 py-2">Применить</button>
    </div>
  )
}
```

- [ ] **Step 3: FiltersPanel (превью-миниатюры пресетов)**

`src/components/FiltersPanel.tsx`:
```tsx
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
```

- [ ] **Step 4: BackgroundPanel**

`src/components/BackgroundPanel.tsx`:
```tsx
import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { removeBackground, fillBackground } from '../modules/background'

export default function BackgroundPanel() {
  const { current, commit, busy, setBusy } = useEditor()
  const [cut, setCut] = useState(false)

  async function remove() {
    const p = current()
    if (!p) return
    setBusy(true)
    try {
      commit(await removeBackground(p))
      setCut(true)
    } finally {
      setBusy(false)
    }
  }
  function fill(color: [number, number, number]) {
    const p = current()
    if (p) commit(fillBackground(p, color))
  }

  return (
    <div className="space-y-3">
      <button disabled={busy} onClick={remove} className="w-full rounded bg-indigo-600 py-2 disabled:opacity-50">
        {busy ? 'Обработка… (загрузка модели при первом запуске)' : 'Удалить фон'}
      </button>
      {cut && (
        <div className="flex gap-2">
          <button onClick={() => fill([255, 255, 255])} className="flex-1 rounded bg-neutral-200 text-black py-2">Белый</button>
          <button onClick={() => fill([0, 0, 0])} className="flex-1 rounded bg-black py-2">Чёрный</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: HealPanel (рисование маски поверх превью)**

`src/components/HealPanel.tsx`:
```tsx
import { useRef, useState, PointerEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToCanvas } from '../core/canvas'
import { createMask, paintMask, inpaint, Mask } from '../modules/heal'

export default function HealPanel() {
  const { current, commit, busy, setBusy } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<Mask | null>(null)
  const [radius, setRadius] = useState(8)
  const [error, setError] = useState<string | null>(null)

  function ensure(): HTMLCanvasElement | null {
    const p = current()
    if (!p) return null
    if (!canvasRef.current || maskRef.current?.width !== p.width) {
      const c = pixelsToCanvas(p)
      canvasRef.current = c
      maskRef.current = createMask(p.width, p.height)
    }
    return canvasRef.current
  }

  function draw(e: PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return
    const c = canvasRef.current
    const mask = maskRef.current
    if (!c || !mask) return
    const rect = c.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * c.width)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * c.height)
    paintMask(mask, x, y, radius)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(255,0,0,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  async function apply() {
    const p = current()
    const mask = maskRef.current
    if (!p || !mask) return
    setBusy(true)
    setError(null)
    try {
      commit(await inpaint(p, mask))
      maskRef.current = null
      canvasRef.current = null
    } catch (err) {
      setError(err instanceof Error && err.message === 'EMPTY_MASK'
        ? 'Сначала закрасьте область кистью.'
        : 'Не удалось обработать. Попробуйте меньшую область.')
    } finally {
      setBusy(false)
    }
  }

  const c = ensure()
  return (
    <div className="space-y-3">
      <label className="block text-sm">Размер кисти: {radius}
        <input type="range" min={2} max={40} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full" />
      </label>
      {c && (
        <canvas
          ref={(el) => { if (el && c) { el.width = c.width; el.height = c.height; el.getContext('2d')!.drawImage(c, 0, 0) } }}
          onPointerMove={draw}
          className="max-h-[50vh] max-w-full cursor-crosshair rounded border border-neutral-700"
        />
      )}
      <button disabled={busy} onClick={apply} className="w-full rounded bg-indigo-600 py-2 disabled:opacity-50">
        {busy ? 'Обработка…' : 'Убрать закрашенное'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 6: TransformPanel**

`src/components/TransformPanel.tsx`:
```tsx
import { useEditor } from '../state/editorStore'
import { rotate90, crop, ASPECTS } from '../modules/transform'

export default function TransformPanel() {
  const { current, commit } = useEditor()

  function rotate(dir: 'cw' | 'ccw') {
    const p = current()
    if (p) commit(rotate90(p, dir))
  }
  function cropAspect(ratio: number | null) {
    const p = current()
    if (!p || ratio === null) return
    let w = p.width
    let h = Math.round(w / ratio)
    if (h > p.height) { h = p.height; w = Math.round(h * ratio) }
    const x = Math.floor((p.width - w) / 2)
    const y = Math.floor((p.height - h) / 2)
    commit(crop(p, x, y, w, h))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => rotate('ccw')} className="flex-1 rounded bg-neutral-800 py-2">↺ Влево</button>
        <button onClick={() => rotate('cw')} className="flex-1 rounded bg-neutral-800 py-2">↻ Вправо</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ASPECTS.filter((a) => a.ratio !== null).map((a) => (
          <button key={a.id} onClick={() => cropAspect(a.ratio)} className="rounded bg-neutral-800 py-2 text-sm">{a.name}</button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: ExportBar**

`src/components/ExportBar.tsx`:
```tsx
import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { exportImage, ExportFormat } from '../modules/exporter'

export default function ExportBar() {
  const current = useEditor((s) => s.current)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)

  async function save() {
    const p = current()
    if (p) await exportImage(p, format, quality)
  }

  return (
    <div className="flex items-center gap-2">
      <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="rounded bg-neutral-800 px-2 py-1">
        <option value="png">PNG</option>
        <option value="jpeg">JPG</option>
      </select>
      {format === 'jpeg' && (
        <input type="range" min={0.3} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
      )}
      <button onClick={save} className="rounded bg-emerald-600 px-4 py-2">Скачать</button>
    </div>
  )
}
```

- [ ] **Step 8: Собрать App с раскладкой**

`src/App.tsx`:
```tsx
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
```

- [ ] **Step 9: Полная проверка тестов и сборки**

Run: `npm test && npm run build`
Expected: все тесты проходят; сборка успешна.

- [ ] **Step 10: Ручная проверка сценариев**

Run: `npm run dev`
Проверить на реальном фото: улучшение+ползунки, фильтр, удаление фона + заливка белым, лечащая кисть на мелком объекте, поворот+кроп, undo/redo, «показать до», скачивание PNG и JPG.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: wire all tools into editor UI"
```

---

## Task 13: Инструкция по деплою

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: —
- Produces: инструкция по локальному запуску и бесплатному деплою.

- [ ] **Step 1: Написать README**

`README.md`:
```markdown
# Фоторедактор

Клиентский фоторедактор в браузере: удаление/замена фона, улучшение, фильтры,
лечащая кисть, кадрирование, экспорт. Без сервера — фото не покидают устройство.

## Запуск локально
```
npm install
npm run dev
```

## Тесты
```
npm test
```

## Сборка и деплой
```
npm run build   # результат в dist/
```
`dist/` — статические файлы. Залейте их на любой бесплатный статический хостинг:

- **Netlify:** перетащите папку `dist` в интерфейс drop, либо `netlify deploy --dir=dist`.
- **Vercel:** `vercel --prod` в корне проекта.
- **GitHub Pages:** запушьте `dist/` в ветку `gh-pages`.

`vite.config.ts` использует `base: './'`, поэтому сайт работает из любой подпапки.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add run and deploy instructions"
```

---

## Self-Review (заполнено автором плана)

**Spec coverage:**
- Удаление/замена фона → Task 8 + BackgroundPanel (Task 12). ✅
- Авто-улучшение + ползунки → Task 2 + AdjustPanel. ✅
- Фильтры-пресеты → Task 3 + FiltersPanel. ✅
- Лечащая кисть → Task 9 + HealPanel. ✅
- Кроп/поворот/ресайз → Task 5 + TransformPanel. ✅
- История undo/redo, сброс, «до/после» → Task 4 + Toolbar. ✅
- Экспорт PNG/JPG → Task 10 + ExportBar. ✅
- Обработка ошибок (не-изображение, пустая маска, загрузка моделей, большое фото) → Uploader, HealPanel, BackgroundPanel busy-индикатор, `downscaleIfNeeded`. ✅
- Тестирование (чистые функции, история, экспорт, дымовые моки) → Tasks 1–5, 8–10. ✅
- Клиентский, без бэкенда, деплой на статику → Global Constraints + Task 13. ✅
- Расширяемость под платный AI-мотор → контракт «Pixels → Pixels», модульная структура. ✅

**Placeholder scan:** нет TBD/TODO/«implement later»; весь код приведён целиком.

**Type consistency:** тип обмена `Pixels` единый во всех модулях; `AdjustSettings`, `History<T>`, `Mask`, `ToolId`, `ExportFormat` определены один раз и используются согласованно; имена функций (`applyAdjustments`, `autoEnhance`, `removeBackground`, `fillBackground`, `inpaint`, `crop`, `rotate90`, `exportImage`) совпадают между определением и вызовами в UI.
