const canvas = document.getElementById('CanvasAnime');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 🖼️ 設定多圖設定檔 (可隨意增加/刪除圖片)
const IMAGE_CONFIGS = [
    { src: './pic/woman-s.png', delay: 0 },   // 第 0 秒開始
    { src: './pic/woman-s.png', delay: 2 },   // 第 2 秒開始登場 (時間局部重疊)
    { src: './pic/woman-s.png', delay: 4 },   // 第 4 秒開始登場
    { src: './pic/woman-s.png', delay: 5.5 }  // 第 5.5 秒開始登場
];

let allImageGroups = [];
let globalProgress = { t: 0 }; // 總時間驅動

// 🎲 隨機產生不超出畫面的中心點 (帶有安全邊界防貼邊)
function getRandomPosition() {
    const marginX = canvas.width * 0.15;
    const marginY = canvas.height * 0.15;
    return {
        x: marginX + Math.random() * (canvas.width - marginX * 2),
        y: marginY + Math.random() * (canvas.height - marginY * 2)
    };
}

// 🔲 粒子類別 (支援獨立的出現中心與時間 Delay)
class SandParticle {
    constructor(targetX, targetY, delay) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.delay = delay; // 時間錯開量

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
        // 計算該粒子專屬的相對時間 (扣除 delay)
        const localTime = totalElapsedSec - this.delay;
        const duration = 9; // 單張圖的完整生命週期為 9 秒 (2s聚攏 -> 5s停留 -> 2s散去)

        if (localTime < 0 || localTime > duration) {
            this.alpha = 0; // 還沒到時間或已經播放結束，隱藏粒子
            return;
        }

        const progress = localTime / duration; // 該圖的進度 (0 ~ 1)

        if (progress < 0.22) {
            // 聚攏
            const p = progress / 0.22;
            const easeP = 1 - Math.pow(1 - p, 2.5);
            this.x = this.startX + (this.targetX - this.startX) * easeP;
            this.y = this.startY + (this.targetY - this.startY) * easeP;
            this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
        } else if (progress >= 0.22 && progress <= 0.78) {
            // 停留
            this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
            this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
            this.alpha = this.baseAlpha;
        } else {
            // 吹散
            const p = (progress - 0.78) / 0.22;
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

// 🖼️ 載入所有圖片並隨機配對位置
async function initAllImages() {
    const loadPromises = IMAGE_CONFIGS.map(config => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = config.src;
            img.onload = () => {
                const pos = getRandomPosition(); // 🎯 每次載入時，隨機分配位置
                const scale = 0.35; // 多圖時，可將每張圖調小一點避免過於擁擠

                const offscreen = document.createElement('canvas');
                const offCtx = offscreen.getContext('2d');
                const imgW = img.width * scale;
                const imgH = img.height * scale;

                offscreen.width = canvas.width;
                offscreen.height = canvas.height;

                // 將圖片畫在隨機計算的中心點 (pos.x, pos.y) 上
                const offsetX = pos.x - imgW / 2;
                const offsetY = pos.y - imgH / 2;
                offCtx.drawImage(img, offsetX, offsetY, imgW, imgH);

                const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const groupParticles = [];
                const gap = 4;

                for (let y = 0; y < canvas.height; y += gap) {
                    for (let x = 0; x < canvas.width; x += gap) {
                        const index = (y * canvas.width + x) * 4;
                        if (data[index + 3] > 100 && (data[index] + data[index + 1] + data[index + 2]) / 3 < 180) {
                            groupParticles.push(new SandParticle(x, y, config.delay));
                        }
                    }
                }
                resolve(groupParticles);
            };
        });
    });

    // 等待所有圖片採樣完成
    const results = await Promise.all(loadPromises);
    // 將所有圖的粒子扁平化合成一個大陣列，單次渲染迴圈效能最好！
    allImageGroups = results.flat();

    startAnimation();
}

let animId;
const TOTAL_DURATION = 15; // 總時長 (包含延遲)

function startAnimation() {
    gsap.to(globalProgress, {
        t: TOTAL_DURATION,
        duration: TOTAL_DURATION,
        ease: "none",
        onComplete: () => {
            cancelAnimationFrame(animId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("✨ 所有圖片粒子動畫播放完畢");
        }
    });

    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 統一由 globalProgress.t (當前秒數) 驅動所有粒子
    allImageGroups.forEach(p => {
        p.update(globalProgress.t);
        p.draw();
    });

    if (globalProgress.t < TOTAL_DURATION) {
        animId = requestAnimationFrame(animate);
    }
}

// 啟動多圖隨機動畫
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
