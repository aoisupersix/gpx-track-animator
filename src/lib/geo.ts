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
    return {
        points,
        cumulative,
        totalDistance: total,
        bounds: [
            [west, south],
            [east, north],
        ],
    }
}
