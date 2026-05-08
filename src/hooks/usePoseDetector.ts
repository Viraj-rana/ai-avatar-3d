import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { drawAvatar, type AvatarConfig, type AvatarType, AVATARS } from "@/lib/avatarRenderer";

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

function computeRawData(landmarks: any[]): RawPoseData | null {
  if (!landmarks || landmarks.length === 0) return null;
  const lm = landmarks;
  const nose = lm[0];
  const lShoulder = lm[11]; const rShoulder = lm[12];
  const lWrist = lm[15]; const rWrist = lm[16];
  const lHip = lm[23]; const rHip = lm[24];
  const lAnkle = lm[27]; const rAnkle = lm[28];

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

function estimateMetrics(landmarks: any[], scaleFactor: number | null): BodyMetrics {
  if (!landmarks || landmarks.length === 0) {
    return {
      height: null, leftHandRaised: false, rightHandRaised: false,
      pose: "unknown", shoulderWidth: null, armSpan: null,
      torsoLength: null, legLength: null, headTilt: "center", confidence: 0,
    };
  }

  const lm = landmarks;
  const nose = lm[0];
  const lShoulder = lm[11]; const rShoulder = lm[12];
  const lWrist = lm[15]; const rWrist = lm[16];
  const lHip = lm[23]; const rHip = lm[24];
  const lKnee = lm[25]; const rKnee = lm[26];
  const lAnkle = lm[27]; const rAnkle = lm[28];

  const raw = computeRawData(landmarks)!;
  
  // If calibrated, use scale factor; otherwise rough estimate
  const sf = scaleFactor ?? (170 / raw.bodyHeightRatio);
  
  const heightCm = Math.round(raw.bodyHeightRatio * sf);
  const shoulderWidth = Math.round(raw.shoulderWidthRatio * sf);
  const torsoLength = Math.round(raw.torsoRatio * sf);
  const legLength = Math.round(raw.legRatio * sf);
  const armSpan = Math.round(raw.armSpanRatio * sf);

  // Hand raised detection
  const leftHandRaised = lWrist.y < lShoulder.y - 0.05;
  const rightHandRaised = rWrist.y < rShoulder.y - 0.05;

  // Pose detection
  const hipY = (lHip.y + rHip.y) / 2;
  const kneeY = (lKnee.y + rKnee.y) / 2;
  const ankleY = (lAnkle.y + rAnkle.y) / 2;
  const kneeAngle = Math.abs(kneeY - hipY) / Math.abs(ankleY - hipY);

  let pose: BodyMetrics["pose"] = "unknown";
  if (kneeAngle < 0.4) pose = "sitting";
  else if (Math.abs(lAnkle.x - rAnkle.x) > 0.15) pose = "walking";
  else pose = "standing";

  // Head tilt
  const headTilt = nose.x < (lShoulder.x + rShoulder.x) / 2 - 0.03
    ? "left" : nose.x > (lShoulder.x + rShoulder.x) / 2 + 0.03
    ? "right" : "center";

  const confidence = Math.round(
    ((lm[0].visibility + lm[11].visibility + lm[12].visibility + lm[23].visibility + lm[24].visibility) / 5) * 100
  );

  return { height: heightCm, leftHandRaised, rightHandRaised, pose, shoulderWidth, armSpan, torsoLength, legLength, headTilt, confidence };
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

export function usePoseDetector(): UsePoseDetectorReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const scaleFactorRef = useRef<number | null>(null);
  const latestLandmarksRef = useRef<any[] | null>(null);
  const [metrics, setMetrics] = useState<BodyMetrics>({
    height: null, leftHandRaised: false, rightHandRaised: false,
    pose: "unknown", shoulderWidth: null, armSpan: null,
    torsoLength: null, legLength: null, headTilt: "center", confidence: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [rawPoseData, setRawPoseData] = useState<RawPoseData | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<AvatarType>("none");
  const activeAvatarRef = useRef<AvatarType>("none");

  const handleSetAvatar = useCallback((avatar: AvatarType) => {
    setActiveAvatar(avatar);
    activeAvatarRef.current = avatar;
  }, []);

  const calibrate = useCallback((realHeightCm: number) => {
    const landmarks = latestLandmarksRef.current;
    if (!landmarks) return;
    const raw = computeRawData(landmarks);
    if (!raw || raw.bodyHeightRatio === 0) return;
    const sf = realHeightCm / raw.bodyHeightRatio;
    scaleFactorRef.current = sf;
    setIsCalibrated(true);
  }, []);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const result = poseLandmarker.detectForVideo(video, performance.now());

    if (result.landmarks && result.landmarks.length > 0) {
      const currentAvatar = activeAvatarRef.current;
      const avatarConfig = AVATARS.find(a => a.id === currentAvatar);
      
      if (currentAvatar === "none" || !avatarConfig) {
        // Default skeleton drawing
        const drawingUtils = new DrawingUtils(ctx);
        for (const landmark of result.landmarks) {
          drawingUtils.drawLandmarks(landmark, { radius: 3, color: "#00ffcc", fillColor: "#00ffcc44" });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, { color: "#00e5ff88", lineWidth: 2 });
        }
      } else {
        // Draw avatar overlay
        drawAvatar(ctx, result.landmarks[0], avatarConfig, canvas.width, canvas.height);
      }
      
      latestLandmarksRef.current = result.landmarks[0];
      setRawPoseData(computeRawData(result.landmarks[0]));
      setMetrics(estimateMetrics(result.landmarks[0], scaleFactorRef.current));
    }

    animationRef.current = requestAnimationFrame(detect);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setIsLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;
        poseLandmarkerRef.current = poseLandmarker;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraActive(true);
          setIsLoading(false);
          detect();
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Pose detection init error:", err);
          setError(err.message || "Failed to initialize camera or pose detection");
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationRef.current);
      const video = videoRef.current;
      if (video?.srcObject) { (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop()); }
      poseLandmarkerRef.current?.close();
    };
  }, [detect]);

  return { videoRef, canvasRef, metrics, isLoading, error, cameraActive, calibrate, isCalibrated, rawPoseData, setActiveAvatar: handleSetAvatar, activeAvatar };
}
