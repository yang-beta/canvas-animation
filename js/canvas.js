const canvas = document.getElementById('CanvasAnime');
const ctx = canvas.getContext('2d');

let particles = [];
let animationProgress = { t: 0 }; // 動態進度控制變數 (0 到 1)
const IMAGE_SRC = './pic/woman-s.png'; // 輪廓圖片路徑

// 🎯 1. 人像大小控制參數 (放大/縮小)：
// 1.0 代表預設大小；1.2 代表放大 20%；0.8 代表縮小 20%
const IMAGE_SCALE_FACTOR = 1.0; 

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 🔲 單一金沙粒子類別
class Particle {
    constructor(targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;

        // 1. 起始位置：從畫面左側隨機飛入
        this.startX = -Math.random() * canvas.width * 0.5 - 50;
        this.startY = targetY + (Math.random() - 0.5) * 300;

        // 2. 結束位置：向畫面右側吹散
        this.endX = canvas.width + Math.random() * canvas.width * 0.5 + 50;
        this.endY = targetY + (Math.random() - 0.5) * 200;

        // 當前位置
        this.x = this.startX;
        this.y = this.startY;

        // 視覺與微動屬性
        this.size = Math.random() * 1.8 + 0.6; // 0.6px ~ 2.4px 的細沙
        this.baseAlpha = Math.random() * 0.7 + 0.3;
        this.alpha = this.baseAlpha;
        
        // 浮動噪音偏移量（營造塵埃感）
        this.noiseX = (Math.random() - 0.5) * 2;
        this.noiseY = (Math.random() - 0.5) * 2;
    }

    update(progress) {
        // 進度比例分配：
        // 0.00 -> 0.25 : 聚合入場 (2.5秒)
        // 0.25 -> 0.75 : 停留靜止 (5.0秒)
        // 0.75 -> 1.00 : 右吹散去 (2.5秒)

        if (progress < 0.25) {
            // 第一階段：從左側向目標位置慢慢聚攏
            const p = progress / 0.25;
            // 使用 Ease-Out 緩動，讓進入過程順暢平滑
            const easeP = 1 - Math.pow(1 - p, 2.5);
            this.x = this.startX + (this.targetX - this.startX) * easeP;
            this.y = this.startY + (this.targetY - this.startY) * easeP;
            this.alpha = Math.min(1, p * 1.2) * this.baseAlpha;
        } else if (progress >= 0.25 && progress <= 0.75) {
            // 第二階段：維持人像輪廓，帶有微幅飄動
            this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
            this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
            this.alpha = this.baseAlpha;
        } else {
            // 第三階段：向右側慢慢吹散 (節奏與入場對稱)
            const p = (progress - 0.75) / 0.25;
            // 使用 Ease-In 緩動，讓離開過程自然加速
            const easeP = Math.pow(p, 2.5);
            this.x = this.targetX + (this.endX - this.targetX) * easeP;
            this.y = this.targetY + (this.endY - this.targetY) * easeP + (Math.random() - 0.5) * 2;
            this.alpha = this.baseAlpha * (1 - p); // 逐漸透明
        }
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(240, 195, 110, ${this.alpha})`; // 金黃色沙粒
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 🖼️ 載入圖像並抽樣提取粒子目標點
function initParticlesFromImage(imageSrc) {
    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        const offCtx = offscreenCanvas.getContext('2d');

        // 🎯 2. 計算等比例縮放與自動置中：
        const baseScale = Math.min(canvas.width * 0.5 / img.width, canvas.height * 0.8 / img.height);
        const finalScale = baseScale * IMAGE_SCALE_FACTOR; // 乘以自訂倍率

        const imgW = img.width * finalScale;
        const imgH = img.height * finalScale;
        const offsetX = (canvas.width - imgW) / 2;
        const offsetY = (canvas.height - imgH) / 2;

        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        
        // 1. 將圖片畫到離屏 Canvas 上
        offCtx.drawImage(img, offsetX, offsetY, imgW, imgH);

        // 2. 讀取像素
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        particles = [];

        // 採樣間隔 (Gap)
        const gap = 4; 

        for (let y = 0; y < canvas.height; y += gap) {
            for (let x = 0; x < canvas.width; x += gap) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const alpha = data[index + 3];

                const brightness = (r + g + b) / 3;

                if (alpha > 100 && brightness < 180) {
                    particles.push(new Particle(x, y));
                }
            }
        }

        console.log("✅ 成功擷取到輪廓粒子數量：", particles.length);

        if (particles.length > 0) {
            startAnimationTimeline();
        } else {
            console.warn("⚠️ 依然沒有抓到粒子，請檢查圖片是否有成功繪製於 canvas 上");
        }
    };

    img.onerror = () => {
        console.error("❌ 圖片載入失敗，請檢查路徑：", imageSrc);
    };
}

let animationFrameId;

// ⏱️ 只播放一次：總長 10 秒（2.5s 平滑聚合 -> 5s 停留 -> 2.5s 平滑散去）
function startAnimationTimeline() {
    gsap.to(animationProgress, {
        t: 1,
        duration: 10,
        ease: "none",
        onComplete: () => {
            cancelAnimationFrame(animationFrameId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("✨ 動畫已播放完畢，繪製迴圈已完全停止");
        }
    });

    animate();
}

// 🔄 Canvas 渲染主迴圈
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.update(animationProgress.t);
        p.draw();
    });

    if (animationProgress.t < 1) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

// 啟動動畫
initParticlesFromImage(IMAGE_SRC);
