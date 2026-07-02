import { describe, expect, it } from 'vitest'

import { partialPath } from './pixel-path'

describe('partialPath', () => {
    // An L-shaped path with unequal segment lengths (10 m and 30 m).
    const pixels = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 30 },
    ]
    const cumulative = [0, 10, 40]

    it('returns an empty path for no points', () => {
        expect(partialPath([], [], 0.5)).toEqual([])
    })

    it('returns only the start point at progress 0', () => {
        expect(partialPath(pixels, cumulative, 0)).toEqual([{ x: 0, y: 0 }])
    })

    it('returns the full path at progress 1', () => {
        expect(partialPath(pixels, cumulative, 1)).toEqual(pixels)
    })

    it('interpolates at constant geographic speed, not per segment', () => {
        // progress 0.5 => 20 m of 40 m => one third into the 30 m segment.
        expect(partialPath(pixels, cumulative, 0.5)).toEqual([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
        ])
    })

    it('ends exactly on a vertex when the target distance hits it', () => {
        expect(partialPath(pixels, cumulative, 0.25)).toEqual([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ])
    })

    it('returns the full path for a zero-length track', () => {
        const stationary = [
            { x: 5, y: 5 },
            { x: 5, y: 5 },
        ]
        expect(partialPath(stationary, [0, 0], 0.5)).toEqual(stationary)
    })
})
