import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { drawAvatar, type AvatarType, AVATARS } from "@/lib/avatarRenderer";
import { drawMediaPipeOverlay } from "@/lib/landmarkDrawing";

export interface BodyMetrics {
  height: number | null;
  leftHandRaised: boolean;
  rightHandRaised: boolean;
  pose: "standing" | "sitting" | "walking" | "unknown";
  shoulderWidth: number | null;
  armSpan: number | null;
  torsoLength: number | null;
  legLength: number | null;
  headTilt: string;
  confidence: number;
}

export interface RawPoseData {
  noseY: number;
  ankleY: number;
  bodyHeightRatio: number;
  shoulderWidthRatio: number;
  torsoRatio: number;
  legRatio: number;
  armSpanRatio: number;
}

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function computeRawData(landmarks: NormalizedLandmark[] | null): RawPoseData | null {
  if (!landmarks || landmarks.length === 0) return null;
  const lm = landmarks;
  const nose = lm[0];
  const lShoulder = lm[11];
  const rShoulder = lm[12];
  const lWrist = lm[15];
  const rWrist = lm[16];
  const lHip = lm[23];
  const rHip = lm[24];
  const lAnkle = lm[27];
  const rAnkle = lm[28];

  const hipY = (lHip.y + rHip.y) / 2;
  const ankleY = Math.max(lAnkle.y, rAnkle.y);
  const bodyHeightRatio = Math.abs(nose.y - ankleY);

  return {
    noseY: nose.y,
    ankleY,
    bodyHeightRatio,
    shoulderWidthRatio: Math.abs(lShoulder.x - rShoulder.x),
    torsoRatio: Math.abs((lShoulder.y + rShoulder.y) / 2 - hipY),
    legRatio: Math.abs(hipY - ankleY),
    armSpanRatio: Math.abs(lWrist.x - rWrist.x),
  };
}

function estimateMetrics(landmarks: NormalizedLandmark[], scaleFactor: number | null): BodyMetrics {
  if (!landmarks || landmarks.length === 0) {
    return {
      height: null,
      leftHandRaised: false,
      rightHandRaised: false,
      pose: "unknown",
      shoulderWidth: null,
      armSpan: null,
      torsoLength: null,
      legLength: null,
      headTilt: "center",
      confidence: 0,
    };
  }

  const lm = landmarks;
  const nose = lm[0];
  const lShoulder = lm[11];
  const rShoulder = lm[12];
  const lWrist = lm[15];
  const rWrist = lm[16];
  const lHip = lm[23];
  const rHip = lm[24];
  const lKnee = lm[25];
  const rKnee = lm[26];
  const lAnkle = lm[27];
  const rAnkle = lm[28];

  const raw = computeRawData(landmarks)!;
  const sf = scaleFactor ?? 170 / raw.bodyHeightRatio;

  const hipY = (lHip.y + rHip.y) / 2;
  const kneeY = (lKnee.y + rKnee.y) / 2;
  const ankleY = (lAnkle.y + rAnkle.y) / 2;
  const kneeAngle = Math.abs(kneeY - hipY) / Math.abs(ankleY - hipY);

  let pose: BodyMetrics["pose"] = "unknown";
  if (kneeAngle < 0.4) pose = "sitting";
  else if (Math.abs(lAnkle.x - rAnkle.x) > 0.15) pose = "walking";
  else pose = "standing";

  const headTilt =
    nose.x < (lShoulder.x + rShoulder.x) / 2 - 0.03
      ? "left"
      : nose.x > (lShoulder.x + rShoulder.x) / 2 + 0.03
        ? "right"
        : "center";

  const confidence = Math.round(
    ((lm[0].visibility ?? 1) +
      (lm[11].visibility ?? 1) +
      (lm[12].visibility ?? 1) +
      (lm[23].visibility ?? 1) +
      (lm[24].visibility ?? 1)) /
      5 *
      100
  );

  return {
    height: Math.round(raw.bodyHeightRatio * sf),
    leftHandRaised: lWrist.y < lShoulder.y - 0.05,
    rightHandRaised: rWrist.y < rShoulder.y - 0.05,
    pose,
    shoulderWidth: Math.round(raw.shoulderWidthRatio * sf),
    armSpan: Math.round(raw.armSpanRatio * sf),
    torsoLength: Math.round(raw.torsoRatio * sf),
    legLength: Math.round(raw.legRatio * sf),
    headTilt,
    confidence,
  };
}

interface UsePoseDetectorReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  metrics: BodyMetrics;
  isLoading: boolean;
  error: string | null;
  cameraActive: boolean;
  calibrate: (realHeightCm: number) => void;
  isCalibrated: boolean;
  rawPoseData: RawPoseData | null;
  setActiveAvatar: (avatar: AvatarType) => void;
  activeAvatar: AvatarType;
}

type LandmarkerBundle = {
  pose: PoseLandmarker;
  hand: HandLandmarker;
  face: FaceLandmarker;
};

async function createLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  gpuCanvas: HTMLCanvasElement,
  delegate: "GPU" | "CPU"
): Promise<LandmarkerBundle> {
  const base = { delegate, modelAssetPath: "" };

  const [pose, hand, face] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { ...base, modelAssetPath: POSE_MODEL },
      runningMode: "VIDEO",
      canvas: gpuCanvas,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { ...base, modelAssetPath: HAND_MODEL },
      runningMode: "VIDEO",
      canvas: gpuCanvas,
      numHands: 2,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { ...base, modelAssetPath: FACE_MODEL },
      runningMode: "VIDEO",
      canvas: gpuCanvas,
      numFaces: 1,
      minFaceDetectionConfidence: 0.4,
      minFacePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    }),
  ]);

  return { pose, hand, face };
}

export function usePoseDetector(): UsePoseDetectorReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const landmarkersRef = useRef<LandmarkerBundle | null>(null);
  const animationRef = useRef<number>(0);
  const scaleFactorRef = useRef<number | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const latestRawPoseRef = useRef<RawPoseData | null>(null);
  const latestMetricsRef = useRef<BodyMetrics | null>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const lastVideoTimeRef = useRef(-1);
  const activeAvatarRef = useRef<AvatarType>("none");

  const [metrics, setMetrics] = useState<BodyMetrics>({
    height: null,
    leftHandRaised: false,
    rightHandRaised: false,
    pose: "unknown",
    shoulderWidth: null,
    armSpan: null,
    torsoLength: null,
    legLength: null,
    headTilt: "center",
    confidence: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [rawPoseData, setRawPoseData] = useState<RawPoseData | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<AvatarType>("none");

  const handleSetAvatar = useCallback((avatar: AvatarType) => {
    setActiveAvatar(avatar);
    activeAvatarRef.current = avatar;
  }, []);

  const calibrate = useCallback((realHeightCm: number) => {
    const landmarks = latestLandmarksRef.current;
    if (!landmarks) return;
    const raw = computeRawData(landmarks);
    if (!raw || raw.bodyHeightRatio === 0) return;
    scaleFactorRef.current = realHeightCm / raw.bodyHeightRatio;
    setIsCalibrated(true);
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const bundle = landmarkersRef.current;

    if (!video || !canvas || !bundle || video.readyState < 2) return;

    if (canvasSizeRef.current.w !== video.videoWidth || canvasSizeRef.current.h !== video.videoHeight) {
      canvasSizeRef.current = { w: video.videoWidth, h: video.videoHeight };
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctxRef.current = canvas.getContext("2d", { alpha: true, desynchronized: true });
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    const timestamp = Math.max(video.currentTime * 1000, performance.now());
    if (timestamp <= lastVideoTimeRef.current) return;
    lastVideoTimeRef.current = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { pose: poseLm, hand: handLm, face: faceLm } = bundle;
    const poseResult = poseLm.detectForVideo(video, timestamp);
    const handResult = handLm.detectForVideo(video, timestamp);
    const faceResult = faceLm.detectForVideo(video, timestamp);

    const w = canvas.width;
    const h = canvas.height;
    const currentAvatar = activeAvatarRef.current;
    const avatarConfig = AVATARS.find((a) => a.id === currentAvatar);
    const hasPose = poseResult.landmarks.length > 0;

    if (currentAvatar !== "none" && avatarConfig && hasPose) {
      drawAvatar(ctx, poseResult.landmarks[0], avatarConfig, w, h);
    }

    drawMediaPipeOverlay(ctx, w, h, {
      poseLandmarks: currentAvatar === "none" ? poseResult.landmarks : [],
      handLandmarks: handResult.landmarks,
      faceLandmarks: faceResult.faceLandmarks,
      poseConnections: PoseLandmarker.POSE_CONNECTIONS,
      handConnections: HandLandmarker.HAND_CONNECTIONS,
      faceTesselation: FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      faceContours: FaceLandmarker.FACE_LANDMARKS_CONTOURS,
      faceLeftEye: FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      faceRightEye: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      faceLeftIris: FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
      faceRightIris: FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
      faceLips: FaceLandmarker.FACE_LANDMARKS_LIPS,
      faceLeftEyebrow: FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      faceRightEyebrow: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      showBody: currentAvatar === "none",
    });

    if (hasPose) {
      latestLandmarksRef.current = poseResult.landmarks[0];
      latestRawPoseRef.current = computeRawData(poseResult.landmarks[0]);
      latestMetricsRef.current = estimateMetrics(
        poseResult.landmarks[0],
        scaleFactorRef.current
      );
    }
  }, []);

  const detectLoop = useCallback(() => {
    processFrame();
    animationRef.current = requestAnimationFrame(detectLoop);
  }, [processFrame]);

  // Sync UI metrics at 4 Hz — keeps sidebar smooth without blocking the render loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (latestRawPoseRef.current) setRawPoseData(latestRawPoseRef.current);
      if (latestMetricsRef.current) setMetrics(latestMetricsRef.current);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function waitForVideoRef(maxAttempts = 50): Promise<HTMLVideoElement | null> {
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return null;
        if (videoRef.current) return videoRef.current;
        await new Promise((r) => setTimeout(r, 50));
      }
      return videoRef.current;
    }

    async function startCamera(): Promise<MediaStream> {
      const tries: MediaStreamConstraints[] = [
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
            frameRate: { ideal: 30, max: 30 },
          },
        },
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            frameRate: { ideal: 30, max: 30 },
          },
        },
      ];
      for (const c of tries) {
        try {
          return await navigator.mediaDevices.getUserMedia(c);
        } catch {
          continue;
        }
      }
      throw new Error("Could not access camera. Please allow camera permission.");
    }

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        const gpuCanvas = document.createElement("canvas");
        gpuCanvas.width = 640;
        gpuCanvas.height = 480;

        let bundle: LandmarkerBundle;
        try {
          bundle = await createLandmarker(vision, gpuCanvas, "GPU");
        } catch {
          bundle = await createLandmarker(vision, gpuCanvas, "CPU");
        }

        if (cancelled) {
          bundle.pose.close();
          bundle.hand.close();
          bundle.face.close();
          return;
        }
        landmarkersRef.current = bundle;

        const stream = await startCamera();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = await waitForVideoRef();
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error("Camera element not ready. Please reload the page.");
        }

        video.srcObject = stream;
        await video.play();
        setCameraActive(true);
        setIsLoading(false);

        type VideoWithFrameCb = HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        };
        const videoEl = video as VideoWithFrameCb;

        if (videoEl.requestVideoFrameCallback) {
          const onFrame = () => {
            if (cancelled) return;
            processFrame();
            videoEl.requestVideoFrameCallback!(onFrame);
          };
          videoEl.requestVideoFrameCallback(onFrame);
        } else {
          detectLoop();
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Pose detection init error:", err);
          setError(err instanceof Error ? err.message : "Failed to initialize tracking");
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationRef.current);
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      const bundle = landmarkersRef.current;
      bundle?.pose.close();
      bundle?.hand.close();
      bundle?.face.close();
    };
  }, [processFrame, detectLoop]);

  return {
    videoRef,
    canvasRef,
    metrics,
    isLoading,
    error,
    cameraActive,
    calibrate,
    isCalibrated,
    rawPoseData,
    setActiveAvatar: handleSetAvatar,
    activeAvatar,
  };
}
