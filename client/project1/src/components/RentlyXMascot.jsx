import React, { useState, useEffect } from "react";

/**
 * RentlyX 3D Animated Mascot
 * A CSS-based 3D house-robot character with idle animations.
 * Props:
 *   size   – "sm" (40px) | "md" (64px) | "lg" (120px) | "xl" (180px)
 *   mood   – "idle" | "talking" | "thinking" | "waving"
 *   onClick
 */
export default function RentlyXMascot({ size = "md", mood = "idle", onClick }) {
    const [blink, setBlink] = useState(false);

    // Random blink every 2-5 seconds
    useEffect(() => {
        const doBlink = () => {
            setBlink(true);
            setTimeout(() => setBlink(false), 180);
        };
        const id = setInterval(doBlink, 2500 + Math.random() * 2500);
        return () => clearInterval(id);
    }, []);

    const sizes = { sm: 40, md: 64, lg: 120, xl: 180 };
    const s = sizes[size] || sizes.md;
    const scale = s / 120; // base design is 120px

    return (
        <>
            <style>{mascotCSS}</style>
            <div
                className={`rx-mascot rx-mascot--${mood}`}
                onClick={onClick}
                style={{
                    width: s,
                    height: s * 1.25,
                    cursor: onClick ? "pointer" : "default",
                    transform: `scale(${scale})`,
                    transformOrigin: "center bottom",
                }}
            >
                {/* Floating container */}
                <div className="rx-float">
                    {/* Shadow */}
                    <div className="rx-shadow" />

                    {/* Body group */}
                    <div className="rx-body-group">
                        {/* Sparkle particles */}
                        <div className="rx-sparkle rx-sparkle--1" />
                        <div className="rx-sparkle rx-sparkle--2" />
                        <div className="rx-sparkle rx-sparkle--3" />

                        {/* Roof / hat */}
                        <div className="rx-roof">
                            <div className="rx-roof-chimney" />
                            <div className="rx-roof-shine" />
                        </div>

                        {/* Main body */}
                        <div className="rx-body">
                            {/* Face shine / 3D highlight */}
                            <div className="rx-body-shine" />
                            <div className="rx-body-shine-2" />

                            {/* Eyes */}
                            <div className="rx-eyes">
                                <div className={`rx-eye rx-eye--left ${blink ? "rx-blink" : ""}`}>
                                    <div className="rx-pupil" />
                                    <div className="rx-eye-highlight" />
                                </div>
                                <div className={`rx-eye rx-eye--right ${blink ? "rx-blink" : ""}`}>
                                    <div className="rx-pupil" />
                                    <div className="rx-eye-highlight" />
                                </div>
                            </div>

                            {/* Mouth */}
                            <div className={`rx-mouth rx-mouth--${mood}`} />

                            {/* Cheeks */}
                            <div className="rx-cheek rx-cheek--left" />
                            <div className="rx-cheek rx-cheek--right" />

                            {/* Door detail */}
                            <div className="rx-door">
                                <div className="rx-doorknob" />
                            </div>
                        </div>

                        {/* Arms */}
                        <div className={`rx-arm rx-arm--left rx-arm--${mood}`}>
                            <div className="rx-hand" />
                        </div>
                        <div className={`rx-arm rx-arm--right rx-arm--${mood}`}>
                            <div className="rx-hand" />
                        </div>

                        {/* Feet */}
                        <div className="rx-feet">
                            <div className="rx-foot rx-foot--left" />
                            <div className="rx-foot rx-foot--right" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─────────────────────────────────────────────
   All CSS for the 3D mascot
   ───────────────────────────────────────────── */
const mascotCSS = `
/* ── Base ── */
.rx-mascot {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: 120px;
  height: 150px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.rx-float {
  position: relative;
  width: 120px;
  height: 150px;
  animation: rxFloat 3s ease-in-out infinite;
  perspective: 600px;
}

/* ── Shadow ── */
.rx-shadow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(30, 27, 75, 0.35) 0%, transparent 70%);
  animation: rxShadow 3s ease-in-out infinite;
}

/* ── Body Group ── */
.rx-body-group {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 130px;
}

/* ── Roof ── */
.rx-roof {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 48px solid transparent;
  border-right: 48px solid transparent;
  border-bottom: 32px solid #5b21b6;
  filter: drop-shadow(0 -2px 6px rgba(91, 33, 182, 0.4));
  z-index: 2;
}

.rx-roof-chimney {
  position: absolute;
  top: -10px;
  right: -20px;
  width: 12px;
  height: 16px;
  background: linear-gradient(180deg, #7c3aed, #6d28d9);
  border-radius: 2px 2px 0 0;
  box-shadow: inset -2px 0 0 rgba(255,255,255,0.15);
}

.rx-roof-shine {
  position: absolute;
  top: 8px;
  left: -18px;
  width: 24px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  transform: rotate(-34deg);
}

/* ── Body ── */
.rx-body {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 78px;
  height: 72px;
  background: linear-gradient(145deg, #6d28d9 0%, #4c1d95 50%, #3b0764 100%);
  border-radius: 16px 16px 20px 20px;
  box-shadow:
    0 8px 24px rgba(30, 27, 75, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.12),
    inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  overflow: visible;
  z-index: 1;
}

.rx-body-shine {
  position: absolute;
  top: 6px;
  left: 8px;
  width: 22px;
  height: 32px;
  background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%);
  border-radius: 12px;
}

.rx-body-shine-2 {
  position: absolute;
  top: 4px;
  right: 10px;
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
}

/* ── Eyes ── */
.rx-eyes {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
}

.rx-eye {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: relative;
  box-shadow:
    0 2px 6px rgba(0,0,0,0.2),
    inset 0 -1px 2px rgba(0,0,0,0.05);
  transition: transform 0.15s ease;
  overflow: hidden;
}

.rx-pupil {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-40%, -40%);
  width: 9px;
  height: 9px;
  background: radial-gradient(circle at 35% 35%, #1e1b4b, #0f0a2e);
  border-radius: 50%;
  animation: rxLookAround 6s ease-in-out infinite;
}

.rx-eye-highlight {
  position: absolute;
  top: 3px;
  left: 4px;
  width: 5px;
  height: 5px;
  background: white;
  border-radius: 50%;
  opacity: 0.9;
}

.rx-blink {
  transform: scaleY(0.08);
}

/* ── Mouth ── */
.rx-mouth {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 7px;
  border-bottom: 3px solid #e0d4ff;
  border-radius: 0 0 10px 10px;
  transition: all 0.3s ease;
}

.rx-mouth--talking {
  width: 12px;
  height: 10px;
  background: #2d1a6b;
  border: 2px solid #e0d4ff;
  border-radius: 50%;
  animation: rxTalk 0.4s ease-in-out infinite;
}

.rx-mouth--thinking {
  width: 8px;
  height: 8px;
  border: none;
  background: #e0d4ff;
  border-radius: 50%;
  transform: translateX(-50%) translateX(6px);
}

.rx-mouth--waving {
  width: 18px;
  height: 9px;
  border-bottom: 3px solid #e0d4ff;
  border-radius: 0 0 14px 14px;
}

/* ── Cheeks ── */
.rx-cheek {
  position: absolute;
  bottom: 24px;
  width: 10px;
  height: 6px;
  background: rgba(251, 113, 133, 0.35);
  border-radius: 50%;
  filter: blur(2px);
}

.rx-cheek--left  { left: 8px; }
.rx-cheek--right { right: 8px; }

/* ── Door detail ── */
.rx-door {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 22px;
  background: linear-gradient(180deg, #4c1d95 0%, #3b0764 100%);
  border-radius: 8px 8px 0 0;
  border: 1.5px solid rgba(255,255,255,0.12);
  border-bottom: none;
}

.rx-doorknob {
  position: absolute;
  top: 50%;
  right: 2px;
  width: 3px;
  height: 3px;
  background: #fbbf24;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(251, 191, 36, 0.6);
}

/* ── Arms ── */
.rx-arm {
  position: absolute;
  top: 46px;
  width: 14px;
  height: 28px;
  border-radius: 8px;
  z-index: 0;
  transform-origin: top center;
  transition: all 0.3s ease;
}

.rx-arm--left {
  left: -5px;
  background: linear-gradient(180deg, #6d28d9, #5b21b6);
  animation: rxArmIdleL 4s ease-in-out infinite;
  box-shadow: -2px 2px 4px rgba(0,0,0,0.2);
}

.rx-arm--right {
  right: -5px;
  background: linear-gradient(180deg, #6d28d9, #5b21b6);
  animation: rxArmIdleR 4s ease-in-out infinite;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.rx-arm--waving.rx-arm--right {
  animation: rxWave 0.6s ease-in-out infinite !important;
}

.rx-arm--talking.rx-arm--left {
  animation: rxArmTalkL 0.8s ease-in-out infinite !important;
}
.rx-arm--talking.rx-arm--right {
  animation: rxArmTalkR 0.8s ease-in-out infinite !important;
}

.rx-hand {
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 10px;
  background: linear-gradient(180deg, #7c3aed, #6d28d9);
  border-radius: 50%;
  box-shadow: 0 2px 3px rgba(0,0,0,0.15);
}

/* ── Feet ── */
.rx-feet {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
}

.rx-foot {
  width: 20px;
  height: 10px;
  background: linear-gradient(180deg, #4c1d95, #3b0764);
  border-radius: 6px 6px 10px 10px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.25);
}

.rx-foot--left {
  animation: rxFootL 3s ease-in-out infinite;
}
.rx-foot--right {
  animation: rxFootR 3s ease-in-out infinite 0.15s;
}

/* ── Sparkles ── */
.rx-sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  z-index: 10;
  pointer-events: none;
}

.rx-sparkle--1 {
  top: 8px;
  right: -6px;
  background: #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
  animation: rxSparkle 2.5s ease-in-out infinite;
}

.rx-sparkle--2 {
  top: 20px;
  left: -8px;
  background: #7dd3fc;
  box-shadow: 0 0 8px rgba(125, 211, 252, 0.8);
  animation: rxSparkle 3s ease-in-out infinite 0.8s;
  width: 4px;
  height: 4px;
}

.rx-sparkle--3 {
  top: 2px;
  left: 12px;
  background: #a78bfa;
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.8);
  animation: rxSparkle 2s ease-in-out infinite 1.5s;
  width: 5px;
  height: 5px;
}

/* ── ANIMATIONS ── */

@keyframes rxFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

@keyframes rxShadow {
  0%, 100% { transform: translateX(-50%) scale(1);   opacity: 0.35; }
  50%      { transform: translateX(-50%) scale(0.75); opacity: 0.2; }
}

@keyframes rxLookAround {
  0%, 40%  { transform: translate(-40%, -40%); }
  45%, 55% { transform: translate(-70%, -40%); }
  60%, 80% { transform: translate(-20%, -50%); }
  85%, 100%{ transform: translate(-40%, -40%); }
}

@keyframes rxTalk {
  0%, 100% { transform: translateX(-50%) scaleY(1);   }
  50%      { transform: translateX(-50%) scaleY(0.5);  }
}

@keyframes rxArmIdleL {
  0%, 100% { transform: rotate(8deg); }
  50%      { transform: rotate(4deg); }
}

@keyframes rxArmIdleR {
  0%, 100% { transform: rotate(-8deg); }
  50%      { transform: rotate(-4deg); }
}

@keyframes rxWave {
  0%, 100% { transform: rotate(-20deg); }
  50%      { transform: rotate(-55deg); }
}

@keyframes rxArmTalkL {
  0%, 100% { transform: rotate(12deg); }
  50%      { transform: rotate(5deg); }
}

@keyframes rxArmTalkR {
  0%, 100% { transform: rotate(-12deg); }
  50%      { transform: rotate(-5deg); }
}

@keyframes rxFootL {
  0%, 100% { transform: rotate(0deg); }
  30%      { transform: rotate(-3deg); }
}

@keyframes rxFootR {
  0%, 100% { transform: rotate(0deg); }
  30%      { transform: rotate(3deg); }
}

@keyframes rxSparkle {
  0%, 100% { opacity: 0; transform: scale(0.5) translateY(0); }
  50%      { opacity: 1; transform: scale(1.2) translateY(-6px); }
}

/* ── Hover effect ── */
.rx-mascot:hover .rx-float {
  animation: rxFloat 2s ease-in-out infinite;
}
.rx-mascot:hover .rx-arm--right {
  animation: rxWave 0.5s ease-in-out infinite !important;
}
.rx-mascot:hover .rx-cheek {
  background: rgba(251, 113, 133, 0.55);
}
`;
