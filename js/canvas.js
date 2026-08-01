const canvas = document.getElementById('CanvasAnime');
const ctx = canvas.getContext('2d');

let particles = [];
let animationProgress = { t: 0 }; // 動態進度控制變數 (0 到 1)
const IMAGE_SRC = './pic/woman-s.png';    // ⚠️ 請替換為您的老婦人輪廓/剪影圖片路徑

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
        // progress: 0 -> 0.4 (入場聚集) | 0.4 -> 0.6 (停留靜止) | 0.6 -> 1.0 (右吹消逝)
        if (progress < 0.45) {
            // 第一階段：從左側向目標位置聚攏 (Lerp 插值)
            const p = progress / 0.45;
            const easeP = Math.pow(p, 3); // 減速聚集
            this.x = this.startX + (this.targetX - this.startX) * easeP;
            this.y = this.startY + (this.targetY - this.startY) * easeP;
            this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
        } else if (progress >= 0.45 && progress <= 0.65) {
            // 第二階段：維持輪廓並帶有微幅飄動
            this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
            this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
            this.alpha = this.baseAlpha;
        } else {
            // 第三階段：向右擴散吹散
            const p = (progress - 0.65) / 0.35;
            const easeP = Math.pow(p, 2); // 加速吹散
            this.x = this.targetX + (this.endX - this.targetX) * easeP;
            this.y = this.targetY + (this.endY - this.targetY) * easeP + (Math.random() - 0.5) * 2;
            this.alpha = this.baseAlpha * (1 - p); // 逐漸透明
        }
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(240, 195, 110, ${this.alpha})`; // 金黃色沙粒
        ctx.shadowColor = 'rgba(215, 160, 80, 0.8)';
        ctx.shadowBlur = 4; // 金光微發光特效
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 🖼️ 載入圖像並抽樣提取粒子目標點
function initParticlesFromImage(imageSrc) {
    const img = new Image();
    // 如果是本機/同源伺服器，不需要 crossOrigin
    img.src = imageSrc;

    img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        const offCtx = offscreenCanvas.getContext('2d');

        // 設定輪廓圖在畫面中央呈現的大小
        const scale = Math.min(canvas.width * 0.5 / img.width, canvas.height * 0.8 / img.height)[cite: 4];
        const imgW = img.width * scale[cite: 4];
        const imgH = img.height * scale[cite: 4];
        const offsetX = (canvas.width - imgW) / 2[cite: 4];
        const offsetY = (canvas.height - imgH) / 2[cite: 4];

        offscreenCanvas.width = canvas.width[cite: 4];
        offscreenCanvas.height = canvas.height[cite: 4];
        
        // 1. 將圖片畫到離屏 Canvas 上
        offCtx.drawImage(img, offsetX, offsetY, imgW, imgH)[cite: 4];

        // 2. 讀取像素
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height)[cite: 4];
        const data = imageData.data[cite: 4];
        particles = [][cite: 4];

        // 採樣間隔：線條稿建議設 3 或 4，粒子會比較細緻
        const gap = 3; 

        for (let y = 0; y < canvas.height; y += gap) {
            for (let x = 0; x < canvas.width; x += gap) {
                const index = (y * canvas.width + x) * 4[cite: 4];
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const alpha = data[index + 3];

                // 計算亮度 (0~255)
                const brightness = (r + g + b) / 3;

                // 🎯 關鍵修改：
                // 情況 A：如果是透明底黑線圖 -> 抓 Alpha > 100 且 亮度 < 200 (非純白)
                // 情況 B：如果是白底黑線圖 -> 抓 Alpha > 100 且 亮度 < 180 (偏暗的黑點/灰點)
                if (alpha > 100 && brightness < 180) {
                    particles.push(new Particle(x, y));
                }
            }
        }

        console.log("✅ 成功擷取到輪廓粒子數量：", particles.length);

        if (particles.length > 0) {
            startAnimationTimeline()[cite: 4];
        } else {
            console.warn("⚠️ 依然沒有抓到粒子，請檢查圖片是否有成功繪製於 canvas 上");
        }
    };

    img.onerror = () => {
        console.error("❌ 圖片載入失敗，請檢查路徑：", imageSrc);
    };
}

// ⏱️ 利用 GSAP 控制 2.5s 聚攏 -> 2s 停留 -> 2.5s 散去
function startAnimationTimeline() {
    gsap.timeline({ repeat: -1, repeatDelay: 1 })
        .to(animationProgress, {
            t: 1,
            duration: 7, // 總動畫時長 7 秒
            ease: "none"
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

    requestAnimationFrame(animate);
}

// 啟動動畫
initParticlesFromImage(IMAGE_SRC);
