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
    './pic/dog-s.png',
    './pic/grandpa-s.png',
    './pic/grandmon-s.png',
    './pic/lovers-s.png',
    './pic/kid-s.png',
    './pic/cat-s.png'
];

const DUST_COUNT = 80; // 背景常駐飄移粒子數量

let floatingDustParticles = [];
let sandImageParticles = [];
let generatedImageInfo = []; 
let globalProgress = { t: 0 };
let totalAnimationDuration = 15;

// -------------------------------------------------------------
// 🔲 類別 1: 常駐隨機飄移金塵
// -------------------------------------------------------------
class FloatingDust {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.7 + 0.8; 
        
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
// 🔲 類別 2: 圖片輪廓砂塵粒子
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
        // 粒子調細一點，提升輪廓細緻度 (0.5px ~ 1.8px)
        this.size = Math.random() * 1.3 + 0.5; 
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
// 🎲 演算法：100% 不會超出螢幕 + 嚴格限制重疊率 <= 15%
// -------------------------------------------------------------
function getRandomImages(sourceArray, count) {
    const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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

function getPartialOverlapPosition(imgWidth, imgHeight) {
    // 🎯 1. 確保圖片的左右上下絕不超出螢幕 (留出安全 margin)
    const minX = imgWidth / 2 + 30;
    const maxX = Math.max(minX + 10, canvas.width - imgWidth / 2 - 30);
    const minY = imgHeight / 2 + 30;
    const maxY = Math.max(minY + 10, canvas.height - imgHeight / 2 - 30);

    const MAX_OVERLAP_RATIO = 0.15; // 允許重疊上限 15%
    
    let maxAttempts = 150;
    let bestPos = null;
    let minObservedOverlap = Infinity;

    for (let i = 0; i < maxAttempts; i++) {
        // 在絕對安全的內邊界隨機選擇中心點
        const candidateX = minX + Math.random() * (maxX - minX);
        const candidateY = minY + Math.random() * (maxY - minY);

        const rectA = {
            left: candidateX - imgWidth / 2,
            right: candidateX + imgWidth / 2,
            top: candidateY - imgHeight / 2,
            bottom: candidateY + imgHeight / 2,
            area: imgWidth * imgHeight
        };

        let tooMuchOverlap = false;
        let maxOverlapRatioForThisCandidate = 0;

        for (const prev of generatedImageInfo) {
            const overlapX = Math.max(0, Math.min(rectA.right, prev.right) - Math.max(rectA.left, prev.left));
            const overlapY = Math.max(0, Math.min(rectA.bottom, prev.bottom) - Math.max(rectA.top, prev.top));
            
            const overlapArea = overlapX * overlapY;

            if (overlapArea > 0) {
                const ratioA = overlapArea / rectA.area;
                const ratioB = overlapArea / prev.area;
                const maxRatio = Math.max(ratioA, ratioB);

                maxOverlapRatioForThisCandidate = Math.max(maxOverlapRatioForThisCandidate, maxRatio);

                if (maxRatio > MAX_OVERLAP_RATIO) {
                    tooMuchOverlap = true;
                    break;
                }
            }
        }

        if (maxOverlapRatioForThisCandidate < minObservedOverlap) {
            minObservedOverlap = maxOverlapRatioForThisCandidate;
            bestPos = { x: candidateX, y: candidateY, width: imgWidth, height: imgHeight };
        }

        if (!tooMuchOverlap) {
            const finalRect = {
                x: candidateX,
                y: candidateY,
                left: rectA.left,
                right: rectA.right,
                top: rectA.top,
                bottom: rectA.bottom,
                area: rectA.area
            };
            generatedImageInfo.push(finalRect);
            return { x: candidateX, y: candidateY };
        }
    }

    // 防死鎖備用位置
    const finalRect = {
        x: bestPos.x,
        y: bestPos.y,
        left: bestPos.x - imgWidth / 2,
        right: bestPos.x + imgWidth / 2,
        top: bestPos.y - imgHeight / 2,
        bottom: bestPos.y + imgHeight / 2,
        area: imgWidth * imgHeight
    };
    generatedImageInfo.push(finalRect);
    return { x: bestPos.x, y: bestPos.y };
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
    generatedImageInfo = [];

    const selectedSources = getRandomImages(ALL_IMAGE_SOURCES, 4);
    const imageConfigs = createRandomImageConfigs(selectedSources);

    const lastDelay = imageConfigs[imageConfigs.length - 1].delay;
    totalAnimationDuration = lastDelay + 8 + 0.5;

    const loadPromises = imageConfigs.map(config => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = config.src;
            img.onload = () => {
                // 適度調整最大尺寸：420px ~ 550px，畫面比例最合適且不容易擠爆
                const TARGET_WIDTH = 420 + Math.random() * 130;
                const scale = TARGET_WIDTH / img.width;
                const imgW = img.width * scale;
                const imgH = img.height * scale;

                const pos = getPartialOverlapPosition(imgW, imgH);

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
                
                // 🎯 採樣間隔設為 3 (點更密集更細緻)
                const gap = 3; 

                for (let y = 0; y < canvas.height; y += gap) {
                    for (let x = 0; x < canvas.width; x += gap) {
                        const index = (y * canvas.width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const alpha = data[index + 3];
                        const brightness = (r + g + b) / 3;

                        // 🎯 關鍵修正：收緊亮度門檻至 < 90，只擷取真正的深色線條輪廓！
                        if (alpha > 120 && brightness < 90) {
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

// 啟動主流程
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
