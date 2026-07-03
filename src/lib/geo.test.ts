import { describe, expect, it } from 'vitest'

import { buildTrack, haversineDistance } from './geo'

describe('haversineDistance', () => {
    it('returns 0 for identical points', () => {
        const point = { lon: 139.7671, lat: 35.6812 }
        expect(haversineDistance(point, point)).toBe(0)
    })

    it('matches the known Tokyo-Osaka distance within 1%', () => {
        const tokyoStation = { lon: 139.7671, lat: 35.6812 }
        const osakaStation = { lon: 135.4959, lat: 34.7024 }
        const distance = haversineDistance(tokyoStation, osakaStation)
        expect(distance).toBeGreaterThan(396_000)
        expect(distance).toBeLessThan(404_000)
    })
})

describe('buildTrack', () => {
    const points = [
        { lon: 139.0, lat: 35.0 },
        { lon: 139.1, lat: 35.05 },
        { lon: 139.05, lat: 35.2 },
    ]

    it('throws for an empty point list', () => {
        expect(() => buildTrack([])).toThrow()
    })

    it('builds monotonically increasing cumulative distances starting at 0', () => {
        const track = buildTrack(points)
        expect(track.cumulative).toHaveLength(points.length)
        expect(track.cumulative[0]).toBe(0)
        for (let i = 1; i < track.cumulative.length; i++) {
            expect(track.cumulative[i]).toBeGreaterThan(
                track.cumulative[i - 1] ?? Infinity,
            )
        }
        expect(track.totalDistance).toBe(
            track.cumulative[track.cumulative.length - 1],
        )
    })

    it('computes bounds as [[west, south], [east, north]]', () => {
        const track = buildTrack(points)
        expect(track.bounds).toEqual([
            [139.0, 35.0],
            [139.1, 35.2],
        ])
    })

    it('leaves timing undefined without timestamps', () => {
        const track = buildTrack(points)
        expect(track.cumulativeTime).toBeUndefined()
        expect(track.totalTime).toBeUndefined()
        expect(track.cumulativeMovingTime).toBeUndefined()
    })

    it('excludes jittery stops from moving time', () => {
        const base = Date.parse('2024-01-01T00:00:00Z')
        // Move ~440 m, then jitter ~2 m over 60 s (a stop), then move ~440 m.
        const timed = [
            { lon: 139.0, lat: 35.0, time: base },
            { lon: 139.005, lat: 35.0, time: base + 30_000 },
            { lon: 139.00502, lat: 35.0, time: base + 90_000 },
            { lon: 139.01, lat: 35.0, time: base + 120_000 },
        ]
        const track = buildTrack(timed)
        expect(track.totalTime).toBe(120)
        // The 60 s stop is dropped: only the two 30 s moving segments remain.
        expect(track.totalMovingTime).toBe(60)
        expect(track.cumulativeMovingTime).toEqual([0, 30, 30, 60])
    })
})
