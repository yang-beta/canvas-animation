(() => {
  "use strict";

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  const COLORS = {
    main: [255, 176, 136],
    light: [255, 199, 171],
    glow: [255, 225, 209],
    deep: [192, 123, 89]
  };

  const coralRgba = (level = "main", alpha = 1) => {
    const [r, g, b] = COLORS[level] || COLORS.main;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  };

  const sandCanvas = document.getElementById("CanvasAnime");
  const sandCtx = sandCanvas.getContext("2d");
  const skipBtn = document.getElementById("p2SkipBtn");
  const replayBtn = document.getElementById("p2ReplayBtn");

  const P2_IMAGE_SEQUENCE = [
    "./img/lovers-l.png",
    "./img/fistBump.png",
    "./img/grandmom-l.png",
    "./img/dog-l.png"
  ];

  const P2_IMAGE_START_TIMES = [1.5, 7.1, 12.7, 18.3];

  const POSITIONS = [
    { xRatio: .25, yRatio: .30 },
    { xRatio: .75, yRatio: .30 },
    { xRatio: .25, yRatio: .70 },
    { xRatio: .75, yRatio: .70 },
    { xRatio: .50, yRatio: .50 }
  ];

  const totalAnimationDuration = 26.3;

  let floatingDustParticles = [];
  let sandImageParticleGroups = [];
  let sandGlobalProgress = { t: 0 };
  let sandAssetsPromise = null;
  let textTimeline = null;
  let sandTimeline = null;
  let rafId = null;
  let playToken = 0;
  let completed = false;

  function resizeCanvas() {
    sandCanvas.width = Math.round(window.innerWidth * DPR);
    sandCanvas.height = Math.round(window.innerHeight * DPR);
    sandAssetsPromise = null;
    sandImageParticleGroups = [];
  }

  class FloatingDust {
    constructor() {
      this.x = Math.random() * sandCanvas.width;
      this.y = Math.random() * sandCanvas.height;
      this.size = (Math.random() * 2.2 + .8) * DPR;
      this.vx = (Math.random() - .5) * .8 * DPR;
      this.vy = (Math.random() - .5) * .8 * DPR;
      this.baseAlpha = Math.random() * .6 + .3;
      this.pulseSpeed = Math.random() * .02 + .005;
    }

    update() {
      this.x = (this.x + this.vx + sandCanvas.width) % sandCanvas.width;
      this.y = (this.y + this.vy + sandCanvas.height) % sandCanvas.height;
    }

    draw() {
      sandCtx.save();
      sandCtx.fillStyle = coralRgba(
        "main",
        this.baseAlpha + Math.sin(Date.now() * this.pulseSpeed) * .2
      );
      sandCtx.beginPath();
      sandCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      sandCtx.fill();
      sandCtx.restore();
    }
  }

  class SandParticle {
    constructor(targetX, targetY, delay) {
      this.targetX = targetX;
      this.targetY = targetY;
      this.delay = delay;
      this.startX = -Math.random() * sandCanvas.width * .4 - 50;
      this.startY = targetY + (Math.random() - .5) * 200 * DPR;
      this.endX = sandCanvas.width + Math.random() * sandCanvas.width * .4 + 50;
      this.endY = targetY + (Math.random() - .5) * 200 * DPR;
      this.x = this.startX;
      this.y = this.startY;
      this.size = (Math.random() * 1 + .8) * DPR;
      this.baseAlpha = Math.random() * .65 + .35;
      const colorRoll = Math.random();
      this.colorLevel =
        colorRoll < .72
          ? "main"
          : colorRoll < .90
            ? "light"
            : "deep";
      this.alpha = 0;
      this.noiseX = (Math.random() - .5) * 1.8 * DPR;
      this.noiseY = (Math.random() - .5) * 1.8 * DPR;
    }

    update(totalElapsedSec) {
      const localTime = totalElapsedSec - this.delay;

      if (localTime < 0 || localTime > 7.5) {
        this.alpha = 0;
        return;
      }

      const progress = localTime / 7.5;

      if (progress < .25) {
        const p = progress / .25;
        const eased = 1 - Math.pow(1 - p, 2);
        this.x = this.startX + (this.targetX - this.startX) * eased;
        this.y = this.startY + (this.targetY - this.startY) * eased;
        this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
      } else if (progress <= .70) {
        this.x = this.targetX + Math.sin(Date.now() * .003 + this.targetY) * this.noiseX;
        this.y = this.targetY + Math.cos(Date.now() * .003 + this.targetX) * this.noiseY;
        this.alpha = this.baseAlpha;
      } else {
        const p = (progress - .70) / .30;
        this.x = this.targetX + (this.endX - this.targetX) * (p * p);
        this.y = this.targetY + (this.endY - this.targetY) * (p * p);
        this.alpha = this.baseAlpha * (1 - p);
      }
    }

    draw() {
      if (this.alpha <= 0) return;
      sandCtx.fillStyle = coralRgba(this.colorLevel, this.alpha);
      sandCtx.beginPath();
      sandCtx.arc(this.x | 0, this.y | 0, this.size, 0, Math.PI * 2);
      sandCtx.fill();
    }
  }

  function shufflePositions() {
    return [...POSITIONS]
      .sort(() => Math.random() - .5)
      .slice(0, P2_IMAGE_SEQUENCE.length);
  }

  async function prepareAssets() {
    if (sandAssetsPromise) return sandAssetsPromise;

    sandAssetsPromise = (async () => {
      floatingDustParticles = Array.from({ length: 45 }, () => new FloatingDust());
      const positions = shufflePositions();

      sandImageParticleGroups = await Promise.all(
        P2_IMAGE_SEQUENCE.map((src, index) => new Promise((resolve) => {
          const img = new Image();

          img.onload = () => {
            const isMobile = window.innerWidth <= 768;
            const targetWidth = (isMobile ? 260 : 420) * DPR;
            const scale = targetWidth / img.width;
            const imgW = img.width * scale;
            const imgH = img.height * scale;
            const finalX = positions[index].xRatio * sandCanvas.width;
            const finalY = positions[index].yRatio * sandCanvas.height;

            const offscreen = document.createElement("canvas");
            offscreen.width = sandCanvas.width;
            offscreen.height = sandCanvas.height;

            const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
            offCtx.drawImage(
              img,
              finalX - imgW / 2,
              finalY - imgH / 2,
              imgW,
              imgH
            );

            const data = offCtx.getImageData(
              0,
              0,
              sandCanvas.width,
              sandCanvas.height
            ).data;

            const particles = [];
            const gap = Math.max(2, Math.round(3 * DPR));

            for (let y = 0; y < sandCanvas.height; y += gap) {
              for (let x = 0; x < sandCanvas.width; x += gap) {
                const pixelIndex = (y * sandCanvas.width + x) * 4;
                const alpha = data[pixelIndex + 3];
                const brightness =
                  (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;

                if (alpha > 50 && brightness < 230) {
                  particles.push(
                    new SandParticle(x, y, P2_IMAGE_START_TIMES[index])
                  );
                }
              }
            }

            resolve(particles);
          };

          img.onerror = () => {
            console.error(`P2 沙畫圖片載入失敗：${src}`);
            resolve([]);
          };

          img.src = src;
        }))
      );
    })();

    return sandAssetsPromise;
  }

  function createGroupedStoryAnimation(timeline, groups, startDelay = 0) {
    if (startDelay > 0) timeline.to({}, { duration: startDelay });

    groups.forEach(({ line, parts }) => {
      gsap.set(line, { y: "115%", opacity: 0 });
      gsap.set(parts, { y: "22%", opacity: 0 });

      timeline.to(line, {
        y: "0%",
        opacity: 1,
        duration: 1,
        ease: "power2.out"
      });

      parts.forEach((part, index) => {
        timeline.to(part, {
          y: "0%",
          opacity: 1,
          duration: .8,
          ease: "power1.out"
        }, index === 0 ? "<" : "+=1.5");
      });

      // 正式 P2 保留前四句，但保留原本 2.3 秒節奏。
      timeline.to({}, { duration: 2.3 });
    });
  }

  function animateArrow() {
    replayBtn.dataset.animated = "true";
    replayBtn.removeAttribute("aria-disabled");

    gsap.to(replayBtn, {
      opacity: 1,
      pointerEvents: "auto",
      duration: .6,
      ease: "power2.out"
    });

    gsap.to(replayBtn, {
      y: 7,
      duration: .8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }

  function completeAnimation() {
    if (completed) return;
    completed = true;
    animateArrow();

    gsap.to(skipBtn, {
      opacity: 0,
      pointerEvents: "none",
      duration: .4
    });
  }

  function resetVisualState() {
    const storyLines = document.querySelectorAll(".story-line");
    const animatedParts = document.querySelectorAll(
      ".sub-part, #fPart1, #fPart2, .dot-char"
    );

    textTimeline?.kill();
    sandTimeline?.kill();
    textTimeline = null;
    sandTimeline = null;

    gsap.killTweensOf([storyLines, animatedParts, replayBtn, skipBtn]);

    gsap.set(storyLines, { y: "115%", opacity: 0 });
    gsap.set(animatedParts, { y: "22%", opacity: 0 });

    gsap.set(replayBtn, {
      opacity: 0,
      y: 0,
      pointerEvents: "none"
    });

    replayBtn.dataset.animated = "false";
    replayBtn.setAttribute("aria-disabled", "true");

    gsap.set(skipBtn, {
      opacity: 1,
      pointerEvents: "auto"
    });

    skipBtn.classList.add("show");

    sandGlobalProgress.t = 0;
    completed = false;
    sandCtx.clearRect(0, 0, sandCanvas.width, sandCanvas.height);
  }

  function playTextSequence() {
    const storyLines = gsap.utils.toArray(
      "#text-container .story-line:not(#goldenLine)"
    );

    const groups = storyLines.map((line) => ({
      line,
      parts: gsap.utils.toArray(line.querySelectorAll(".sub-part"))
    }));

    textTimeline = gsap.timeline();
    createGroupedStoryAnimation(textTimeline, groups, 1.5);

    const goldenLine = document.getElementById("goldenLine");

    gsap.set(goldenLine, {
      y: "115%",
      opacity: 0
    });

    gsap.set(
      goldenLine.querySelectorAll(".ui-animate-text"),
      { y: "22%", opacity: 0 }
    );

    textTimeline
      .to(goldenLine, {
        y: "0%",
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
      })
      .to("#fPart1", {
        y: "0%",
        opacity: 1,
        duration: 1.2,
        ease: "power1.out"
      }, "-=1.2")
      .to("#dot1", { y: "0%", opacity: 1, duration: .3 }, "+=.4")
      .to("#dot2", { y: "0%", opacity: 1, duration: .3 }, "+=.3")
      .to("#dot3", { y: "0%", opacity: 1, duration: .3 }, "+=.3")
      .to("#fPart2", {
        y: "0%",
        opacity: 1,
        duration: 1.5,
        ease: "power1.out"
      }, "+=.5")
      .call(completeAnimation);
  }

  function render() {
    sandCtx.clearRect(0, 0, sandCanvas.width, sandCanvas.height);

    floatingDustParticles.forEach((dust) => {
      dust.update();
      dust.draw();
    });

    sandImageParticleGroups.forEach((group) => {
      group.forEach((particle) => {
        particle.update(sandGlobalProgress.t);
        particle.draw();
      });
    });

    rafId = requestAnimationFrame(render);
  }

  function startRender() {
    if (rafId !== null) return;
    render();
  }

  function stopRender() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  async function play() {
    const token = ++playToken;

    resetVisualState();
    await prepareAssets();

    if (token !== playToken) return;

    playTextSequence();

    sandTimeline = gsap.to(sandGlobalProgress, {
      t: totalAnimationDuration,
      duration: totalAnimationDuration,
      ease: "none"
    });

    startRender();
  }

  function skip() {
    ++playToken;

    textTimeline?.kill();
    sandTimeline?.kill();

    textTimeline = null;
    sandTimeline = null;

    sandGlobalProgress.t = totalAnimationDuration;

    const storyLines = gsap.utils.toArray(
      "#text-container .story-line:not(#goldenLine)"
    );

    const storyParts = storyLines.flatMap((line) =>
      gsap.utils.toArray(line.querySelectorAll(".sub-part"))
    );

    gsap.set(storyLines, {
      opacity: 1,
      y: "0%"
    });

    gsap.set(storyParts, {
      y: "0%",
      opacity: 1
    });

    gsap.set("#goldenLine", {
      opacity: 1,
      y: "0%"
    });

    gsap.set(
      "#fPart1, #dot1, #dot2, #dot3, #fPart2",
      { y: "0%", opacity: 1 }
    );

    completeAnimation();
    startRender();
  }

  let resizeTimer = null;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      ++playToken;
      stopRender();
      resizeCanvas();
      play();
    }, 180);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRender();
      textTimeline?.pause();
      sandTimeline?.pause();
    } else {
      startRender();
      textTimeline?.resume();
      sandTimeline?.resume();
    }
  });

  skipBtn.addEventListener("click", skip);
  replayBtn.addEventListener("click", play);

  resizeCanvas();

  if (document.fonts?.ready) {
    document.fonts.ready.then(play);
  } else {
    play();
  }
})();
