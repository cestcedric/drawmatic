import '@tensorflow/tfjs-backend-webgl';
import * as mpHands from '@mediapipe/hands';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handdetection from '@tensorflow-models/hand-pose-detection';
import { Camera } from './camera';
import { DEFAULT_CONFIG, STATE } from './util/params';
import { setBackendAndEnvFlags } from './util/util';
import { image } from '@tensorflow/tfjs-core';

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
);

let detector, camera;
let rafId;

async function createDetector() {
  return handdetection.createDetector(DEFAULT_CONFIG.model, {
    runtime: DEFAULT_CONFIG.runtime,
    modelType: DEFAULT_CONFIG.type,
    maxHands: DEFAULT_CONFIG.maxNumHands,
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}`,
  });
}

async function renderResult() {
  if (camera.video.readyState < 2) {
    await new Promise((resolve) => {
      camera.video.onloadeddata = () => {
        resolve(video);
      };
    });
  }

  let hands = null;

  // Detector can be null if initialization failed (for example when loading
  // from a URL that does not exist).
  if (detector != null) {
    // Detectors can throw errors, for example when using custom URLs that
    // contain a model that doesn't provide the expected output.
    try {
      hands = await detector.estimateHands(camera.video, {
        flipHorizontal: false,
      });
    } catch (error) {
      detector.dispose();
      detector = null;
      alert(error);
    }
  }

  camera.drawCtx();

  camera.drawResults(hands);
}

async function renderPrediction() {
  await renderResult();
  rafId = requestAnimationFrame(renderPrediction);
}

async function takeSnapshot() {
  console.log('Oh snap!');
  const canvas = document.getElementById('output');
  const dataUrl = canvas.toDataURL('image/jpeg');
  const gallery = document.getElementById('gallery');
  const image = document.createElement('img');
  image.src = dataUrl;
  gallery.appendChild(image);
}

async function app() {
  console.log('Loading...');

  camera = await Camera.setupCamera(STATE.camera);
  await setBackendAndEnvFlags(STATE.flags, STATE.backend);
  detector = await createDetector();

  // connect buttons
  document.getElementById('snap').onclick = camera.takeSnapshot;

  renderPrediction();

  console.log("Let's go!");
}

app();
