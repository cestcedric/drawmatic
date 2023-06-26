import '@tensorflow/tfjs-backend-webgl';
import * as mpHands from '@mediapipe/hands';

import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';

import * as handdetection from '@tensorflow-models/hand-pose-detection';

import { Camera } from './camera';
import { setupDatGui } from './option_panel';
import { STATE } from './util/params';
import { setBackendAndEnvFlags } from './util/util';

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
);

let detector, camera;
let startInferenceTime,
  numInferences = 0;
let inferenceTimeSum = 0,
  lastPanelUpdate = 0;
let rafId;

const modelConfig = {
  runtime: 'mediapipe',
  model: 'MediaPipeHands',
  modelType: 'full',
  maxNumHands: 1,
};

async function createDetector() {
  return handdetection.createDetector(modelConfig.model, {
    runtime: modelConfig.runtime,
    modelType: modelConfig.type,
    maxHands: modelConfig.maxNumHands,
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}`,
  });
}

async function checkGuiUpdate() {
  if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {
    camera = await Camera.setupCamera(STATE.camera);
    STATE.isTargetFPSChanged = false;
    STATE.isSizeOptionChanged = false;
  }

  if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
    STATE.isModelChanged = true;

    window.cancelAnimationFrame(rafId);

    if (detector != null) {
      detector.dispose();
    }

    if (STATE.isFlagChanged || STATE.isBackendChanged) {
      await setBackendAndEnvFlags(STATE.flags, STATE.backend);
    }

    try {
      detector = await createDetector(STATE.model);
    } catch (error) {
      detector = null;
      alert(error);
    }

    STATE.isFlagChanged = false;
    STATE.isBackendChanged = false;
    STATE.isModelChanged = false;
  }
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

  // The null check makes sure the UI is not in the middle of changing to a
  // different model. If during model change, the result is from an old model,
  // which shouldn't be rendered.
  if (hands && hands.length > 0 && !STATE.isModelChanged) {
    camera.drawResults(hands);
  }

  // TODO:
}

async function renderPrediction() {
  await checkGuiUpdate();

  if (!STATE.isModelChanged) {
    await renderResult();
  }

  rafId = requestAnimationFrame(renderPrediction);
}

async function app() {
  // Gui content will change depending on which model is in the query string.
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('model')) {
    alert('Cannot find model in the query string.');
    return;
  }

  await setupDatGui(urlParams);

  camera = await Camera.setupCamera(STATE.camera);

  await setBackendAndEnvFlags(STATE.flags, STATE.backend);

  detector = await createDetector();

  renderPrediction();
}

app();
