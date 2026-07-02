// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { GpxParseError, parseGpx } from './gpx'

const wrapGpx = (body: string): string =>
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`

describe('parseGpx', () => {
    it('parses track points from a single trkseg', () => {
        const text = wrapGpx(
            `<trk><trkseg>` +
                `<trkpt lat="35.0" lon="139.0"/>` +
                `<trkpt lat="35.1" lon="139.1"/>` +
                `</trkseg></trk>`,
        )
        expect(parseGpx(text)).toEqual([
            { lon: 139.0, lat: 35.0 },
            { lon: 139.1, lat: 35.1 },
        ])
    })

    it('concatenates multiple trkseg in document order', () => {
        const text = wrapGpx(
            `<trk>` +
                `<trkseg><trkpt lat="35.0" lon="139.0"/><trkpt lat="35.1" lon="139.1"/></trkseg>` +
                `<trkseg><trkpt lat="35.2" lon="139.2"/><trkpt lat="35.3" lon="139.3"/></trkseg>` +
                `</trk>`,
        )
        expect(parseGpx(text)).toEqual([
            { lon: 139.0, lat: 35.0 },
            { lon: 139.1, lat: 35.1 },
            { lon: 139.2, lat: 35.2 },
            { lon: 139.3, lat: 35.3 },
        ])
    })

    it('accepts route points (rtept)', () => {
        const text = wrapGpx(
            `<rte><rtept lat="35.0" lon="139.0"/><rtept lat="35.1" lon="139.1"/></rte>`,
        )
        expect(parseGpx(text)).toEqual([
            { lon: 139.0, lat: 35.0 },
            { lon: 139.1, lat: 35.1 },
        ])
    })

    it('throws GpxParseError for invalid XML', () => {
        expect(() => parseGpx('this is not xml')).toThrow(GpxParseError)
    })

    it('throws GpxParseError when the file contains no track points', () => {
        expect(() => parseGpx(wrapGpx(''))).toThrow(GpxParseError)
    })
})
