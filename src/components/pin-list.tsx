import { useI18n } from '../lib/i18n'

import type { RoutePin } from '../types'

type Props = {
    pins: RoutePin[]
    addingPin: boolean
    disabled: boolean
    onToggleAdd: () => void
    onLabelChange: (id: string, label: string) => void
    onDelete: (id: string) => void
}

export const PinList = ({
    pins,
    addingPin,
    disabled,
    onToggleAdd,
    onLabelChange,
    onDelete,
}: Props) => {
    const { t } = useI18n()
    const sorted = [...pins].sort((a, b) => a.progress - b.progress)

    return (
        <fieldset className="pins" disabled={disabled}>
            <legend>{t('pins.legend')}</legend>
            <button
                type="button"
                className={
                    addingPin ? 'pin-add-button active' : 'pin-add-button'
                }
                onClick={onToggleAdd}
            >
                {addingPin ? t('pins.cancel') : t('pins.add')}
            </button>
            {sorted.length === 0 ? (
                <p className="pins-empty">{t('pins.empty')}</p>
            ) : (
                <ul className="pin-list">
                    {sorted.map((pin) => (
                        <li key={pin.id} className="pin-item">
                            <span className="pin-position">
                                {t('pins.position', {
                                    percent: Math.round(pin.progress * 100),
                                })}
                            </span>
                            <input
                                type="text"
                                className="pin-label-input"
                                value={pin.label}
                                placeholder={t('pins.labelPlaceholder')}
                                onChange={(event) =>
                                    onLabelChange(pin.id, event.target.value)
                                }
                            />
                            <button
                                type="button"
                                className="pin-delete-button"
                                aria-label={t('pins.delete')}
                                onClick={() => onDelete(pin.id)}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </fieldset>
    )
}
