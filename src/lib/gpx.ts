import { gpx } from '@tmcw/togeojson'

import type { TrackPoint } from '../types'

/** Thrown when a GPX file cannot be parsed or contains no drawable track. */
export class GpxParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GpxParseError'
    }
}

const collectPositions = (positions: number[][], into: TrackPoint[]): void => {
    for (const position of positions) {
        const [lon, lat] = position
        if (lon !== undefined && lat !== undefined) {
            into.push({ lon, lat })
        }
    }
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
        if (geometry.type === 'LineString') {
            collectPositions(geometry.coordinates, points)
        } else if (geometry.type === 'MultiLineString') {
            for (const line of geometry.coordinates) {
                collectPositions(line, points)
            }
        }
    }
    if (points.length < 2) {
        throw new GpxParseError(
            'GPX file contains no track with at least two points',
        )
    }
    return points
}
