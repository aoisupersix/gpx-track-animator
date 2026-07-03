import type { Track } from '../types'

/**
 * Linearly interpolates `ys` against a strictly reference-monotonic `xs`. `xs`
 * must be non-decreasing and the same length as `ys`. Values of `x` outside the
 * range are clamped to the first/last sample. Flat segments in `xs` resolve to
 * the segment's lower `y`.
 */
export const interpolateMonotonic = (
    xs: number[],
    ys: number[],
    x: number,
): number => {
    const last = xs.length - 1
    if (last < 0) {
        return 0
    }
    if (x <= (xs[0] ?? 0)) {
        return ys[0] ?? 0
    }
    if (x >= (xs[last] ?? 0)) {
        return ys[last] ?? 0
    }
    // Binary search for the first index whose x reaches the target.
    let low = 0
    let high = last
    while (low < high) {
        const mid = (low + high) >> 1
        if ((xs[mid] ?? 0) < x) {
            low = mid + 1
        } else {
            high = mid
        }
    }
    const x0 = xs[low - 1] ?? 0
    const x1 = xs[low] ?? 0
    const y0 = ys[low - 1] ?? 0
    const y1 = ys[low] ?? 0
    const span = x1 - x0
    const t = span === 0 ? 0 : (x - x0) / span
    return y0 + (y1 - y0) * t
}

/** The time axis the head clock runs on, paired with its total. */
type TimeAxis = { times: number[]; total: number }

/**
 * Selects the time axis driving playback, or null to fall back to constant
 * speed. `pauseOnStop` keeps recorded stops (raw time); otherwise pauses are
 * collapsed via the moving-time axis so the head never halts.
 */
const timeAxis = (
    track: Track,
    speedBased: boolean,
    pauseOnStop: boolean,
): TimeAxis | null => {
    if (!speedBased || track.totalDistance <= 0) {
        return null
    }
    const times = pauseOnStop
        ? track.cumulativeTime
        : track.cumulativeMovingTime
    const total = pauseOnStop ? track.totalTime : track.totalMovingTime
    if (times === undefined || total === undefined || total <= 0) {
        return null
    }
    return { times, total }
}

/**
 * Maps animation progress (0..1 of the fixed duration) to the fraction of total
 * distance the head has covered. With recorded speed, the head advances in step
 * with the GPX clock, so it lingers on slow sections and races on fast ones;
 * otherwise it grows at constant geographic speed (identity mapping).
 */
export const headDistanceFraction = (
    track: Track,
    speedBased: boolean,
    pauseOnStop: boolean,
    animFraction: number,
): number => {
    const clamped = Math.min(Math.max(animFraction, 0), 1)
    const axis = timeAxis(track, speedBased, pauseOnStop)
    if (axis === null) {
        return clamped
    }
    const distance = interpolateMonotonic(
        axis.times,
        track.cumulative,
        clamped * axis.total,
    )
    return distance / track.totalDistance
}

/**
 * Maps a pin's position (fraction of total distance) to the animation progress
 * at which the head reaches it, so pin drop-ins stay in sync with the head.
 * Inverse of {@link headDistanceFraction}.
 */
export const pinAppearFraction = (
    track: Track,
    speedBased: boolean,
    pauseOnStop: boolean,
    distanceFraction: number,
): number => {
    const clamped = Math.min(Math.max(distanceFraction, 0), 1)
    const axis = timeAxis(track, speedBased, pauseOnStop)
    if (axis === null) {
        return clamped
    }
    const time = interpolateMonotonic(
        track.cumulative,
        axis.times,
        clamped * track.totalDistance,
    )
    return time / axis.total
}
