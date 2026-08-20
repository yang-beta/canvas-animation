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

  const P2_IMAGE_SEQUENCE = [
    "./img/lovers-l.png",
    "./img/fistBump.png",
    "./img/grandmom-l.png",
    "./img/dog-l.png"
  ];

  const P2_IMAGE_MIN_COUNT = 2;
  const P2_IMAGE_MAX_COUNT = 6;

  /*
    原始四張圖起始時間：
    1.5 / 7.1 / 12.7 / 18.3 秒
    每張固定相差 5.6 秒。

    之後只需要增減 P2_IMAGE_SEQUENCE，
    不需要另外維護時間陣列。
  */
  const P2_FIRST_IMAGE_START = 1.5;
  const P2_IMAGE_INTERVAL = 5.6;
  const P2_PARTICLE_LIFETIME = 7.5;

  const getImageStartTime = (index) =>
    P2_FIRST_IMAGE_START +
    index * P2_IMAGE_INTERVAL;

  const getTotalAnimationDuration = () => {
    const count = Math.max(
      1,
      P2_IMAGE_SEQUENCE.length
    );

    return (
      getImageStartTime(count - 1) +
      P2_PARTICLE_LIFETIME +
      .8
    );
  };

  function validateImageCount() {
    const count =
      P2_IMAGE_SEQUENCE.length;

    if (
      count < P2_IMAGE_MIN_COUNT ||
      count > P2_IMAGE_MAX_COUNT
    ) {
      console.warn(
        `P2_IMAGE_SEQUENCE 目前有 ${count} 張；建議維持 ${P2_IMAGE_MIN_COUNT}～${P2_IMAGE_MAX_COUNT} 張。`
      );
    }
  }

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

      this.size =
        (Math.random() * 1 + .8) * DPR;

      this.baseAlpha =
        Math.random() * .65 + .35;

      const colorRoll = Math.random();

      this.colorLevel =
        colorRoll < .72
          ? "main"
          : colorRoll < .90
            ? "light"
            : "deep";

      this.alpha = 0;

      this.noiseX =
        (Math.random() - .5) *
        1.8 *
        DPR;

      this.noiseY =
        (Math.random() - .5) *
        1.8 *
        DPR;

      /*
        聚合與散去方向：
        60% 左右、40% 上下／四角。
        entry 與 exit 各自重新抽樣。
      */
      const entry =
        this.createEdgePoint(
          this.pickWeightedDirection()
        );

      const exit =
        this.createEdgePoint(
          this.pickWeightedDirection()
        );

      this.startX = entry.x;
      this.startY = entry.y;
      this.endX = exit.x;
      this.endY = exit.y;
    }

    pickWeightedDirection() {
      const roll = Math.random();

      if (roll < .30) return "left";
      if (roll < .60) return "right";

      if (roll < .68) return "top";
      if (roll < .76) return "bottom";
      if (roll < .82) return "top-left";
      if (roll < .88) return "top-right";
      if (roll < .94) return "bottom-left";

      return "bottom-right";
    }

    createEdgePoint(direction) {
      const w = sandCanvas.width;
      const h = sandCanvas.height;

      const outsideX =
        70 * DPR +
        Math.random() * w * .18;

      const outsideY =
        70 * DPR +
        Math.random() * h * .18;

      switch (direction) {
        case "left":
          return {
            x: -outsideX,
            y:
              this.targetY +
              (Math.random() - .5) *
              h * .34
          };

        case "right":
          return {
            x: w + outsideX,
            y:
              this.targetY +
              (Math.random() - .5) *
              h * .34
          };

        case "top":
          return {
            x:
              this.targetX +
              (Math.random() - .5) *
              w * .34,
            y: -outsideY
          };

        case "bottom":
          return {
            x:
              this.targetX +
              (Math.random() - .5) *
              w * .34,
            y: h + outsideY
          };

        case "top-left":
          return {
            x: -outsideX,
            y: -outsideY
          };

        case "top-right":
          return {
            x: w + outsideX,
            y: -outsideY
          };

        case "bottom-left":
          return {
            x: -outsideX,
            y: h + outsideY
          };

        case "bottom-right":
        default:
          return {
            x: w + outsideX,
            y: h + outsideY
          };
      }
    }

    update(totalElapsedSec) {
      const localTime =
        totalElapsedSec - this.delay;

      if (
        localTime < 0 ||
        localTime > P2_PARTICLE_LIFETIME
      ) {
        this.alpha = 0;
        return;
      }

      const progress =
        localTime /
        P2_PARTICLE_LIFETIME;

      /*
        時間比例完全保留：
        0～25%   聚合
        25～70%  停留
        70～100% 散去
      */
      if (progress < .25) {
        const p = progress / .25;

        const eased =
          1 -
          Math.pow(
            1 - p,
            2
          );

        this.x =
          this.startX +
          (
            this.targetX -
            this.startX
          ) *
          eased;

        this.y =
          this.startY +
          (
            this.targetY -
            this.startY
          ) *
          eased;

        this.alpha =
          Math.min(
            1,
            p * 1.5
          ) *
          this.baseAlpha;
      } else if (progress <= .70) {
        this.x =
          this.targetX +
          Math.sin(
            Date.now() * .003 +
            this.targetY
          ) *
          this.noiseX;

        this.y =
          this.targetY +
          Math.cos(
            Date.now() * .003 +
            this.targetX
          ) *
          this.noiseY;

        this.alpha =
          this.baseAlpha;
      } else {
        const p =
          (progress - .70) /
          .30;

        this.x =
          this.targetX +
          (
            this.endX -
            this.targetX
          ) *
          (p * p);

        this.y =
          this.targetY +
          (
            this.endY -
            this.targetY
          ) *
          (p * p);

        this.alpha =
          this.baseAlpha *
          (1 - p);
      }
    }

    draw() {
      if (this.alpha <= 0) return;

      sandCtx.fillStyle =
        coralRgba(
          this.colorLevel,
          this.alpha
        );

      sandCtx.beginPath();

      sandCtx.arc(
        this.x | 0,
        this.y | 0,
        this.size,
        0,
        Math.PI * 2
      );

      sandCtx.fill();
    }
  }

  function createImagePlacements(imageCount) {
    const count =
      Math.max(
        1,
        imageCount
      );

    const text =
      document.getElementById(
        "text-container"
      );

    const canvasRect =
      sandCanvas.getBoundingClientRect();

    const textRect =
      text?.getBoundingClientRect();

    const scaleX =
      sandCanvas.width /
      Math.max(
        1,
        canvasRect.width
      );

    const scaleY =
      sandCanvas.height /
      Math.max(
        1,
        canvasRect.height
      );

    const textLeft =
      textRect
        ? (
            textRect.left -
            canvasRect.left
          ) *
          scaleX
        : sandCanvas.width * .30;

    const textRight =
      textRect
        ? (
            textRect.right -
            canvasRect.left
          ) *
          scaleX
        : sandCanvas.width * .70;

    const textTop =
      textRect
        ? (
            textRect.top -
            canvasRect.top
          ) *
          scaleY
        : sandCanvas.height * .36;

    const textBottom =
      textRect
        ? (
            textRect.bottom -
            canvasRect.top
          ) *
          scaleY
        : sandCanvas.height * .64;

    let leftCount = 0;
    let rightCount = 0;

    const placements = [];

    for (
      let i = 0;
      i < count;
      i += 1
    ) {
      let side;

      /*
        位置基本為左／右隨機。
        若一側已經比另一側多 2 張，
        下一張自動補到較少的一側。
      */
      if (leftCount - rightCount >= 2) {
        side = "right";
      } else if (rightCount - leftCount >= 2) {
        side = "left";
      } else {
        side =
          Math.random() < .5
            ? "left"
            : "right";
      }

      if (side === "left") {
        leftCount += 1;
      } else {
        rightCount += 1;
      }

      const verticalBand =
        textBottom - textTop;

      const y =
        textTop +
        verticalBand *
        (
          .12 +
          Math.random() * .76
        );

      placements.push({
        side,
        y,
        textLeft,
        textRight
      });
    }

    return placements;
  }

  async function prepareAssets() {
    if (sandAssetsPromise) return sandAssetsPromise;

    sandAssetsPromise = (async () => {
      floatingDustParticles = Array.from({ length: 45 }, () => new FloatingDust());
      validateImageCount();

      const placements =
        createImagePlacements(
          P2_IMAGE_SEQUENCE.length
        );

      sandImageParticleGroups = await Promise.all(
        P2_IMAGE_SEQUENCE.map((src, index) => new Promise((resolve) => {
          const img = new Image();

          img.onload = () => {
            const isMobile = window.innerWidth <= 768;
            const targetWidth = (isMobile ? 260 : 420) * DPR;
            const scale = targetWidth / img.width;
            const imgW = img.width * scale;
            const imgH = img.height * scale;
            const placement =
              placements[index];

            /*
              圖片可有 10～20% 寬度
              與中央文字區重疊。
            */
            const overlapRatio =
              .10 +
              Math.random() * .10;

            const overlapPx =
              imgW *
              overlapRatio;

            const finalX =
              placement.side === "left"
                ? (
                    placement.textLeft -
                    imgW / 2 +
                    overlapPx
                  )
                : (
                    placement.textRight +
                    imgW / 2 -
                    overlapPx
                  );

            const finalY =
              Math.max(
                imgH * .54,
                Math.min(
                  sandCanvas.height -
                    imgH * .54,
                  placement.y
                )
              );

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
                    new SandParticle(x, y, getImageStartTime(index))
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

  function completeAnimation() {
    if (completed) return;
    completed = true;

    // Standalone 沒有下一頁，完成後停留在最後畫面。
  }

  function resetVisualState() {
    const storyLines =
      document.querySelectorAll(
        ".story-line"
      );

    const animatedParts =
      document.querySelectorAll(
        ".sub-part, #fPart1, #fPart2, .dot-char"
      );

    textTimeline?.kill();
    sandTimeline?.kill();

    textTimeline = null;
    sandTimeline = null;

    gsap.killTweensOf(
      [
        storyLines,
        animatedParts
      ]
    );

    gsap.set(
      storyLines,
      {
        y: "115%",
        opacity: 0
      }
    );

    gsap.set(
      animatedParts,
      {
        y: "22%",
        opacity: 0
      }
    );

    sandGlobalProgress.t = 0;
    completed = false;

    sandCtx.clearRect(
      0,
      0,
      sandCanvas.width,
      sandCanvas.height
    );
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
      t: getTotalAnimationDuration(),
      duration: getTotalAnimationDuration(),
      ease: "none"
    });

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

  resizeCanvas();

  if (document.fonts?.ready) {
    document.fonts.ready.then(play);
  } else {
    play();
  }
})();
