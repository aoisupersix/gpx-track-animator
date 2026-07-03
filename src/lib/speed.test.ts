import { describe, expect, it } from 'vitest'

import {
    headDistanceFraction,
    interpolateMonotonic,
    pinAppearFraction,
} from './speed'

import type { Track } from '../types'

/**
 * Two equal-length segments: the first is covered slowly (30 s) and the second
 * quickly (10 s), so the recorded pace differs from constant speed. No stops.
 */
const timedTrack: Track = {
    points: [
        { lon: 0, lat: 0 },
        { lon: 0, lat: 1 },
        { lon: 0, lat: 2 },
    ],
    cumulative: [0, 100, 200],
    totalDistance: 200,
    cumulativeTime: [0, 30, 40],
    totalTime: 40,
    cumulativeMovingTime: [0, 30, 40],
    totalMovingTime: 40,
    bounds: [
        [0, 0],
        [0, 2],
    ],
}

/**
 * Move 100 m in 20 s, stay put for 60 s, then move another 100 m in 20 s.
 * Raw time spans 100 s; moving-only time spans 40 s.
 */
const pausedTrack: Track = {
    points: [
        { lon: 0, lat: 0 },
        { lon: 0, lat: 1 },
        { lon: 0, lat: 1 },
        { lon: 0, lat: 2 },
    ],
    cumulative: [0, 100, 100, 200],
    totalDistance: 200,
    cumulativeTime: [0, 20, 80, 100],
    totalTime: 100,
    cumulativeMovingTime: [0, 20, 20, 40],
    totalMovingTime: 40,
    bounds: [
        [0, 0],
        [0, 2],
    ],
}

const untimedTrack: Track = {
    points: [
        { lon: 0, lat: 0 },
        { lon: 0, lat: 1 },
    ],
    cumulative: [0, 100],
    totalDistance: 100,
    bounds: [
        [0, 0],
        [0, 1],
    ],
}

describe('interpolateMonotonic', () => {
    it('clamps outside the range to the endpoints', () => {
        expect(interpolateMonotonic([0, 10], [0, 100], -5)).toBe(0)
        expect(interpolateMonotonic([0, 10], [0, 100], 15)).toBe(100)
    })

    it('interpolates linearly inside a segment', () => {
        expect(interpolateMonotonic([0, 10, 20], [0, 100, 300], 5)).toBe(50)
        expect(interpolateMonotonic([0, 10, 20], [0, 100, 300], 15)).toBe(200)
    })

    it('resolves a flat x-segment to its lower y', () => {
        expect(interpolateMonotonic([0, 10, 10, 20], [0, 1, 2, 3], 10)).toBe(1)
    })
})

describe('headDistanceFraction', () => {
    it('is the identity mapping without recorded speed', () => {
        expect(headDistanceFraction(untimedTrack, true, false, 0.25)).toBe(0.25)
        expect(headDistanceFraction(timedTrack, false, false, 0.25)).toBe(0.25)
    })

    it('follows the recorded pace: halfway in time is still in segment one', () => {
        // At 50% of 40 s (= 20 s) the head is 20/30 through the first 100 m.
        expect(headDistanceFraction(timedTrack, true, true, 0.5)).toBeCloseTo(
            (100 * (20 / 30)) / 200,
        )
    })

    it('clamps the endpoints to 0 and 1', () => {
        expect(headDistanceFraction(timedTrack, true, true, 0)).toBe(0)
        expect(headDistanceFraction(timedTrack, true, true, 1)).toBe(1)
    })

    it('halts during a stop when pauseOnStop is on', () => {
        // Raw time 100 s; at 50% (50 s) the runner is mid-pause at 100 m.
        expect(headDistanceFraction(pausedTrack, true, true, 0.5)).toBeCloseTo(
            0.5,
        )
        // Just before the pause ends (79 s) the head is still at 100 m.
        expect(headDistanceFraction(pausedTrack, true, true, 0.79)).toBeCloseTo(
            0.5,
        )
    })

    it('keeps moving through a stop when pauseOnStop is off', () => {
        // Moving-only time 40 s; at 50% (20 s) the head is exactly at 100 m and
        // then advances instead of lingering.
        expect(headDistanceFraction(pausedTrack, true, false, 0.5)).toBeCloseTo(
            0.5,
        )
        // Past the (collapsed) pause the head has already moved on.
        expect(
            headDistanceFraction(pausedTrack, true, false, 0.6),
        ).toBeGreaterThan(0.5)
    })
})

describe('pinAppearFraction', () => {
    it('is the identity mapping without recorded speed', () => {
        expect(pinAppearFraction(untimedTrack, true, false, 0.5)).toBe(0.5)
    })

    it('inverts headDistanceFraction: the midpoint pin appears at 30 s / 40 s', () => {
        // The pin at 50% distance (100 m) sits at the 30 s mark → 0.75 of 40 s.
        expect(pinAppearFraction(timedTrack, true, true, 0.5)).toBeCloseTo(0.75)
    })

    it('round-trips with headDistanceFraction', () => {
        const distance = headDistanceFraction(timedTrack, true, true, 0.3)
        expect(pinAppearFraction(timedTrack, true, true, distance)).toBeCloseTo(
            0.3,
        )
    })

    it('places the mid pin at the start of the collapsed pause when off', () => {
        // The pin at 100 m appears when the head arrives (moving-time 20 s of
        // 40 s = 0.5), not after the pause.
        expect(pinAppearFraction(pausedTrack, true, false, 0.5)).toBeCloseTo(
            0.5,
        )
    })
})
