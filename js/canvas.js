const canvas = document.getElementById('CanvasAnime');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// -------------------------------------------------------------
// ⚙️ 參數設定區
// -------------------------------------------------------------
const ALL_IMAGE_SOURCES = [
    './pic/dog-l.png',
    './pic/grandpa-l.png',
    './pic/grandmom-l.png',
    './pic/lovers-l.png',
    './pic/kid-l.png',
    './pic/cat-l.png'
];

const DUST_COUNT = 80; // 常駐背景飄移金塵數量

let floatingDustParticles = [];
let sandImageParticles = [];
let globalProgress = { t: 0 };
let totalAnimationDuration = 15;

// -------------------------------------------------------------
// 🔲 類別 1: 常駐隨機飄移金塵
// -------------------------------------------------------------
class FloatingDust {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 0.8; 
        
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        
        this.baseAlpha = Math.random() * 0.6 + 0.3;
        this.alpha = this.baseAlpha;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        this.alpha = this.baseAlpha + Math.sin(Date.now() * this.pulseSpeed) * 0.2;
    }

    draw() {
        ctx.save();
        ctx.fillStyle = `rgba(240, 195, 110, ${Math.max(0, this.alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function initFloatingDust() {
    floatingDustParticles = [];
    for (let i = 0; i < DUST_COUNT; i++) {
        floatingDustParticles.push(new FloatingDust());
    }
}

// -------------------------------------------------------------
// 🔲 類別 2: 圖片輪廓砂塵粒子 (針對點陣線條圖優化)
// -------------------------------------------------------------
class SandParticle {
    constructor(targetX, targetY, delay) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.delay = delay;

        this.startX = -Math.random() * canvas.width * 0.4 - 50;
        this.startY = targetY + (Math.random() - 0.5) * 200;

        this.endX = canvas.width + Math.random() * canvas.width * 0.4 + 50;
        this.endY = targetY + (Math.random() - 0.5) * 200;

        this.x = this.startX;
        this.y = this.startY;
        // 線條圖建議粒徑 0.6px ~ 1.6px
        this.size = Math.random() * 1.0 + 0.6; 
        this.baseAlpha = Math.random() * 0.7 + 0.3;
        this.alpha = 0;

        this.noiseX = (Math.random() - 0.5) * 2;
        this.noiseY = (Math.random() - 0.5) * 2;
    }

    update(totalElapsedSec) {
        const localTime = totalElapsedSec - this.delay;
        const duration = 8; 

        if (localTime < 0 || localTime > duration) {
            this.alpha = 0;
            return;
        }

        const progress = localTime / duration;

        if (progress < 0.25) {
            const p = progress / 0.25;
            const easeP = 1 - Math.pow(1 - p, 2.5);
            this.x = this.startX + (this.targetX - this.startX) * easeP;
            this.y = this.startY + (this.targetY - this.startY) * easeP;
            this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
        } else if (progress >= 0.25 && progress <= 0.75) {
            this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
            this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
            this.alpha = this.baseAlpha;
        } else {
            const p = (progress - 0.75) / 0.25;
            const easeP = Math.pow(p, 2.5);
            this.x = this.targetX + (this.endX - this.targetX) * easeP;
            this.y = this.targetY + (this.endY - this.targetY) * easeP;
            this.alpha = this.baseAlpha * (1 - p);
        }
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(240, 195, 110, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// -------------------------------------------------------------
// 🎯 梅花型 5 區固態座標演算法 (含 ±10% 隨機位移量)
// -------------------------------------------------------------
function getRandomImages(sourceArray, minCount = 4, maxCount = 5) {
    const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
    // 隨機選擇 4 張或 5 張圖
    const targetCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    return shuffled.slice(0, Math.min(targetCount, sourceArray.length));
}

function createRandomImageConfigs(selectedSources) {
    let currentDelay = 0;
    return selectedSources.map((src, index) => {
        if (index === 0) {
            currentDelay = 0;
        } else {
            const randomInterval = 1.2 + Math.random() * (5.2 - 1.2);
            currentDelay += randomInterval;
        }
        return { src, delay: currentDelay };
    });
}

// 📍 依據第二張圖設定 5 個相對位置 (梅花佈局)
function getFixed5ZonePosition(index, imgW, imgH) {
    const W = canvas.width;
    const H = canvas.height;

    // 5 個基礎中心點 (相對比例)
    // 0: 左上 (22%, 25%) | 1: 右上 (78%, 25%) | 2: 正中 (50%, 50%) | 3: 左下 (22%, 75%) | 4: 右下 (78%, 75%)
    const baseCenters = [
        { x: W * 0.22, y: H * 0.25 }, // 左上
        { x: W * 0.78, y: H * 0.25 }, // 右上
        { x: W * 0.50, y: H * 0.50 }, // 正中
        { x: W * 0.22, y: H * 0.75 }, // 左下
        { x: W * 0.78, y: H * 0.75 }  // 右下
    ];

    // 初始化時將 5 個位置打亂順序，確保出現位置隨機
    if (!window.shuffledBaseZones) {
        window.shuffledBaseZones = [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random());
    }

    const center = baseCenters[window.shuffledBaseZones[index]];

    // 🎯 增加 ±10% 的上下左右隨機位移量
    const offsetX = (Math.random() - 0.5) * 0.2 * W;
    const offsetY = (Math.random() - 0.5) * 0.2 * H;

    // 邊界防護，防止 10% 偏移後切到視窗外
    const finalX = Math.max(imgW / 2 + 20, Math.min(W - imgW / 2 - 20, center.x + offsetX));
    const finalY = Math.max(imgH / 2 + 20, Math.min(H - imgH / 2 - 20, center.y + offsetY));

    return { x: finalX, y: finalY };
}

// -------------------------------------------------------------
// 📝 詩意文字登場流程
// -------------------------------------------------------------
function playTextAnimationSequence() {
    const textLines = document.querySelectorAll('.text-line');
    const textTl = gsap.timeline();

    textLines.forEach((line, index) => {
        const randomDelay = index === 0 ? 0.5 : (1.5 + Math.random() * 1.5);

        textTl.to(line, {
            y: "0%",
            opacity: 1,
            duration: 2.2,
            ease: "power2.out"
        }, `+=${randomDelay}`);
    });

    const randomStayDuration = 3 + Math.random() * 2;

    textTl.to("#text-container", {
        opacity: 0,
        duration: 2.5,
        ease: "power2.inOut",
        delay: randomStayDuration
    });
}

// -------------------------------------------------------------
// 🖼️ 載入與初始化
// -------------------------------------------------------------
async function initAllImages() {
    initFloatingDust();
    window.shuffledBaseZones = null; // 重置位置區域分配

    // 🎯 隨機選擇 4 ~ 5 張圖
    const selectedSources = getRandomImages(ALL_IMAGE_SOURCES, 4, 5);
    const imageConfigs = createRandomImageConfigs(selectedSources);

    const lastDelay = imageConfigs[imageConfigs.length - 1].delay;
    totalAnimationDuration = lastDelay + 8 + 0.5;

    const loadPromises = imageConfigs.map((config, imgIndex) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = config.src;
            img.onload = () => {
                // 🎯 圖片寬度：400px ~ 480px (梅花 5 區最佳視覺比例)
                const TARGET_WIDTH = 400 + Math.random() * 80;
                const scale = TARGET_WIDTH / img.width;
                const imgW = img.width * scale;
                const imgH = img.height * scale;

                // 🎯 取得帶有 ±10% 位移的梅花型位置
                const pos = getFixed5ZonePosition(imgIndex, imgW, imgH);

                const offscreen = document.createElement('canvas');
                const offCtx = offscreen.getContext('2d');

                offscreen.width = canvas.width;
                offscreen.height = canvas.height;

                const offsetX = pos.x - imgW / 2;
                const offsetY = pos.y - imgH / 2;
                offCtx.drawImage(img, offsetX, offsetY, imgW, imgH);

                const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const groupParticles = [];
                
                // 🎯 點陣線條稿最佳採樣設定：gap = 3
                const gap = 3; 

                for (let y = 0; y < canvas.height; y += gap) {
                    for (let x = 0; x < canvas.width; x += gap) {
                        const index = (y * canvas.width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const alpha = data[index + 3];
                        const brightness = (r + g + b) / 3;

                        // 🎯 採樣點陣線條：Alpha > 100 且 Brightness < 200
                        if (alpha > 100 && brightness < 200) {
                            groupParticles.push(new SandParticle(x, y, config.delay));
                        }
                    }
                }
                resolve(groupParticles);
            };
        });
    });

    const results = await Promise.all(loadPromises);
    sandImageParticles = results.flat();

    startAnimation();
}

let animId;

function startAnimation() {
    gsap.to(globalProgress, {
        t: totalAnimationDuration,
        duration: totalAnimationDuration,
        ease: "none",
        onComplete: () => {
            console.log("✨ 沙塵輪廓完畢，觸發文字漸顯動畫...");
            playTextAnimationSequence();
        }
    });

    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    floatingDustParticles.forEach(dust => {
        dust.update();
        dust.draw();
    });

    if (globalProgress.t < totalAnimationDuration) {
        sandImageParticles.forEach(p => {
            p.update(globalProgress.t);
            p.draw();
        });
    }

    animId = requestAnimationFrame(animate);
}

// -------------------------------------------------------------
// 🎥 Canvas 動態錄製工具 (預設保持註解)
// -------------------------------------------------------------
// function startCanvasRecording(durationInSeconds) {
//     // 1. 從 Canvas 抓取畫面串流 (60 FPS)
//     const stream = canvas.captureStream(60);
//     const mediaRecorder = new MediaRecorder(stream, {
//         mimeType: 'video/webm;codecs=vp9', // 高畫質 VP9 編碼
//         videoBitsPerSecond: 8000000 // 8 Mbps 高位元率，確保沙塵微粒清晰不模糊
//     });

//     const recordedChunks = [];

//     mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//             recordedChunks.push(event.data);
//         }
//     };

//     mediaRecorder.onstop = () => {
//         // 2. 將錄製資料轉為 Blob 並自動觸發下載
//         const blob = new Blob(recordedChunks, { type: 'video/webm' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = 'sand-particles-animation.webm';
//         a.click();
//         URL.revokeObjectURL(url);
//         console.log("🎬 高畫質影片錄製完成並已下載！");
//     };

//     // 開始錄製
//     mediaRecorder.start();

//     // 動畫結束時自動停止錄製
//     setTimeout(() => {
//         mediaRecorder.stop();
//     }, durationInSeconds * 1000);
// }

// 啟動主流程
initAllImages();
