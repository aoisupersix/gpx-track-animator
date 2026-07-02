import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { I18nProvider } from './lib/i18n'

import './app.css'

const rootElement = document.getElementById('root')
if (rootElement === null) {
    throw new Error('Root element not found')
}

createRoot(rootElement).render(
    <StrictMode>
        <I18nProvider>
            <App />
        </I18nProvider>
    </StrictMode>,
)
