import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface Connection {
  start: number;
  end: number;
}

/** Batch-draw all connections in one stroke — much faster than per-line. */
export function drawConnectionsBatched(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: Connection[],
  width: number,
  height: number,
  color: string,
  lineWidth: number,
  skipVisibility = false
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const { start, end } of connections) {
    const from = landmarks[start];
    const to = landmarks[end];
    if (!from || !to) continue;
    if (!skipVisibility) {
      if (from.visibility !== undefined && from.visibility < 0.2) continue;
      if (to.visibility !== undefined && to.visibility < 0.2) continue;
    }
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
  }
  ctx.stroke();
}

/** Batch-draw landmark dots. */
export function drawDotsBatched(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  radius: number,
  fill: string,
  skipVisibility = false
) {
  ctx.fillStyle = fill;
  for (const lm of landmarks) {
    if (!skipVisibility && lm.visibility !== undefined && lm.visibility < 0.2) continue;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** MediaPipe-demo style: dense face mesh, green hands, cyan body. */
export function drawMediaPipeOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: {
    poseLandmarks: NormalizedLandmark[][];
    handLandmarks: NormalizedLandmark[][];
    faceLandmarks: NormalizedLandmark[][];
    poseConnections: Connection[];
    handConnections: Connection[];
    faceTesselation: Connection[];
    faceContours: Connection[];
    faceLeftEye: Connection[];
    faceRightEye: Connection[];
    faceLeftIris: Connection[];
    faceRightIris: Connection[];
    faceLips: Connection[];
    faceLeftEyebrow: Connection[];
    faceRightEyebrow: Connection[];
    showBody: boolean;
  }
) {
  // ── Face mesh (468 pts) — draw first, behind body/hands ──
  for (const face of data.faceLandmarks) {
    // Wireframe tesselation (subtle blue grid like MediaPipe demo)
    drawConnectionsBatched(ctx, face, data.faceTesselation, width, height, "#4488ff55", 0.5, true);
    drawDotsBatched(ctx, face, width, height, 1.2, "#5599ffaa", true);

    // Pink/magenta feature outlines
    drawConnectionsBatched(ctx, face, data.faceContours, width, height, "#ff44aa", 1.5, true);
    drawConnectionsBatched(ctx, face, data.faceLeftEyebrow, width, height, "#ff44aa", 1.5, true);
    drawConnectionsBatched(ctx, face, data.faceRightEyebrow, width, height, "#ff44aa", 1.5, true);
    drawConnectionsBatched(ctx, face, data.faceLeftEye, width, height, "#ff66cc", 2, true);
    drawConnectionsBatched(ctx, face, data.faceRightEye, width, height, "#ff66cc", 2, true);
    drawConnectionsBatched(ctx, face, data.faceLips, width, height, "#ff44aa", 2, true);

    // Iris rings (white highlight)
    drawConnectionsBatched(ctx, face, data.faceLeftIris, width, height, "#ffffff", 2, true);
    drawConnectionsBatched(ctx, face, data.faceRightIris, width, height, "#ffffff", 2, true);
  }

  // ── Body pose — cyan/turquoise lines & nodes ──
  if (data.showBody) {
    for (const pose of data.poseLandmarks) {
      drawConnectionsBatched(ctx, pose, data.poseConnections, width, height, "#00e5ff", 3);
      drawDotsBatched(ctx, pose, width, height, 4, "#00ffcc");
    }
  }

  // ── Hands — cyan skeleton & nodes (21 pts each) ──
  for (const hand of data.handLandmarks) {
    drawConnectionsBatched(ctx, hand, data.handConnections, width, height, "#00e5ff", 3, true);
    drawDotsBatched(ctx, hand, width, height, 4, "#00ffcc", true);
  }
}
