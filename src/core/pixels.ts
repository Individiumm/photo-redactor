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
