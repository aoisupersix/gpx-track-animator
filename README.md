# GPX Track Animator

A browser tool that draws the route from a GPX file on a map and exports it as a
still image or an animated video. All processing runs locally in the browser.

## Features

- Load a GPX file by drag-and-drop or file picker
- Preview the animation over an interactive map
- Export a PNG still or an H.264 MP4 animation
- Configurable output size (presets or custom), duration, frame rate, and line style
- English / Japanese UI (falls back to English)

## Requirements

- Node.js 20+
- MP4 export needs a browser with H.264 WebCodecs support (Chrome, Edge, Safari).
  PNG export works everywhere.

## Development

```bash
npm i          # install dependencies
npm run dev    # start the dev server
npm run build  # type-check and build for production
npm test       # run tests
npm run lint   # lint
```

## Tech stack

- React + TypeScript + Vite
- MapLibre GL for map rendering
- mediabunny for MP4 encoding via WebCodecs
