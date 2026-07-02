export type TrackPoint = {
    lon: number
    lat: number
}

export type Track = {
    points: TrackPoint[]
    /** Cumulative distance in meters from the start; cumulative[i] corresponds to points[i]. */
    cumulative: number[]
    /** Total track length in meters. */
    totalDistance: number
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
    /** Duration of the start-to-end animation in seconds. */
    durationSec: number
    /** How long the full track stays visible at the end of the video, in seconds. */
    endHoldSec: number
    fps: 30 | 60
    lineColor: string
    lineOpacity: number
    lineWidth: number
    /** Pin drop-in start height as a multiple of the pin radius (0 disables it). */
    pinDropHeight: number
    /** Duration of a pin's drop-in animation in seconds. */
    pinDropSec: number
    /** Pin landing bounce (0 = smooth ease, 1 = full bounce). */
    pinBounce: number
}
