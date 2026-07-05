/**
 * Camera interpolation for the opening zoom-out, shared by the live preview and
 * the MP4 export so both animate the map identically.
 */

export type Camera = {
    /** [lon, lat] */
    center: [number, number]
    zoom: number
}

/** Ease in-out cubic so the zoom starts and ends gently. */
const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * Interpolates from the opening overview to the fitted view. `fraction`
 * 0 = the wide overview, 1 = final fit. Both cameras share the fitted center,
 * so this is effectively a pure zoom.
 */
export const introCamera = (
    start: Camera,
    end: Camera,
    fraction: number,
): Camera => {
    const t = easeInOutCubic(Math.min(Math.max(fraction, 0), 1))
    return {
        center: [
            start.center[0] + (end.center[0] - start.center[0]) * t,
            start.center[1] + (end.center[1] - start.center[1]) * t,
        ],
        zoom: start.zoom + (end.zoom - start.zoom) * t,
    }
}
