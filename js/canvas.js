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
    // img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        const offCtx = offscreenCanvas.getContext('2d');

        // 設定輪廓圖在畫面中央呈現的大小
        const scale = Math.min(canvas.width * 0.5 / img.width, canvas.height * 0.8 / img.height);
        const imgW = img.width * scale;
        const imgH = img.height * scale;
        const offsetX = (canvas.width - imgW) / 2;
        const offsetY = (canvas.height - imgH) / 2;

        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        offCtx.drawImage(img, offsetX, offsetY, imgW, imgH);

        // 讀取像素
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        particles = [];

        // 採樣間隔 (Gap)：數值越小粒子越密，越大效能越好
        const gap = 4; 

        for (let y = 0; y < canvas.height; y += gap) {
            for (let x = 0; x < canvas.width; x += gap) {
                const index = (y * canvas.width + x) * 4;
                const alpha = data[index + 3];
                const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;

                // 若像素不是完全透明，且具有亮度，則生成粒子目標
                if (alpha > 128 && brightness > 30) {
                    particles.push(new Particle(x, y));
                }
            }
        }

        startAnimationTimeline();
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
