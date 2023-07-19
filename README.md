# Drawmatic

---

Draw images using nothing but your webcam, a neural network, and your hand!

- TODO: add GIF

## Intro

This repository contains my final project for Harvard's CS50.
You too can enjoy this course by heading over to [the CS50 website](https://cs50.harvard.edu/x/).

Drawmatic is built using Google's tensorflowjs [hand pose model](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) and [bootstrap](https://getbootstrap.com/).

---

## Assumptions

A few basic assumptions have been made:

- The camera is (reasonably) static
- While there are no limitations on the background, this software performs better when the user's hand is clearly distinguishable from the background
- Only one hand can be used to draw at a time, having multiple hands in frame can lead to the software randomly selecting one of them => try to only have one hand visible

---

## Usage

Drawmatic uses the hand pose model to detect the positions of your fingers. The tip of your index finger will be highlighted with a small circle at all times.

To activate draw mode pinch using thumb and index finger (like so 👌), as soon as the tips touch the circle fills and you start drawing. Stop pinching to switch back to tracking mode and stop drawing.

Once you're satisfied with your artwork click `Snap!` to create a snapshot. You can also delete everything you drew by hitting `Reset` and start over.

- TODO: photo when not touching
- TODO: photo when touching

### Pinch Detection

The Hand Pose model detects 20 key points: one for each finger segment, one at the wrist. In order to be flexible with regards to camera resolution this software uses a relative measure to detect a pinch:

```js
const ratio = dist(thumb tip, index tip) / length(last thumb segment);
const pinching = ratio < 1.1
```

- TODO: photo with keypoints and relevant distances

### Drawing

The position of the marker (and other info, e.g. "pinch"/"no pinch") is recorded for every frame and its path drawn onto an HTML canvas, overlayed over the webcam feed.

Drawing every single point identified by the algorithm desribed above leads to a super jittery line, while pretty good the hand pose model is not perfect in identifying the key points.  
A significantly smoother line is achieved by averaging the position of the current marker and the previous one:

```js
const position[t] = (position[t] + position[t - 1]) / 2
```

Averaging over more than the last two positions leads to an even smoother line, but leads to the marker lagging considerably behind the actual finger position.

For snapshots a second canvas is created but not displayed.  
That way the marker can be hidden without adding unnecessary complex logic to the live feed.

You can see a demo [here]()

- TODO: add video
- TODO: screenshot with snapshot next to camera feed

---

## Deployment

### Local Deployment

You can build and deploy Drawmatic locally using NodeJS and your favourite server.

1. Clone the repository with `git clone git@github.com:cestcedric/drawmatic.git`
1. Install all dependencies `npm run install`
1. Build using `npm run build`
1. Start your server and open `[base-url]:[port]/dist` with your web browser
1. Enable webcam access and you're good to go!

### Web Version

- TODO: deploy to github pages

1. Head over to [link]()
1. Enable webcam access
1. Have fun!

---

## How to contribute

Open an issue to let me know what you want to tackle, then mention it in the PR.  
Alternatively: get inspired and build your own thing using whatever part of Drawmatic you like 😊

Have a look at the roadmap below to see which features I'd like to add in future release.

### Roadmap

#### v1

1. Get rid of Google implementation parameters, stats ✔
1. Detect when thumb and index finger pinch ✔
1. Draw path of index finger when pinch ✔
1. Add button to export image ✔
1. Line smoothing ✔
1. Button to reset image = delete path ✔
1. Hide draw pointer when taking snapshot ✔
1. Do some design stuff
   1. Probably with bootstrap ✔
   1. Add icon ✔
   1. Add "About" section to navbar ✔
1. Try model (full/lite) and video size combinations for maximum performance
1. Deploy to github pages
   1. https://www.reddit.com/r/WebAssembly/comments/9297tg/wasm_and_github_pages/

#### v2

1. Line color
1. Stroke width

#### v3

1. Allow different camera sizes
   1. https://css-tricks.com/updating-a-css-variable-with-javascript/
1. Easter egg: make peace sign to take snapshot
1. Train dedicated model for pinch recognition, might be faster
1. Light mode / dark mode
