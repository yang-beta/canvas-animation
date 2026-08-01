const canvas = document.getElementById('CanvasAnime');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 🖼️ 1. 準備所有的圖片路徑清單（可放入超過 4 張，程式只會隨機挑 4 張執行）
const ALL_IMAGE_SOURCES = [
    './pic/woman-s.png',
    './pic/woman-s.png',
    './pic/woman-s.png',
    './pic/woman-s.png',
    './pic/woman-s.png' // 👈 可自行新增更多圖片路徑
];

// 🎲 從圖片庫中隨機抽選 N 張圖片 (不重複)
function getRandomImages(sourceArray, count) {
    const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// ⏱️ 動態生成 4 張圖的配置檔 (隨機登場間隔 1.2s ~ 5.2s)
function createRandomImageConfigs(selectedSources) {
    let currentDelay = 0;
    return selectedSources.map((src, index) => {
        if (index === 0) {
            currentDelay = 0; // 第一張圖 0 秒登場
        } else {
            // 後續圖片登場間隔隨機加 1.2 秒到 5.2 秒
            const randomInterval = 1.2 + Math.random() * (5.2 - 1.2);
            currentDelay += randomInterval;
        }
        return { src, delay: currentDelay };
    });
}

let allImageGroups = [];
let globalProgress = { t: 0 };
let totalAnimationDuration = 15; // 預設安全時間

// 🎲 隨機產生不超出畫面的中心點 (帶有安全邊界)
function getRandomPosition() {
    const marginX = canvas.width * 0.2;
    const marginY = canvas.height * 0.2;
    return {
        x: marginX + Math.random() * (canvas.width - marginX * 2),
        y: marginY + Math.random() * (canvas.height - marginY * 2)
    };
}

// 🔲 砂塵粒子類別
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
        this.size = Math.random() * 1.6 + 0.6;
        this.baseAlpha = Math.random() * 0.7 + 0.3;
        this.alpha = 0;

        this.noiseX = (Math.random() - 0.5) * 2;
        this.noiseY = (Math.random() - 0.5) * 2;
    }

    update(totalElapsedSec) {
        const localTime = totalElapsedSec - this.delay;
        const duration = 8; // 單圖總存活時間 8 秒 (2s聚攏 -> 4s停留 -> 2s吹散)

        if (localTime < 0 || localTime > duration) {
            this.alpha = 0;
            return;
        }

        const progress = localTime / duration;

        if (progress < 0.25) {
            // 聚攏階段
            const p = progress / 0.25;
            const easeP = 1 - Math.pow(1 - p, 2.5);
            this.x = this.startX + (this.targetX - this.startX) * easeP;
            this.y = this.startY + (this.targetY - this.startY) * easeP;
            this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
        } else if (progress >= 0.25 && progress <= 0.75) {
            // 靜止停留與微幅飄動階段
            this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
            this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
            this.alpha = this.baseAlpha;
        } else {
            // 向右吹散階段
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

// 🖼️ 載入與初始化隨機 4 張圖片
async function initAllImages() {
    // 1. 從庫中隨機挑選 4 張圖片
    const selectedSources = getRandomImages(ALL_IMAGE_SOURCES, 4);
    
    // 2. 隨機生成登場的時間差 (delay 介於 1.2s ~ 5.2s)
    const imageConfigs = createRandomImageConfigs(selectedSources);

    // 計算這場動畫的總長度 (最後一張圖登場時間 + 單圖存活 8 秒 + 緩衝 1 秒)
    const lastDelay = imageConfigs[imageConfigs.length - 1].delay;
    totalAnimationDuration = lastDelay + 8 + 1;

    console.log("🎲 隨機圖片配置完成：", imageConfigs);

    const loadPromises = imageConfigs.map(config => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = config.src;
            img.onload = () => {
                const pos = getRandomPosition();

                // 🎯 3. 圖片目標寬度隨機：至少 500px，介於 500px ~ 650px 之間
                const TARGET_WIDTH = 500 + Math.random() * 150;
                
                const scale = TARGET_WIDTH / img.width;
                const imgW = img.width * scale;
                const imgH = img.height * scale;

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
                const gap = 4; // 採樣間隔

                for (let y = 0; y < canvas.height; y += gap) {
                    for (let x = 0; x < canvas.width; x += gap) {
                        const index = (y * canvas.width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const alpha = data[index + 3];
                        const brightness = (r + g + b) / 3;

                        if (alpha > 100 && brightness < 180) {
                            groupParticles.push(new SandParticle(x, y, config.delay));
                        }
                    }
                }
                resolve(groupParticles);
            };
        });
    });

    const results = await Promise.all(loadPromises);
    allImageGroups = results.flat();

    startAnimation();
}

let animId;

function startAnimation() {
    gsap.to(globalProgress, {
        t: totalAnimationDuration,
        duration: totalAnimationDuration,
        ease: "none",
        onComplete: () => {
            cancelAnimationFrame(animId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("✨ 隨機動畫已播放完畢，繪製迴圈終止");
        }
    });

    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allImageGroups.forEach(p => {
        p.update(globalProgress.t);
        p.draw();
    });

    if (globalProgress.t < totalAnimationDuration) {
        animId = requestAnimationFrame(animate);
    }
}

// 啟動隨機多圖動畫
initAllImages();

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

// 💡 提示：在 initParticlesFromImage 完成後呼叫 `startCanvasRecording(10);` 即可！
