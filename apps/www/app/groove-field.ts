import {
  grooveSteps,
  type createGroove,
} from "../../../catalog/experiences/groove-mixer/controller";

/** Pattern illustration on the controller clock, not an isolated signal measurement. */
export function mountGrooveField(
  canvas: HTMLCanvasElement,
  groove: ReturnType<typeof createGroove>,
) {
  const paint = canvas.getContext("2d");
  if (!paint) return { draw() {}, dispose() {} };
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const style = getComputedStyle(canvas);
  const pink = style.getPropertyValue("--signal-high").trim();
  const blue = style.getPropertyValue("--signal-low").trim();
  let frame = 0;
  function draw() {
    cancelAnimationFrame(frame);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const ctx = paint!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const position = groove.position();
    const playing = groove.playing && position >= 0;
    const step = Math.floor(position) % 16;
    const phase = position - Math.floor(position);
    const mix = groove.mix;
    const level = (channel: "bass" | "drums") =>
      mix.master.muted || mix[channel].muted
        ? 0
        : mix.master.level * mix[channel].level;
    const left = width * 0.07;
    const span = width * 0.86;
    // Drum attacks: compact columns, snare pairs and short hat ticks.
    ctx.strokeStyle = pink;
    ctx.fillStyle = pink;
    for (let i = 0; i < 16; i++) {
      const hit = grooveSteps[i];
      const live = playing && i === step;
      const pulse = live && !motion.matches ? Math.exp(-phase * 5) : 0;
      const x = left + ((i + 0.5) * span) / 16;
      const strength = playing ? level("drums") : 0.3;
      ctx.globalAlpha = 0.18 + strength * (live ? 1.7 : 0.65);
      const extent =
        (hit.kick ? 64 : hit.snare ? 42 : 10) *
        (width < 500 ? 0.75 : 1) *
        (1 + pulse * 0.35);
      ctx.fillRect(x - 3, height * 0.3 - extent / 2, 6, extent);
      if (hit.snare) ctx.fillRect(x + 5, height * 0.3 - extent / 2, 2, extent);
      ctx.fillRect(x - 1, height * 0.47, 2, 3 + hit.hat * 12);
    }
    // Bass: a harmonic ribbon, changing pitch and weight with the shared groove.
    const bassIndex = playing ? Math.floor(step / 2) * 2 : 0;
    const pitch = grooveSteps[bassIndex]?.bass || 82.4069;
    const bass = playing ? level("bass") : 0.22;
    for (let ribbon = 0; ribbon < 9; ribbon++) {
      ctx.beginPath();
      ctx.strokeStyle = blue;
      ctx.globalAlpha = 0.14 + bass * 1.1;
      ctx.lineWidth = ribbon === 4 ? 2.5 : 1;
      for (let x = 0; x <= width; x += 3) {
        const u = x / width;
        const envelope = Math.sin(Math.PI * u);
        const travel = playing && !motion.matches ? position * 0.8 : 0;
        const wave = Math.sin(
          (u * Math.PI * 4 * pitch) / 82.4069 - travel + ribbon * 0.13,
        );
        const y =
          height * 0.73 + wave * envelope * (15 + bass * 90) + (ribbon - 4) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (groove.playing && !motion.matches) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(draw);
  resize.observe(canvas);
  motion.addEventListener("change", draw);
  draw();
  return {
    draw,
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      motion.removeEventListener("change", draw);
    },
  };
}
