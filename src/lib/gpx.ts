import { gpx } from '@tmcw/togeojson'

import type { TrackPoint } from '../types'

/** Thrown when a GPX file cannot be parsed or contains no drawable track. */
export class GpxParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GpxParseError'
    }
}

/** Parses an ISO timestamp to epoch milliseconds, or undefined when invalid. */
const parseTime = (raw: unknown): number | undefined => {
    if (typeof raw !== 'string') {
        return undefined
    }
    const ms = Date.parse(raw)
    return Number.isNaN(ms) ? undefined : ms
}

const collectPositions = (
    positions: number[][],
    times: unknown[],
    into: TrackPoint[],
): void => {
    positions.forEach((position, index) => {
        const [lon, lat] = position
        if (lon !== undefined && lat !== undefined) {
            const time = parseTime(times[index])
            into.push(time === undefined ? { lon, lat } : { lon, lat, time })
        }
    })
}

/**
 * togeojson stores per-coordinate timestamps under
 * properties.coordinateProperties.times: a flat string[] for a LineString or a
 * string[][] (one per segment) for a MultiLineString.
 */
const readTimes = (properties: unknown): unknown => {
    if (typeof properties !== 'object' || properties === null) {
        return undefined
    }
    const coordinateProperties = (properties as Record<string, unknown>)
        .coordinateProperties
    if (
        typeof coordinateProperties !== 'object' ||
        coordinateProperties === null
    ) {
        return undefined
    }
    return (coordinateProperties as Record<string, unknown>).times
}

/** Extracts track points from GPX text, flattening all tracks and routes in document order. */
export const parseGpx = (gpxText: string): TrackPoint[] => {
    const doc = new DOMParser().parseFromString(gpxText, 'application/xml')
    if (doc.querySelector('parsererror') !== null) {
        throw new GpxParseError('GPX file is not valid XML')
    }
    const collection = gpx(doc)
    const points: TrackPoint[] = []
    for (const feature of collection.features) {
        const geometry = feature.geometry
        const times = readTimes(feature.properties)
        if (geometry.type === 'LineString') {
            collectPositions(
                geometry.coordinates,
                Array.isArray(times) ? times : [],
                points,
            )
        } else if (geometry.type === 'MultiLineString') {
            geometry.coordinates.forEach((line, segment) => {
                const segmentTimes =
                    Array.isArray(times) && Array.isArray(times[segment])
                        ? (times[segment] as unknown[])
                        : []
                collectPositions(line, segmentTimes, points)
            })
        }
    }
    if (points.length < 2) {
        throw new GpxParseError(
            'GPX file contains no track with at least two points',
        )
    }
    return points
}
