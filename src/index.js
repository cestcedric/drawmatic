/**
 * @license
 * Copyright 2023 Cédric Stark. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @Notice
 * Parts of this file have been modified from its original Google implementation found under
 * https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection.
 *
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import '@tensorflow/tfjs-backend-webgl';
import * as mpHands from '@mediapipe/hands';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handdetection from '@tensorflow-models/hand-pose-detection';
import { Camera } from './camera';
import { DEFAULT_CONFIG, STATE } from './util/params';
import { setBackendAndEnvFlags } from './util/util';

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

async function app() {
  console.log('Loading...');

  camera = await Camera.setupCamera(STATE.camera);
  await setBackendAndEnvFlags(STATE.flags, STATE.backend);
  detector = await createDetector();

  // connect buttons
  document.getElementById('snap').onclick = Camera.takeSnapshot(camera);
  document.getElementById('reset').onclick = Camera.resetPath(camera);

  renderPrediction();

  console.log("Let's go!");
}

app();
