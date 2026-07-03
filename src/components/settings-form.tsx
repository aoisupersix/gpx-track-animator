import {
    MAX_EXPORT_SIZE,
    MIN_EXPORT_SIZE,
    RESOLUTION_PRESETS,
} from '../lib/constants'
import { useI18n } from '../lib/i18n'

import type { RenderSettings } from '../types'
import type { ChangeEvent } from 'react'

type Props = {
    settings: RenderSettings
    disabled: boolean
    onChange: (settings: RenderSettings) => void
}

const applyNumber = (
    event: ChangeEvent<HTMLInputElement>,
    apply: (value: number) => void,
): void => {
    const value = event.target.valueAsNumber
    if (Number.isFinite(value)) {
        apply(value)
    }
}

/** H.264 needs even dimensions; keep values inside the supported range. */
const clampSize = (value: number): number => {
    const bounded = Math.min(Math.max(value, MIN_EXPORT_SIZE), MAX_EXPORT_SIZE)
    return Math.round(bounded / 2) * 2
}

const CUSTOM = 'custom'

const presetKey = (settings: RenderSettings): string => {
    const match = RESOLUTION_PRESETS.find(
        (preset) =>
            preset.width === settings.width &&
            preset.height === settings.height,
    )
    return match?.name ?? CUSTOM
}

export const SettingsForm = ({ settings, disabled, onChange }: Props) => {
    const { t } = useI18n()

    const update = (patch: Partial<RenderSettings>): void => {
        onChange({ ...settings, ...patch })
    }

    const handlePresetChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        const preset = RESOLUTION_PRESETS.find(
            (item) => item.name === event.target.value,
        )
        if (preset !== undefined) {
            update({ width: preset.width, height: preset.height })
        }
    }

    return (
        <fieldset className="settings" disabled={disabled}>
            <legend>{t('settings.legend')}</legend>
            <label>
                {t('settings.resolution')}
                <select
                    className="resolution-select"
                    value={presetKey(settings)}
                    onChange={handlePresetChange}
                >
                    {RESOLUTION_PRESETS.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                            {`${preset.name} (${preset.width}×${preset.height})`}
                        </option>
                    ))}
                    <option value={CUSTOM} disabled>
                        {t('preset.custom')}
                    </option>
                </select>
            </label>
            <label>
                {t('settings.width')}
                <input
                    type="number"
                    min={MIN_EXPORT_SIZE}
                    max={MAX_EXPORT_SIZE}
                    step={2}
                    value={settings.width}
                    onChange={(event) =>
                        applyNumber(event, (width) =>
                            update({ width: clampSize(width) }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.height')}
                <input
                    type="number"
                    min={MIN_EXPORT_SIZE}
                    max={MAX_EXPORT_SIZE}
                    step={2}
                    value={settings.height}
                    onChange={(event) =>
                        applyNumber(event, (height) =>
                            update({ height: clampSize(height) }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.duration')}
                <input
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.1}
                    value={settings.durationSec}
                    onChange={(event) =>
                        applyNumber(event, (durationSec) =>
                            update({ durationSec }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.endHold')}
                <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={settings.endHoldSec}
                    onChange={(event) =>
                        applyNumber(event, (endHoldSec) =>
                            update({ endHoldSec }),
                        )
                    }
                />
            </label>
            <label className="settings-checkbox">
                <input
                    type="checkbox"
                    checked={settings.speedBased}
                    onChange={(event) =>
                        update({ speedBased: event.target.checked })
                    }
                />
                {t('settings.speedBased')}
            </label>
            <label className="settings-checkbox">
                <input
                    type="checkbox"
                    checked={settings.pauseOnStop}
                    disabled={!settings.speedBased}
                    onChange={(event) =>
                        update({ pauseOnStop: event.target.checked })
                    }
                />
                {t('settings.pauseOnStop')}
            </label>
            <label>
                {t('settings.fps')}
                <select
                    value={settings.fps}
                    onChange={(event) =>
                        update({ fps: event.target.value === '30' ? 30 : 60 })
                    }
                >
                    <option value="60">60 fps</option>
                    <option value="30">30 fps</option>
                </select>
            </label>
            <label>
                {t('settings.lineColor')}
                <input
                    type="color"
                    value={settings.lineColor}
                    onChange={(event) =>
                        update({ lineColor: event.target.value })
                    }
                />
            </label>
            <label>
                {t('settings.lineWidth')}
                <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={settings.lineWidth}
                    onChange={(event) =>
                        applyNumber(event, (lineWidth) => update({ lineWidth }))
                    }
                />
            </label>
            <label>
                {t('settings.lineOpacity', {
                    value: settings.lineOpacity.toFixed(2),
                })}
                <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={settings.lineOpacity}
                    onChange={(event) =>
                        applyNumber(event, (lineOpacity) =>
                            update({ lineOpacity }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.pinDropHeight')}
                <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={settings.pinDropHeight}
                    onChange={(event) =>
                        applyNumber(event, (pinDropHeight) =>
                            update({ pinDropHeight }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.pinDropSec')}
                <input
                    type="number"
                    min={0.05}
                    max={2}
                    step={0.05}
                    value={settings.pinDropSec}
                    onChange={(event) =>
                        applyNumber(event, (pinDropSec) =>
                            update({ pinDropSec }),
                        )
                    }
                />
            </label>
            <label>
                {t('settings.pinBounce', {
                    value: settings.pinBounce.toFixed(2),
                })}
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.pinBounce}
                    onChange={(event) =>
                        applyNumber(event, (pinBounce) => update({ pinBounce }))
                    }
                />
            </label>
        </fieldset>
    )
}
