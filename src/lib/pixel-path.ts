import type { PixelPoint } from '../types'

/**
 * Returns the portion of the pixel path covered at `progress` (0..1) of the
 * total geographic distance. The head point is linearly interpolated inside
 * its segment so that the drawn line grows at constant geographic speed.
 * `pixels` and `cumulative` must have the same length.
 */
export const partialPath = (
    pixels: PixelPoint[],
    cumulative: number[],
    progress: number,
): PixelPoint[] => {
    if (pixels.length === 0) {
        return []
    }
    const total = cumulative[cumulative.length - 1] ?? 0
    if (progress >= 1 || total === 0) {
        return [...pixels]
    }
    if (progress <= 0) {
        return pixels.slice(0, 1)
    }
    const target = progress * total
    // Binary search for the first index whose cumulative distance reaches the target.
    let low = 0
    let high = cumulative.length - 1
    while (low < high) {
        const mid = (low + high) >> 1
        if ((cumulative[mid] ?? 0) < target) {
            low = mid + 1
        } else {
            high = mid
        }
    }
    // low >= 1 because cumulative[0] is 0 and target > 0.
    const before = cumulative[low - 1] ?? 0
    const after = cumulative[low] ?? 0
    const segmentLength = after - before
    const t = segmentLength === 0 ? 0 : (target - before) / segmentLength
    const start = pixels[low - 1]
    const end = pixels[low]
    const path = pixels.slice(0, low)
    if (start !== undefined && end !== undefined) {
        path.push({
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
        })
    }
    return path
}
