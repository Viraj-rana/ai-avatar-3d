export type AvatarType = "none" | "ironman" | "spiderman" | "hulk" | "cyborg";

export interface AvatarConfig {
  id: AvatarType;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
}

export const AVATARS: AvatarConfig[] = [
  {
    id: "none",
    name: "None",
    emoji: "👤",
    colors: { primary: "#00ffcc", secondary: "#00e5ff", accent: "#00ffcc44", glow: "#00ffcc" },
  },
  {
    id: "ironman",
    name: "Iron Man",
    emoji: "🦾",
    colors: { primary: "#8A8D8F", secondary: "#D1D1D1", accent: "#E5E5E5", glow: "#00E5FF" },
  },
  {
    id: "spiderman",
    name: "Spider-Man",
    emoji: "🕷️",
    colors: { primary: "#cc0000", secondary: "#1a1aff", accent: "#000000", glow: "#ff2222" },
  },
  {
    id: "hulk",
    name: "Hulk",
    emoji: "💪",
    colors: { primary: "#2d8c2d", secondary: "#1a5c1a", accent: "#66cc66", glow: "#44ff44" },
  },
  {
    id: "cyborg",
    name: "Cyborg",
    emoji: "🤖",
    colors: { primary: "#888888", secondary: "#00ccff", accent: "#444444", glow: "#00eeff" },
  },
];

function dist(a: any, b: any): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: any, b: any) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  from: any,
  to: any,
  width: number,
  color: string,
  w: number,
  h: number
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.moveTo(from.x * w, from.y * h);
  ctx.lineTo(to.x * w, to.y * h);
  ctx.stroke();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  point: any,
  radius: number,
  fill: string,
  stroke: string,
  w: number,
  h: number
) {
  ctx.beginPath();
  ctx.arc(point.x * w, point.y * h, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawIronManHelmet(
  ctx: CanvasRenderingContext2D,
  nose: any,
  lShoulder: any,
  rShoulder: any,
  colors: AvatarConfig["colors"],
  w: number,
  h: number
) {
  const headSize = dist(lShoulder, rShoulder) * w * 0.6;
  const cx = nose.x * w;
  const cy = nose.y * h - headSize * 0.15;

  // Helmet - main shell
  ctx.beginPath();
  ctx.ellipse(cx, cy, headSize * 0.55, headSize * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.primary;
  ctx.fill();
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Face plate - Silver/Chrome look
  ctx.beginPath();
  ctx.ellipse(cx, cy + headSize * 0.05, headSize * 0.4, headSize * 0.45, 0, 0, Math.PI * 2);
  const grad = ctx.createLinearGradient(cx - headSize, cy, cx + headSize, cy);
  grad.addColorStop(0, colors.accent);
  grad.addColorStop(0.5, "#ffffff");
  grad.addColorStop(1, colors.accent);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = colors.secondary;
  ctx.stroke();

  // Eyes - Cyan Glow (Mark II style)
  const eyeW = headSize * 0.22;
  const eyeH = headSize * 0.08;
  const eyeY = cy - headSize * 0.05;
  
  // Left eye
  ctx.beginPath();
  ctx.ellipse(cx - headSize * 0.18, eyeY, eyeW, eyeH, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = colors.glow;
  ctx.stroke();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(cx + headSize * 0.18, eyeY, eyeW, eyeH, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = colors.glow;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Mouth line / Jaw detail
  ctx.beginPath();
  ctx.moveTo(cx - headSize * 0.2, cy + headSize * 0.3);
  ctx.lineTo(cx + headSize * 0.2, cy + headSize * 0.3);
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawChestPlate(
  ctx: CanvasRenderingContext2D,
  lShoulder: any,
  rShoulder: any,
  lHip: any,
  rHip: any,
  colors: AvatarConfig["colors"],
  w: number,
  h: number,
  avatarType: AvatarType
) {
  const mid = midpoint(lShoulder, rShoulder);
  const hipMid = midpoint(lHip, rHip);

  // Torso shape
  ctx.beginPath();
  ctx.moveTo(lShoulder.x * w, lShoulder.y * h);
  ctx.lineTo(rShoulder.x * w, rShoulder.y * h);
  ctx.lineTo(rHip.x * w, rHip.y * h);
  ctx.lineTo(lHip.x * w, lHip.y * h);
  ctx.closePath();
  ctx.fillStyle = colors.primary + "cc";
  ctx.fill();
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arc reactor / center emblem
  const centerX = mid.x * w;
  const centerY = (mid.y * h + hipMid.y * h) * 0.45 + mid.y * h * 0.1;
  const reactorR = dist(lShoulder, rShoulder) * w * 0.12;

  if (avatarType === "ironman") {
    // Suit panel detail lines
    ctx.beginPath();
    ctx.moveTo(lShoulder.x * w, lShoulder.y * h);
    ctx.lineTo(centerX, centerY - reactorR * 2);
    ctx.lineTo(rShoulder.x * w, rShoulder.y * h);
    ctx.strokeStyle = colors.secondary + "44";
    ctx.stroke();

    // arc reactor glow
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;
    drawCircle(ctx, { x: centerX / w, y: centerY / h }, reactorR, colors.glow + "88", colors.glow, w, h);
    drawCircle(ctx, { x: centerX / w, y: centerY / h }, reactorR * 0.6, colors.glow, colors.glow, w, h);
    ctx.shadowBlur = 0;
    drawArc(ctx, centerX, centerY, reactorR * 1.3, colors.glow + "66");
  } else if (avatarType === "spiderman") {
    // Spider emblem
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - reactorR);
    ctx.lineTo(centerX, centerY + reactorR);
    ctx.moveTo(centerX - reactorR, centerY);
    ctx.lineTo(centerX + reactorR, centerY);
    ctx.moveTo(centerX - reactorR * 0.7, centerY - reactorR * 0.7);
    ctx.lineTo(centerX + reactorR * 0.7, centerY + reactorR * 0.7);
    ctx.moveTo(centerX + reactorR * 0.7, centerY - reactorR * 0.7);
    ctx.lineTo(centerX - reactorR * 0.7, centerY + reactorR * 0.7);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (avatarType === "cyborg") {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    drawCircle(ctx, { x: centerX / w, y: centerY / h }, reactorR, colors.glow + "44", colors.glow, w, h);
    ctx.shadowBlur = 0;
    // Circuit lines
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * reactorR, centerY + Math.sin(angle) * reactorR);
      ctx.lineTo(centerX + Math.cos(angle) * reactorR * 2.5, centerY + Math.sin(angle) * reactorR * 2.5);
      ctx.strokeStyle = colors.glow + "88";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  avatar: AvatarConfig,
  canvasWidth: number,
  canvasHeight: number
) {
  if (avatar.id === "none" || !landmarks || landmarks.length === 0) return;

  const w = canvasWidth;
  const h = canvasHeight;
  const lm = landmarks;
  const colors = avatar.colors;

  const nose = lm[0];
  const lShoulder = lm[11];
  const rShoulder = lm[12];
  const lElbow = lm[13];
  const rElbow = lm[14];
  const lWrist = lm[15];
  const rWrist = lm[16];
  const lHip = lm[23];
  const rHip = lm[24];
  const lKnee = lm[25];
  const rKnee = lm[26];
  const lAnkle = lm[27];
  const rAnkle = lm[28];

  const limbWidth = dist(lShoulder, rShoulder) * w * 0.2;

  // Legs
  drawLimb(ctx, lHip, lKnee, limbWidth, colors.primary + "cc", w, h);
  drawLimb(ctx, lKnee, lAnkle, limbWidth * 0.85, colors.primary + "cc", w, h);
  drawLimb(ctx, rHip, rKnee, limbWidth, colors.primary + "cc", w, h);
  drawLimb(ctx, rKnee, rAnkle, limbWidth * 0.85, colors.primary + "cc", w, h);

  // Knee joints
  drawCircle(ctx, lKnee, limbWidth * 0.35, colors.secondary, colors.accent, w, h);
  drawCircle(ctx, rKnee, limbWidth * 0.35, colors.secondary, colors.accent, w, h);

  // Boots
  drawCircle(ctx, lAnkle, limbWidth * 0.4, colors.secondary, colors.glow + "66", w, h);
  drawCircle(ctx, rAnkle, limbWidth * 0.4, colors.secondary, colors.glow + "66", w, h);

  // Torso / chest plate
  drawChestPlate(ctx, lShoulder, rShoulder, lHip, rHip, colors, w, h, avatar.id);

  // Arms
  drawLimb(ctx, lShoulder, lElbow, limbWidth, colors.primary + "cc", w, h);
  drawLimb(ctx, lElbow, lWrist, limbWidth * 0.85, colors.primary + "cc", w, h);
  drawLimb(ctx, rShoulder, rElbow, limbWidth, colors.primary + "cc", w, h);
  drawLimb(ctx, rElbow, rWrist, limbWidth * 0.85, colors.primary + "cc", w, h);

  // Elbow joints
  drawCircle(ctx, lElbow, limbWidth * 0.3, colors.secondary, colors.accent, w, h);
  drawCircle(ctx, rElbow, limbWidth * 0.3, colors.secondary, colors.accent, w, h);

  // Shoulder pads
  drawCircle(ctx, lShoulder, limbWidth * 0.4, colors.secondary, colors.primary, w, h);
  drawCircle(ctx, rShoulder, limbWidth * 0.4, colors.secondary, colors.primary, w, h);

  // Gauntlets / hands with glow
  if (avatar.id === "ironman") {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
  }
  drawCircle(ctx, lWrist, limbWidth * 0.35, colors.secondary, colors.glow, w, h);
  drawCircle(ctx, rWrist, limbWidth * 0.35, colors.secondary, colors.glow, w, h);
  ctx.shadowBlur = 0;

  // Head / helmet
  drawIronManHelmet(ctx, nose, lShoulder, rShoulder, colors, w, h);
}
