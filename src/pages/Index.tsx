import { useState } from "react";
import { usePoseDetector } from "@/hooks/usePoseDetector";
import MetricsPanel from "@/components/MetricsPanel";
import CalibrationModal from "@/components/CalibrationModal";
import AvatarSelector from "@/components/AvatarSelector";

const Index = () => {
  const { videoRef, canvasRef, metrics, isLoading, error, cameraActive, calibrate, isCalibrated, rawPoseData, setActiveAvatar, activeAvatar } = usePoseDetector();
  const [showCalibration, setShowCalibration] = useState(true);
  const [skippedCalibration, setSkippedCalibration] = useState(false);

  const handleCalibrate = (heightCm: number) => {
    if (heightCm > 0) {
      calibrate(heightCm);
    } else {
      setSkippedCalibration(true);
    }
    setShowCalibration(false);
  };

  const handleRecalibrate = () => {
    setShowCalibration(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Calibration Modal */}
      {showCalibration && cameraActive && !isLoading && (
        <CalibrationModal
          onCalibrate={handleCalibrate}
          hasBodyDetected={rawPoseData !== null && (rawPoseData.bodyHeightRatio > 0.1)}
        />
      )}

      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse-neon neon-glow" />
          <h1 className="font-display text-sm md:text-base tracking-[0.3em] uppercase text-foreground">
            AI Body Scanner
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isCalibrated && (
            <span className="text-[10px] font-mono text-accent">✓ CALIBRATED</span>
          )}
          {!showCalibration && cameraActive && (
            <button
              onClick={handleRecalibrate}
              className="text-[10px] font-display tracking-[0.15em] uppercase px-2 py-1 border border-border rounded hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors"
            >
              Recalibrate
            </button>
          )}
          <div className="text-[10px] font-mono text-muted-foreground">
            v1.0 | MediaPipe Holistic
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Camera Section */}
        <div className="flex-1 relative flex items-center justify-center min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="w-16 h-16 border-2 border-primary/30 border-t-primary rounded-full animate-spin neon-glow mb-4" />
              <p className="font-display text-sm tracking-[0.3em] text-primary neon-text animate-pulse-neon">
                INITIALIZING SCANNER
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Loading pose, hand & face models...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full border-2 border-destructive flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="font-display text-sm tracking-[0.2em] text-destructive mb-2">SCANNER ERROR</p>
              <p className="text-xs text-muted-foreground text-center font-mono max-w-md">{error}</p>
              <p className="text-xs text-muted-foreground text-center mt-2">Please allow camera access and reload the page.</p>
            </div>
          )}

          {!error && (
            <div className="relative rounded-lg overflow-hidden neon-border border border-border">
              <video ref={videoRef} className="block max-h-[70vh] w-auto min-w-[320px] bg-black" playsInline muted autoPlay style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: "scaleX(-1)" }} />
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="scan-line w-full h-1/3" />
                </div>
              )}
              {cameraActive && (
                <>
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary/70" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary/70" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary/70" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary/70" />
                </>
              )}
              {cameraActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-sm px-3 py-1 rounded border border-border">
                  <span className="text-[10px] font-display tracking-[0.3em] text-primary neon-text">
                    ● LIVE SCAN {isCalibrated ? "— CALIBRATED" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metrics Sidebar */}
        <aside className="lg:w-72 flex-shrink-0 overflow-y-auto flex flex-col gap-3">
          <AvatarSelector selected={activeAvatar} onSelect={setActiveAvatar} />
          <MetricsPanel metrics={metrics} cameraActive={cameraActive} isCalibrated={isCalibrated} />
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>BODY: 33 · HANDS: 21 each · FACE: 468 pts</span>
        <span className={cameraActive ? "text-accent" : "text-destructive"}>
          {cameraActive ? "CAMERA ONLINE" : "CAMERA OFFLINE"}
        </span>
      </footer>
    </div>
  );
};

export default Index;
