export type TrackPoint = {
    lon: number
    lat: number
    /** Recorded timestamp in epoch milliseconds, when the GPX provides one. */
    time?: number
}

export type Track = {
    points: TrackPoint[]
    /** Cumulative distance in meters from the start; cumulative[i] corresponds to points[i]. */
    cumulative: number[]
    /** Total track length in meters. */
    totalDistance: number
    /**
     * Cumulative recorded time in seconds from the start; cumulativeTime[i]
     * corresponds to points[i]. Present only when every point carries a valid,
     * non-decreasing timestamp. Absent tracks fall back to constant speed.
     */
    cumulativeTime?: number[]
    /** Total recorded duration in seconds; present alongside cumulativeTime. */
    totalTime?: number
    /**
     * Cumulative time in seconds excluding stationary periods (segments with no
     * movement), so the head never halts. Present alongside cumulativeTime.
     */
    cumulativeMovingTime?: number[]
    /** Total moving duration in seconds; present alongside cumulativeMovingTime. */
    totalMovingTime?: number
    /** [[west, south], [east, north]] */
    bounds: [[number, number], [number, number]]
}

export type PixelPoint = {
    x: number
    y: number
}

export type RoutePin = {
    id: string
    lon: number
    lat: number
    /**
     * Position along the track as a fraction of the total distance (0..1).
     * The pin appears once the animation head reaches this position.
     */
    progress: number
    label: string
}

export type RenderSettings = {
    /** Output width in pixels (must be even for H.264). */
    width: number
    /** Output height in pixels (must be even for H.264). */
    height: number
    /**
     * When true, the animation opens on a wide overview and zooms in to the
     * full track view (centered on the fitted view) before the start hold.
     */
    zoomIntro: boolean
    /**
     * Absolute MapLibre zoom level the overview starts at; lower is wider.
     * The default (~4.5) shows all of Japan.
     */
    zoomInitialLevel: number
    /** How long the wide overview holds before the zoom-in starts, in seconds. */
    preZoomHoldSec: number
    /** Duration of the opening zoom-in in seconds. */
    zoomDurationSec: number
    /**
     * How long only the start point stays visible after the zoom-in, before the
     * track animation begins, in seconds.
     */
    startHoldSec: number
    /** Duration of the start-to-end animation in seconds. */
    durationSec: number
    /** How long the full track stays visible at the end of the video, in seconds. */
    endHoldSec: number
    fps: 30 | 60
    lineColor: string
    lineOpacity: number
    lineWidth: number
    /** Overall pin size multiplier applied to every pin's head and label. */
    pinScale: number
    /** Pin drop-in start height as a multiple of the pin radius (0 disables it). */
    pinDropHeight: number
    /** Duration of a pin's drop-in animation in seconds. */
    pinDropSec: number
    /** Pin landing bounce (0 = smooth ease, 1 = full bounce). */
    pinBounce: number
    /**
     * When true, the head follows the pace recorded in the GPX timestamps so it
     * lingers on slow sections and races on fast ones. Falls back to constant
     * speed for tracks without timestamps.
     */
    speedBased: boolean
    /**
     * When true, the head halts during recorded stops (stationary periods).
     * When false, those pauses are collapsed so the head keeps moving. Only
     * affects speed-based playback.
     */
    pauseOnStop: boolean
}
