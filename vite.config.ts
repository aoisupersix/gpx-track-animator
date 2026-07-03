import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(
    readFileSync(
        fileURLToPath(new URL('./package.json', import.meta.url)),
        'utf-8',
    ),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    test: {
        environment: 'node',
    },
})
