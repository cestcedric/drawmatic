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
import * as params from './util/params';
import { distSquared } from './util/util';

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
    this.path = [];
    this.gallery = document.getElementById('gallery');
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
    // Draw pointer = index tip
    if (hands != null && hands[0] != null && hands[0].keypoints != null) {
      const pointer = this.getPointer(hands[0].keypoints);
      this.drawPointer(pointer);
      this.path.push(pointer);
    }

    // Draw path
    this.drawPath();
  }

  /**
   * Computes pointer position
   *
   * TODO: add color info to pointer object
   *
   * @param {*} keypoints Keypoints of a hand
   * @returns
   */
  getPointer(keypoints) {
    // Hand pinching?
    const activated = this.activated(keypoints);

    // Position
    const x = activated
      ? (keypoints[4].x + keypoints[8].x) / 2
      : keypoints[8].x;
    const y = activated
      ? (keypoints[4].y + keypoints[8].y) / 2
      : keypoints[8].y;

    // Color and width info
    // TODO: connect to some frontend choice mechanism

    const color = 'White';
    const lineWidth = params.DEFAULT_LINE_WIDTH;

    return { ...this.smoothen(x, y), activated, color, lineWidth };
  }

  smoothen(x, y) {
    const prePath = this.path.slice(-params.DEFAULT_SMOOTHING);
    const sumX = x + prePath.reduce((acc, point) => acc + point.x, 0);
    const sumY = y + prePath.reduce((acc, point) => acc + point.y, 0);
    const weight = prePath.length + 1;
    return { x: sumX / weight, y: sumY / weight };
  }

  /**
   * Draw the pointer on the video, i.e. the point where thumb and index touch.
   *
   * Returns an object containing pointer info.
   *
   * @param keypoints A list of keypoints.
   */
  drawPointer(pointer) {
    this.ctx.fillStyle = pointer.color;
    this.ctx.strokeStyle = pointer.color;
    this.ctx.lineWidth = pointer.lineWidth;

    // Flip because camera is mirrored
    this.drawPoint(pointer.x - 2, pointer.y - 2, 5, pointer.activated);
  }

  /**
   * Draws path of fingers when pinched
   *
   * @param {*} closePath close path (default = false)
   */
  drawPath(closePath = false) {
    const region = new Path2D();

    if (this.path.length === 0) {
      return;
    }

    region.moveTo(this.path[0].x, this.path[0].y);

    for (let i = 1; i < this.path.length; i++) {
      const point = this.path[i];

      if (point.activated) {
        region.lineTo(point.x, point.y);
      } else {
        region.moveTo(point.x, point.y);
      }
    }

    if (closePath) {
      region.closePath();
    }
    this.ctx.stroke(region);
  }

  drawPoint(x, y, r, activated) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (activated) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  /**
   * Detects thumb and index finger form a pinch
   * @param hand A hand with keypoints to use to detect
   */
  activated(keypoints) {
    if (keypoints != null) {
      const fingertips = distSquared(
        keypoints[4], // thumb
        keypoints[8] // index
      );

      // pinch = thumb tip closer to index tip than first thumb segment long
      const thumbSize = distSquared(keypoints[4], keypoints[3]);
      const ratio = fingertips / thumbSize;

      if (ratio < 1.1) {
        return true;
      }
    }
    return false;
  }

  async takeSnapshot() {
    console.log('Oh snap!');
    const canvas = document.getElementById('output');
    const dataUrl = canvas.toDataURL('image/jpeg');
    const gallery = document.getElementById('gallery');
    const image = document.createElement('img');
    image.src = dataUrl;
    gallery.appendChild(image);
  }
}
