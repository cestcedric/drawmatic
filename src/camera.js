/**
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
import * as scatter from 'scatter-gl';
import * as params from './util/params';

// These anchor points allow the hand pointcloud to resize according to its
// position in the input.
const ANCHOR_POINTS = [
  [0, 0, 0],
  [0, 0.1, 0],
  [-0.1, 0, 0],
  [-0.1, -0.1, 0],
];

const fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
}; // for rendering each finger as a polyline

const connections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export class Camera {
  constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('output');
    this.ctx = this.canvas.getContext('2d');
    this.path = []; // TODO: probably save path with color at that moment
  }

  /**
   * Initiate a Camera instance and wait for the camera stream to be ready.
   * @param cameraParam From app `STATE.camera`.
   */
  static async setupCamera(cameraParam) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available'
      );
    }

    const { targetFPS, sizeOption } = cameraParam;
    const $size = params.VIDEO_SIZE[sizeOption];
    const videoConfig = {
      audio: false,
      video: {
        facingMode: 'user',
        // Only setting the video to a specified size for large screen, on
        // mobile devices accept the default size.
        width: $size.width,
        height: $size.height,
        frameRate: {
          ideal: targetFPS,
        },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig);

    const camera = new Camera();
    camera.video.srcObject = stream;

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        resolve(video);
      };
    });

    camera.video.play();

    const videoWidth = camera.video.videoWidth;
    const videoHeight = camera.video.videoHeight;
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth;
    camera.video.height = videoHeight;

    camera.canvas.width = videoWidth;
    camera.canvas.height = videoHeight;
    const canvasContainer = document.querySelector('.canvas-wrapper');
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    // Because the image from camera is mirrored, need to flip horizontally.
    camera.ctx.translate(camera.video.videoWidth, 0);
    camera.ctx.scale(-1, 1);

    return camera;
  }

  drawCtx() {
    this.ctx.drawImage(
      this.video,
      0,
      0,
      this.video.videoWidth,
      this.video.videoHeight
    );
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  /**
   * Draw the keypoints on the video.
   * @param hands A list of hands to render.
   */
  drawResults(hands) {
    // Hand pinching?
    const activated = this.activated(hands[0]);

    // Draw pointer = index tip
    if (hands[0].keypoints != null) {
      this.drawPointer(hands[0].keypoints, activated);
    }

    // Save + draw path
    // this.drawPath(points, false);
  }

  /**
   * Draw the pointer on the video, i.e. the
   * @param keypoints A list of keypoints.
   */
  drawPointer(keypoints, activated) {
    const keypointsArray = keypoints;
    this.ctx.fillStyle = 'White'; // TODO: color picker
    this.ctx.strokeStyle = 'White';
    this.ctx.lineWidth = params.DEFAULT_LINE_WIDTH;

    // Flip because camera is mirrored
    const y = activated
      ? (keypointsArray[4].x + keypointsArray[8].x) / 2
      : keypointsArray[8].x;
    const x = activated
      ? (keypointsArray[4].y + keypointsArray[8].y) / 2
      : keypointsArray[8].y;

    this.drawPoint(x - 2, y - 2, 5, activated);
  }

  drawPath(points, closePath) {
    const region = new Path2D();
    region.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      region.lineTo(point.x, point.y);
    }

    if (closePath) {
      region.closePath();
    }
    this.ctx.stroke(region);
  }

  drawPoint(y, x, r, activated) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (activated) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  drawKeypoints3D(keypoints, handedness, ctxt) {
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;
    const pointsData = keypoints.map((keypoint) => [
      -keypoint.x,
      -keypoint.y,
      -keypoint.z,
    ]);

    const dataset = new scatter.ScatterGL.Dataset([
      ...pointsData,
      ...ANCHOR_POINTS,
    ]);

    ctxt.scatterGL.setPointColorer((i) => {
      if (keypoints[i] == null || keypoints[i].score < scoreThreshold) {
        // hide anchor points and low-confident points.
        return '#ffffff';
      }
      return handedness === 'Left' ? '#ff0000' : '#0000ff';
    });

    if (!ctxt.scatterGLHasInitialized) {
      ctxt.scatterGL.render(dataset);
    } else {
      ctxt.scatterGL.updateDataset(dataset);
    }
    const sequences = connections.map((pair) => ({ indices: pair }));
    ctxt.scatterGL.setSequences(sequences);
    ctxt.scatterGLHasInitialized = true;
  }

  /**
   * Detects thumb and index finger form a pinch
   * @param hand A hand with keypoints to use to detect
   */
  activated(hand) {
    if (hand.keypoints != null) {
      const fingertips = this.distSquared(
        hand.keypoints[4], // thumb
        hand.keypoints[8] // index
      );

      // pinch = thumb tip closer to index tip than first thumb segment long
      const thumbSize = this.distSquared(hand.keypoints[4], hand.keypoints[3]);
      const ratio = fingertips / thumbSize;

      if (ratio < 1.1) {
        return true;
      }
    }
    return false;
  }

  distSquared(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }
}
