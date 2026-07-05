import { describe, expect, it } from 'vitest'

import { introCamera } from './zoom'

import type { Camera } from './zoom'

// Overview and fit share a center; only the zoom differs.
const start: Camera = { center: [10, 20], zoom: 4.5 }
const final: Camera = { center: [10, 20], zoom: 12 }

describe('introCamera', () => {
    it('returns the overview at fraction 0', () => {
        expect(introCamera(start, final, 0)).toEqual(start)
    })

    it('returns the fitted view at fraction 1', () => {
        expect(introCamera(start, final, 1)).toEqual(final)
    })

    it('eases symmetrically to the midpoint zoom at fraction 0.5', () => {
        const mid = introCamera(start, final, 0.5)
        expect(mid.center).toEqual([10, 20])
        expect(mid.zoom).toBeCloseTo(8.25)
    })

    it('clamps fractions outside 0..1 to the endpoints', () => {
        expect(introCamera(start, final, -1)).toEqual(start)
        expect(introCamera(start, final, 2)).toEqual(final)
    })
})
