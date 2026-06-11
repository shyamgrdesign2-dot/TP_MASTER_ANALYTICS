import { useEffect, useRef } from "react";
import styles from "./VoiceRxSiriWaveform.module.scss";

/** Siri-style visualizer — exact spec from reference zip. */
const opts = {
  smoothing: 0.65,
  fft: 8,
  minDecibels: -60,
  glow: 40,
  color1: [124, 58, 237],
  color2: [79, 70, 229],
  color3: [192, 38, 211],
  fillOpacity: 0.30,
  lineWidth: 0,
  blend: "lighter",
  shift: 35,
  width: 50,
  amp: 0.35
};

const shuffle = [1, 3, 0, 4, 2];

function range(n) {
  return Array.from(Array(n).keys());
}

function pickFreq(channel, i, freqs) {
  const band = 2 * channel + shuffle[i] * 6;
  return freqs[band] ?? 0;
}

function ampScale(i) {
  const x = Math.abs(2 - i);
  const s = 3 - x;
  return s / 3 * opts.amp;
}

function drawChannelPath(ctx, channel, WIDTH, HEIGHT, freqs) {
  const color = channel === 0 ? opts.color1 : channel === 1 ? opts.color2 : opts.color3;

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  gradient.addColorStop(0.2, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opts.fillOpacity})`);
  gradient.addColorStop(0.8, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opts.fillOpacity})`);
  gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

  ctx.fillStyle = gradient;
  ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
  ctx.lineWidth = opts.lineWidth;
  ctx.shadowBlur = opts.glow;
  ctx.globalCompositeOperation = opts.blend;

  const m = HEIGHT / 2;
  const offset = (WIDTH - 15 * opts.width) / 2;
  const x = range(15).map((i) => offset + channel * opts.shift + i * opts.width);
  const y = range(5).map((i) => Math.max(0, m - ampScale(i) * pickFreq(channel, i, freqs)));
  const h = 2 * m;

  ctx.beginPath();
  ctx.moveTo(0, m);
  ctx.lineTo(x[0], m + 1);

  ctx.bezierCurveTo(x[1], m + 1, x[2], y[0], x[3], y[0]);
  ctx.bezierCurveTo(x[4], y[0], x[4], y[1], x[5], y[1]);
  ctx.bezierCurveTo(x[6], y[1], x[6], y[2], x[7], y[2]);
  ctx.bezierCurveTo(x[8], y[2], x[8], y[3], x[9], y[3]);
  ctx.bezierCurveTo(x[10], y[3], x[10], y[4], x[11], y[4]);

  ctx.bezierCurveTo(x[12], y[4], x[12], m, x[13], m);
  ctx.lineTo(WIDTH, m + 1);
  ctx.lineTo(x[13], m - 1);

  ctx.bezierCurveTo(x[12], m, x[12], h - y[4], x[11], h - y[4]);
  ctx.bezierCurveTo(x[10], h - y[4], x[10], h - y[3], x[9], h - y[3]);
  ctx.bezierCurveTo(x[8], h - y[3], x[8], h - y[2], x[7], h - y[2]);
  ctx.bezierCurveTo(x[6], h - y[2], x[6], h - y[1], x[5], h - y[1]);
  ctx.bezierCurveTo(x[4], h - y[1], x[4], h - y[0], x[3], h - y[0]);
  ctx.bezierCurveTo(x[2], h - y[0], x[1], m, x[0], m);

  ctx.lineTo(0, m);
  ctx.fill();
}

function drawIdleLine(ctx, WIDTH, HEIGHT) {
  const m = HEIGHT / 2;
  const pad = Math.min(16, WIDTH * 0.06);
  const startX = pad;
  const endX = WIDTH - pad;

  const gradient = ctx.createLinearGradient(startX, m, endX, m);
  gradient.addColorStop(0, `rgba(${opts.color1[0]}, ${opts.color1[1]}, ${opts.color1[2]}, 0.85)`);
  gradient.addColorStop(0.5, `rgba(${opts.color2[0]}, ${opts.color2[1]}, ${opts.color2[2]}, 0.85)`);
  gradient.addColorStop(1, `rgba(${opts.color3[0]}, ${opts.color3[1]}, ${opts.color3[2]}, 0.85)`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(startX, m);
  ctx.lineTo(endX, m);
  ctx.stroke();
}

/**
 * Siri-style ribbon wired to the recorder stream.
 */
export function VoiceRxSiriWaveform({ stream, paused = false, className, levelRef }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const freqsRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const pausedRef = useRef(paused);
  const dimsRef = useRef({ w: 200, h: 44 });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      dimsRef.current = {
        w: Math.max(96, Math.floor(r.width)),
        h: Math.max(40, Math.floor(r.height))
      };
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cleanupAudio = () => {
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      analyserRef.current = null;
      freqsRef.current = null;
    };

    cleanupAudio();
    if (!stream) return;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.smoothingTimeConstant = opts.smoothing;
      analyser.fftSize = 2 ** opts.fft;
      analyser.minDecibels = opts.minDecibels;
      analyser.maxDecibels = 0;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      freqsRef.current = new Uint8Array(analyser.frequencyBinCount);
      sourceRef.current = src;
    } catch {
      /* idle line only */
    }

    return cleanupAudio;
  }, [stream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (tMs) => {
      const { w: logicalW, h: logicalH } = dimsRef.current;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const WIDTH = Math.max(80, Math.floor(logicalW * dpr));
      const HEIGHT = Math.max(40, Math.floor(logicalH * dpr));

      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

      const analyser = analyserRef.current;
      const freqs = freqsRef.current;

      const drawW = logicalW;
      const drawH = Math.max(40, logicalH);

      if (analyser && freqs && stream && !pausedRef.current) {
        analyser.getByteFrequencyData(freqs);
        const hasAudio = freqs.some((value) => value > 0);
        if (hasAudio) {
          if (levelRef) {
            let sum = 0;
            const n = Math.min(24, freqs.length);
            for (let i = 0; i < n; i++) sum += freqs[i];
            const raw = sum / n / 255;
            const boosted = Math.min(1, raw * 1.6);
            const attack = boosted > levelRef.current ? 0.55 : 0.22;
            levelRef.current = levelRef.current * (1 - attack) + boosted * attack;
            if (boosted < 0.01 && levelRef.current < 0.015) levelRef.current = 0;
          }
          ctx2d.globalCompositeOperation = "source-over";
          drawChannelPath(ctx2d, 0, drawW, drawH, freqs);
          drawChannelPath(ctx2d, 1, drawW, drawH, freqs);
          drawChannelPath(ctx2d, 2, drawW, drawH, freqs);
        } else {
          if (levelRef) {
            levelRef.current *= 0.3;
            if (levelRef.current < 0.01) levelRef.current = 0;
          }
          drawIdleLine(ctx2d, drawW, drawH);
        }
      } else {
        if (levelRef) {
          levelRef.current *= 0.3;
          if (levelRef.current < 0.01) levelRef.current = 0;
        }
        drawIdleLine(ctx2d, drawW, drawH);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stream, levelRef]);

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      aria-hidden>
      <div ref={containerRef} className={styles.inner}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}
