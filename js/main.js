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

  const frontDustCanvas =
    document.getElementById(
      "CanvasDustFront"
    );

  const frontDustCtx =
    frontDustCanvas.getContext(
      "2d"
    );

  const P2_IMAGE_SEQUENCE = [
    './img/friends.png',
    './img/hand2hand.png',
    './img/gradny.png',
    './img/dog.png',
    './img/left.png',
    './img/right.png'
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
  /* ===========================================================
     P2｜文字／圖片共用時間設定 V6
     -----------------------------------------------------------
     前四行每行：
       A 出現 1.0s
       等 2.5s
       B 出現 1.0s
       等 2.5s
       C 出現 1.0s
       停留 2.5s
     = 10.5 秒

     再等待 2.0 秒才進下一行
     = 每一行完整週期 12.5 秒

     第四行完整結束後，再等待 3 秒進最後金句。
     =========================================================== */
  const STORY_START_DELAY = 8.5;

  const STORY_PART_REVEAL = 1.0;
  const STORY_PART_GAP = 2.0;

  const STORY_LINE_CONTENT_DURATION = 9.0;
  const STORY_NEXT_LINE_WAIT = 1.0;
  const STORY_LINE_CYCLE = 10.0;

  const FINAL_LINE_WAIT = 1.5;

  const FINAL_DOT_REVEAL = .5;
  const FINAL_DOT_HOLD = .3;
  const FINAL_TEXT_REVEAL = 2.5;

  /*
    所有沙畫圖的完整存在時間改為 12.5 秒，
    與前四行「文字 10.5 + 等待 2」一致。
  */
  const P2_PARTICLE_LIFETIME = 12.5;

  /*
    六張圖的時間對應：
      0 = 第一行
      1 = 第二行
      2 = 第三行
      3 = 第四行
      4 = 「如果思念有形狀――」
      5 = 「卻也會沉澱在心靈中某個深處」
  */
  const FINAL_FIRST_START =
    STORY_START_DELAY +
    STORY_LINE_CYCLE * 4 +
    FINAL_LINE_WAIT;

  const FINAL_SECOND_START =
    FINAL_FIRST_START +
    FINAL_TEXT_REVEAL +
    (
      FINAL_DOT_REVEAL +
      FINAL_DOT_HOLD
    ) * 3;

  const getImageStartTime = (index) => {
  if (index < 4) {
    return (
      STORY_START_DELAY +
      index *
      STORY_LINE_CYCLE
    );
  }

  /*
    第 5、6 張：
    「如果思念有形狀――」出現時
    左右兩張同時開始聚合。
  */
  if (
    index === 4 ||
    index === 5
  ) {
    return FINAL_FIRST_START;
  }

  return (
    FINAL_FIRST_START +
    (index - 4) *
    P2_PARTICLE_LIFETIME
  );
};

  /*
    計算整個沙動畫需要播放多久。

    前四張各自依文字行開始時間播放；
    第 5、6 張會在「如果思念有形狀――」出現時同時開始，
    因此這裡直接找出所有圖片中最晚的開始時間，
    再加上粒子生命週期與 1 秒安全緩衝。

    這樣未來若再次調整圖片數量或時間，不需要手動重算總長度。
  */
  const getTotalAnimationDuration = () => {
    const lastImageStart =
      P2_IMAGE_SEQUENCE.reduce(
        (latest, _, index) =>
          Math.max(
            latest,
            getImageStartTime(index)
          ),
        0
      );

    return (
      lastImageStart +
      P2_PARTICLE_LIFETIME +
      1
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

  const STORY_SEGMENTS = [
    [
      "總毫不猶豫遞上肩膀，",
      "比你還相信自己的摯友――",
      "現在，你過得好嗎？"
    ],
    [
      "小時候，",
      "最喜歡玩爸爸手上的老繭――",
      "總覺得，那是英雄才有的標記。"
    ],
    [
      "餘光裡，總戴得斜斜的",
      "老花眼鏡――",
      "還有那雙摸得出歲月刻痕的手。"
    ],
    [
      "每天下班開門時，",
      "那個能直接把我撲倒在地的――",
      "甜蜜重量"
    ]
  ];

  function applyStorySegments() {
    const lines =
      gsap.utils.toArray(
        "#text-container .story-line:not(#goldenLine)"
      );

    lines
      .slice(
        0,
        STORY_SEGMENTS.length
      )
      .forEach(
        (
          line,
          lineIndex
        ) => {
          line.innerHTML =
            STORY_SEGMENTS[
              lineIndex
            ]
              .map(
                text =>
                  `<span class="sub-part ui-animate-text">${text}</span>`
              )
              .join("");
        }
      );
  }

  function applyFinalLineContent() {
    const finalLine =
      document.getElementById(
        "goldenLine"
      );

    if (!finalLine) return;

    finalLine.innerHTML = `
      <span class="ui-animate-text" id="fPart1">如果思念有形狀――</span>
      <span class="dot-char ui-animate-text" id="dot1">..</span>
      <span class="dot-char ui-animate-text" id="dot2">..</span>
      <span class="dot-char ui-animate-text" id="dot3">..</span>
      <span class="ui-animate-text" id="fPart2">你希望再次看見、聽見或感受到什麼呢？</span>
    `;
  }

  let floatingDustParticles = [];
  let foregroundDustParticles = [];
  let sandImageParticleGroups = [];
  let sandGlobalProgress = { t: 0 };
  let sandAssetsPromise = null;
  let textTimeline = null;
  let sandTimeline = null;
  let rafId = null;
  let playToken = 0;
  let completed = false;

  function resizeCanvas() {
    const width =
      Math.round(
        window.innerWidth * DPR
      );

    const height =
      Math.round(
        window.innerHeight * DPR
      );

    sandCanvas.width = width;
    sandCanvas.height = height;

    frontDustCanvas.width = width;
    frontDustCanvas.height = height;

    sandAssetsPromise = null;
    sandImageParticleGroups = [];
  }

  class FloatingDust {
    constructor(isForeground = false) {
      this.isForeground =
        isForeground;

      this.x =
        Math.random() *
        sandCanvas.width;

      this.y =
        Math.random() *
        sandCanvas.height;

      this.size =
        (
          Math.random() *
          (
            isForeground
              ? 1.7
              : 2.2
          ) +
          .8
        ) *
        DPR;

      this.vx =
        (Math.random() - .5) *
        .8 *
        DPR;

      this.vy =
        (Math.random() - .5) *
        .8 *
        DPR;

      this.baseAlpha =
        isForeground
          ? Math.random() *
            .28 +
            .10
          : Math.random() *
            .6 +
            .3;

      this.pulseSpeed =
        Math.random() *
        .02 +
        .005;
    }

    update() {
      this.x = (this.x + this.vx + sandCanvas.width) % sandCanvas.width;
      this.y = (this.y + this.vy + sandCanvas.height) % sandCanvas.height;
    }

    draw(ctx) {
      ctx.save();

      ctx.fillStyle =
        coralRgba(
          "main",
          Math.max(
            .04,
            this.baseAlpha +
            Math.sin(
              Date.now() *
              this.pulseSpeed
            ) *
            (
              this.isForeground
                ? .08
                : .2
            )
          )
        );

      ctx.beginPath();

      ctx.arc(
        this.x,
        this.y,
        this.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
      ctx.restore();
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
      圖 1～4：
      維持原本左右隨機。

      圖 5：
      固定左側。

      圖 6：
      固定右側。
    */
    if (i === 4) {
      side = "left";
    } else if (i === 5) {
      side = "right";
    } else if (
      leftCount -
      rightCount >= 2
    ) {
      side = "right";
    } else if (
      rightCount -
      leftCount >= 2
    ) {
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
      textBottom -
      textTop;

    /*
      前四張：
      Y 軸維持原本隨機。

      最後兩張：
      使用同一個中央高度，
      形成真正左右對稱的一組圖。
    */
    const y =
      i >= 4
        ? textTop +
          verticalBand * .5
        : textTop +
          verticalBand *
          (
            .12 +
            Math.random() *
            .76
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
      /*
        原本 45 顆 → V4 共 90 顆。
        64 顆在文字後方、26 顆在文字前方。
      */
      floatingDustParticles =
        Array.from(
          { length: 64 },
          () =>
            new FloatingDust(false)
        );

      foregroundDustParticles =
        Array.from(
          { length: 26 },
          () =>
            new FloatingDust(true)
        );
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

            /*
              V4｜點描圖專用偵測
              -----------------------------------------------------
              舊版每隔 gap 只看一個像素，點描圖縮小後很容易
              抽到白底；brightness < 230 也會漏掉抗鋸齒灰點。

              新版改成：
              1. 只掃描圖片自身 local canvas
              2. 每一個小區塊都檢查所有像素
              3. 用暗點加權中心建立粒子
            */
            const localCanvas =
              document.createElement(
                "canvas"
              );

            localCanvas.width =
              Math.max(
                1,
                Math.round(imgW)
              );

            localCanvas.height =
              Math.max(
                1,
                Math.round(imgH)
              );

            const localCtx =
              localCanvas.getContext(
                "2d",
                {
                  willReadFrequently: true
                }
              );

            localCtx.fillStyle =
              "#ffffff";

            localCtx.fillRect(
              0,
              0,
              localCanvas.width,
              localCanvas.height
            );

            localCtx.drawImage(
              img,
              0,
              0,
              localCanvas.width,
              localCanvas.height
            );

            const data =
              localCtx.getImageData(
                0,
                0,
                localCanvas.width,
                localCanvas.height
              ).data;

            const particles = [];

            /*
              比舊版 3*DPR 稍密，
              讓 1～2px 的點描線條更容易被保留。
            */
            const gap =
              Math.max(
                2,
                Math.round(
                  2.15 * DPR
                )
              );

            /*
              使用者提供的點描圖中，
              有效抗鋸齒邊緣不少落在 230～248。
              255 才是純白背景，因此提高到 248。
            */
            const DARK_THRESHOLD =
              248;

            const MIN_DARK_WEIGHT =
              .20;

            const canvasLeft =
              finalX -
              localCanvas.width /
              2;

            const canvasTop =
              finalY -
              localCanvas.height /
              2;

            for (
              let y = 0;
              y < localCanvas.height;
              y += gap
            ) {
              for (
                let x = 0;
                x < localCanvas.width;
                x += gap
              ) {
                let weightSum = 0;
                let weightedX = 0;
                let weightedY = 0;
                let minBrightness = 255;

                const xEnd =
                  Math.min(
                    x + gap,
                    localCanvas.width
                  );

                const yEnd =
                  Math.min(
                    y + gap,
                    localCanvas.height
                  );

                for (
                  let sy = y;
                  sy < yEnd;
                  sy += 1
                ) {
                  for (
                    let sx = x;
                    sx < xEnd;
                    sx += 1
                  ) {
                    const pixelIndex =
                      (
                        sy *
                        localCanvas.width +
                        sx
                      ) *
                      4;

                    const alpha =
                      data[
                        pixelIndex + 3
                      ];

                    if (alpha < 18) {
                      continue;
                    }

                    const brightness =
                      (
                        data[pixelIndex] +
                        data[pixelIndex + 1] +
                        data[pixelIndex + 2]
                      ) /
                      3;

                    minBrightness =
                      Math.min(
                        minBrightness,
                        brightness
                      );

                    if (
                      brightness <
                      DARK_THRESHOLD
                    ) {
                      const darkWeight =
                        Math.max(
                          .03,
                          (
                            DARK_THRESHOLD -
                            brightness
                          ) /
                          DARK_THRESHOLD
                        );

                      weightSum +=
                        darkWeight;

                      weightedX +=
                        sx *
                        darkWeight;

                      weightedY +=
                        sy *
                        darkWeight;
                    }
                  }
                }

                const hasRealDot =
                  weightSum >=
                    MIN_DARK_WEIGHT ||
                  minBrightness <
                    205;

                if (!hasRealDot) {
                  continue;
                }

                const localX =
                  weightSum > 0
                    ? weightedX /
                      weightSum
                    : x +
                      gap / 2;

                const localY =
                  weightSum > 0
                    ? weightedY /
                      weightSum
                    : y +
                      gap / 2;

                const targetX =
                  canvasLeft +
                  localX;

                const targetY =
                  canvasTop +
                  localY;

                if (
                  targetX <
                    -20 * DPR ||
                  targetX >
                    sandCanvas.width +
                    20 * DPR ||
                  targetY <
                    -20 * DPR ||
                  targetY >
                    sandCanvas.height +
                    20 * DPR
                ) {
                  continue;
                }

                particles.push(
                  new SandParticle(
                    targetX,
                    targetY,
                    getImageStartTime(
                      index
                    )
                  )
                );
              }
            }

            /*
              高密度點描圖限制最大粒子數，
              避免 6 張時手機掉幀。
            */
            const MAX_PARTICLES_PER_IMAGE =
              window.innerWidth <= 768
                ? 5200
                : 7600;

            if (
              particles.length >
              MAX_PARTICLES_PER_IMAGE
            ) {
              const reduced = [];

              const step =
                particles.length /
                MAX_PARTICLES_PER_IMAGE;

              for (
                let p = 0;
                p <
                  MAX_PARTICLES_PER_IMAGE;
                p += 1
              ) {
                reduced.push(
                  particles[
                    Math.floor(
                      p *
                      step
                    )
                  ]
                );
              }

              resolve(reduced);
            } else {
              resolve(particles);
            }
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

  function createGroupedStoryAnimation(
    timeline,
    groups,
    startDelay = 0
  ) {
    if (startDelay > 0) {
      timeline.to(
        {},
        {
          duration:
            startDelay
        }
      );
    }

    groups.forEach(
      (
        {
          line,
          parts
        }
      ) => {
        gsap.set(
          line,
          {
            y: "115%",
            opacity: 0
          }
        );

        gsap.set(
          parts,
          {
            y: "22%",
            opacity: 0
          }
        );

        timeline.to(
          line,
          {
            y: "0%",
            opacity: 1,
            duration:
              STORY_PART_REVEAL,
            ease:
              "power2.out"
          }
        );

        timeline.to(
          parts[0],
          {
            y: "0%",
            opacity: 1,
            duration:
              STORY_PART_REVEAL,
            ease:
              "power1.out"
          },
          "<"
        );

        timeline.to(
          {},
          {
            duration:
              STORY_PART_GAP
          }
        );

        timeline.to(
          parts[1],
          {
            y: "0%",
            opacity: 1,
            duration:
              STORY_PART_REVEAL,
            ease:
              "power1.out"
          }
        );

        timeline.to(
          {},
          {
            duration:
              STORY_PART_GAP
          }
        );

        timeline.to(
          parts[2],
          {
            y: "0%",
            opacity: 1,
            duration:
              STORY_PART_REVEAL,
            ease:
              "power1.out"
          }
        );

        timeline.to(
          {},
          {
            duration:
              STORY_PART_GAP
          }
        );

        timeline.to(
          {},
          {
            duration:
              STORY_NEXT_LINE_WAIT
          }
        );
      }
    );
  }

  function completeAnimation() {
    if (completed) return;
    completed = true;

    // Standalone 沒有下一頁，完成後停留在最後畫面。
  }

  function resetVisualState() {
    applyStorySegments();
    applyFinalLineContent();
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

    frontDustCtx.clearRect(
      0,
      0,
      frontDustCanvas.width,
      frontDustCanvas.height
    );
  }

  function playTextSequence() {
    applyStorySegments();
    applyFinalLineContent();

    const storyLines =
      gsap.utils.toArray(
        "#text-container .story-line:not(#goldenLine)"
      ).slice(0, 4);

    const groups =
      storyLines.map(
        line => ({
          line,
          parts:
            gsap.utils.toArray(
              line.querySelectorAll(
                ".sub-part"
              )
            )
        })
      );

    textTimeline =
      gsap.timeline();

    createGroupedStoryAnimation(
      textTimeline,
      groups,
      STORY_START_DELAY
    );

    const goldenLine =
      document.getElementById(
        "goldenLine"
      );

    gsap.set(
      goldenLine,
      {
        y: "115%",
        opacity: 0
      }
    );

    gsap.set(
      goldenLine.querySelectorAll(
        ".ui-animate-text"
      ),
      {
        y: "22%",
        opacity: 0
      }
    );

    textTimeline.to(
      {},
      {
        duration:
          FINAL_LINE_WAIT
      }
    );

    textTimeline.to(
      goldenLine,
      {
        y: "0%",
        opacity: 1,
        duration:
          FINAL_TEXT_REVEAL,
        ease:
          "power2.out"
      }
    );

    textTimeline.to(
      "#fPart1",
      {
        y: "0%",
        opacity: 1,
        duration:
          FINAL_TEXT_REVEAL,
        ease:
          "power1.out"
      },
      "<"
    );

    [
      "#dot1",
      "#dot2",
      "#dot3"
    ].forEach(
      selector => {
        textTimeline.to(
          selector,
          {
            y: "0%",
            opacity: 1,
            duration:
              FINAL_DOT_REVEAL,
            ease:
              "power1.out"
          }
        );

        textTimeline.to(
          {},
          {
            duration:
              FINAL_DOT_HOLD
          }
        );
      }
    );

    textTimeline.to(
      "#fPart2",
      {
        y: "0%",
        opacity: 1,
        duration:
          FINAL_TEXT_REVEAL,
        ease:
          "power1.out"
      }
    );

    textTimeline.call(
      completeAnimation
    );
  }

  function render() {
    sandCtx.clearRect(
      0,
      0,
      sandCanvas.width,
      sandCanvas.height
    );

    frontDustCtx.clearRect(
      0,
      0,
      frontDustCanvas.width,
      frontDustCanvas.height
    );

    floatingDustParticles.forEach(
      dust => {
        dust.update();
        dust.draw(sandCtx);
      }
    );

    sandImageParticleGroups.forEach(
      group => {
        group.forEach(
          particle => {
            particle.update(
              sandGlobalProgress.t
            );

            particle.draw();
          }
        );
      }
    );

    /*
      少量前景沙點位於文字上方。
    */
    foregroundDustParticles.forEach(
      dust => {
        dust.update();
        dust.draw(frontDustCtx);
      }
    );

    rafId =
      requestAnimationFrame(
        render
      );
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
