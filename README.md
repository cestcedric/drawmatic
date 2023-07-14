# Drawmatic

## Overview

Draw images using nothing but your webcam and fingers!

## Link

Use [this link](http://127.0.0.1:5500/dist/index.html?model=mediapipe_hands) to access the locally deployed page.

## Roadmap

### v1

1. Get rid of Google parameters, stats ✔
1. Detect when thumb and index finger pinching ✔
1. Draw path of index finger when pinching ✔
1. Add button to export image ✔
1. Line smoothing ✔
1. Button to reset image = delete path ✔
1. Hide draw pointer when taking snapshot ✔
1. Do some design stuff
   1. Probably with bootstrap
   1. Add icon ✔
   1. Add About section to navbar

### v2

1. Line color
1. Stroke width

### v3

1. Easter egg: make peace sign to take snapshot
1. Train dedicated model for pinch recognition, might be faster
1. Light mode / dark mode

## Notes

- https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection
- https://www.reddit.com/r/WebAssembly/comments/9297tg/wasm_and_github_pages/
