import { STOP_SPEED_MPS } from './constants'

import type { Track, TrackPoint } from '../types'

const EARTH_RADIUS_M = 6_371_000

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Great-circle distance between two points in meters. */
export const haversineDistance = (a: TrackPoint, b: TrackPoint): number => {
    const latHalfSin = Math.sin(toRadians(b.lat - a.lat) / 2)
    const lonHalfSin = Math.sin(toRadians(b.lon - a.lon) / 2)
    const h =
        latHalfSin * latHalfSin +
        Math.cos(toRadians(a.lat)) *
            Math.cos(toRadians(b.lat)) *
            lonHalfSin *
            lonHalfSin
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

type Timeline = {
    /** Cumulative elapsed time in seconds from the start. */
    cumulativeTime: number[]
    /** Cumulative elapsed time excluding stationary (non-moving) segments. */
    cumulativeMovingTime: number[]
}

/**
 * Builds cumulative elapsed time (seconds) from the start, plus a moving-only
 * variant that skips stationary segments. Returns undefined unless every point
 * carries a valid, non-decreasing timestamp and the track spans a positive
 * duration, so callers fall back to constant speed.
 */
const buildTimeline = (
    points: TrackPoint[],
    cumulative: number[],
): Timeline | undefined => {
    const start = points[0]?.time
    if (start === undefined) {
        return undefined
    }
    const cumulativeTime = [0]
    const cumulativeMovingTime = [0]
    let previous = start
    let moving = 0
    for (let i = 1; i < points.length; i++) {
        const time = points[i]?.time
        if (time === undefined || time < previous) {
            return undefined
        }
        cumulativeTime.push((time - start) / 1000)
        const moved = (cumulative[i] ?? 0) - (cumulative[i - 1] ?? 0)
        const dt = (time - previous) / 1000
        // Below-threshold speed (including GPS jitter while standing still)
        // counts as a stop and contributes no moving time.
        if (dt > 0 && moved / dt >= STOP_SPEED_MPS) {
            moving += dt
        }
        cumulativeMovingTime.push(moving)
        previous = time
    }
    const total = cumulativeTime[cumulativeTime.length - 1] ?? 0
    return total > 0 ? { cumulativeTime, cumulativeMovingTime } : undefined
}

/** Builds a track with cumulative distances and bounds from raw points. */
export const buildTrack = (points: TrackPoint[]): Track => {
    const first = points[0]
    if (first === undefined) {
        throw new Error('A track requires at least one point')
    }
    const cumulative = [0]
    let total = 0
    let previous = first
    let west = first.lon
    let east = first.lon
    let south = first.lat
    let north = first.lat
    for (const point of points.slice(1)) {
        total += haversineDistance(previous, point)
        cumulative.push(total)
        previous = point
        west = Math.min(west, point.lon)
        east = Math.max(east, point.lon)
        south = Math.min(south, point.lat)
        north = Math.max(north, point.lat)
    }
    const timeline = buildTimeline(points, cumulative)
    const cumulativeTime = timeline?.cumulativeTime
    const cumulativeMovingTime = timeline?.cumulativeMovingTime
    return {
        points,
        cumulative,
        totalDistance: total,
        cumulativeTime,
        totalTime: cumulativeTime?.[cumulativeTime.length - 1],
        cumulativeMovingTime,
        totalMovingTime:
            cumulativeMovingTime?.[cumulativeMovingTime.length - 1],
        bounds: [
            [west, south],
            [east, north],
        ],
    }
}
