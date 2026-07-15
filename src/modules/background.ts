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
