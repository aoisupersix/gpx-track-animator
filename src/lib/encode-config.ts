/**
 * Derives the H.264 codec string and bitrate for an arbitrary output size,
 * so exports work at any resolution instead of only the fixed default one.
 */

const MACROBLOCK = 16

/** [levelHex, maxMacroblocksPerSecond, maxFrameMacroblocks] per H.264 Annex A. */
type Level = readonly [number, number, number]

const LEVELS: readonly Level[] = [
    [0x1e, 40_500, 1620], // 3.0
    [0x1f, 108_000, 3600], // 3.1
    [0x20, 216_000, 5120], // 3.2
    [0x28, 245_760, 8192], // 4.0
    [0x29, 245_760, 8192], // 4.1
    [0x2a, 522_240, 8704], // 4.2
    [0x32, 589_824, 22_080], // 5.0
    [0x33, 983_040, 36_864], // 5.1
    [0x34, 2_073_600, 36_864], // 5.2
    [0x3c, 4_177_920, 139_264], // 6.0
    [0x3d, 8_355_840, 139_264], // 6.1
]

/** 6.2 — the highest defined level; used when nothing smaller fits. */
const MAX_LEVEL: Level = [0x3e, 16_711_680, 139_264]

const levelHex = (width: number, height: number, fps: number): number => {
    const frameMbs =
        Math.ceil(width / MACROBLOCK) * Math.ceil(height / MACROBLOCK)
    const mbPerSec = frameMbs * fps
    const level =
        LEVELS.find(
            ([, maxRate, maxFrame]) =>
                mbPerSec <= maxRate && frameMbs <= maxFrame,
        ) ?? MAX_LEVEL
    return level[0]
}

/** High profile (0x64), no constraint flags, level chosen from the frame size. */
export const h264CodecString = (
    width: number,
    height: number,
    fps: number,
): string =>
    `avc1.6400${levelHex(width, height, fps).toString(16).padStart(2, '0')}`

/** Tuned so the default 2560x1440@60 yields ~12 Mbps; scales with pixels. */
const BITS_PER_PIXEL_PER_FRAME = 12_000_000 / (2560 * 1440 * 60)

export const videoBitrate = (
    width: number,
    height: number,
    fps: number,
): number =>
    Math.max(
        Math.round(width * height * fps * BITS_PER_PIXEL_PER_FRAME),
        2_000_000,
    )
