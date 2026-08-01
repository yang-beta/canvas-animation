// js/canvas.js

const canvas = document.getElementById('CanvasAnime');

//2. 向 canvas 索取 2D 繪圖畫筆
const ctx = canvas.getContext('2d');

//console.log(canvas);
//console.log(ctx);

//設定畫布，宣告畫布中心點變數 (先給預設值 0)
let cx = 0; //代表 Center X 與 Center Y（中心點）
let cy = 0;

function resizeCanvas() {
    // 1. 取得瀏覽器視窗初始也是實際的寬與高，需要設定的原因是因為瀏覽器會預設給這張畫布 300px × 150px 的真實像素解析度
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;
    
    // 2. 將畫布的真實繪圖像素設定為視窗大小
    canvas.width = viewWidth;
    canvas.height = viewHeight;

    // 3. 更新中心點座標 (寬度的一半, 高度的一半)

    cx = viewWidth / 2;
    cy = viewHeight / 2;
}

// 頁面初次載入時執行一次
resizeCanvas();
// 當使用者拖拉改變視窗大小時，自動觸發重新計算
window.addEventListener('resize',resizeCanvas);

// function drawSingleBeam(){

//     // 1. 儲存當前的畫筆狀態
//     ctx.save();
//     // 2. 設定發光/陰影屬性
//     ctx.shadowColor ='rgba(215,160,80,0.6)';
//     ctx.shadowBlur = 25;
//     //上面宣告完成後，底下是實際進入繪製階段
//     ctx.beginPath();
//     // 1. 設定線條顏色（RGBA: 紅, 綠, 藍, 透明度）
//     ctx.strokeStyle = 'rgba(235,190,110,0.6)';
//     // 2. 設定線條粗細 (單位為像素 px)
//     ctx.lineWidth = 6;
//     // 3. 設定線條端點形狀 ('round' 代表圓潤端點)
//     ctx.lineCap = 'round';
//     ctx.moveTo(cx,0);
//     ctx.lineTo(cx, canvas.height*0.75);
//     ctx.stroke();
//     // 4. 還原畫筆狀態 (取消 shadowBlur 避免影響後續繪圖)
//     ctx.restore();
// }

// drawSingleBeam();

// ctx.save(); 

// ctx.shadowColor = 'rgba(255, 240, 200, 0.9)'; 
// ctx.shadowBlur = 35;
// ctx.beginPath();
// ctx.lineWidth = 10;
// ctx.strokeStyle = 'rgba(255, 250, 230, 0.9)';
// ctx.lineCap = 'round';
// ctx.moveTo(cx, 0);
// ctx.lineTo(cx, canvas.height * 0.65);
// ctx.stroke();

// ctx.restore();

// ctx.save(); 

// ctx.shadowColor = 'rgba(215, 160, 80, 0.5)'; 
// ctx.shadowBlur = 15;
// ctx.beginPath();
// ctx.lineWidth = 4;
// ctx.strokeStyle = 'rgba(215, 160, 80, 0.5)';
// ctx.lineCap = 'round';
// ctx.moveTo(cx -40, 0);
// ctx.lineTo(cx -40, canvas.height * 0.65);
// ctx.stroke();

// ctx.restore();

// ctx.save(); 

// ctx.shadowColor = 'rgba(215, 160, 80, 0.5)'; 
// ctx.shadowBlur = 15;
// ctx.beginPath();
// ctx.lineWidth = 4;
// ctx.strokeStyle = 'rgba(215, 160, 80, 0.5)';
// ctx.lineCap = 'round';
// ctx.moveTo(cx +40, 0);
// ctx.lineTo(cx +40, canvas.height * 0.65);
// ctx.stroke();

// ctx.restore();

//三條光束進階寫法
// 1. 定義畫光束的通用工具函式
function drawBeam(x, width, color, blur) {
    ctx.save(); 
    ctx.shadowColor = color; 
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    
    // 繪製線條
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height * 0.65);
    ctx.stroke();
    
    ctx.restore();
}

// 2. 呼叫工具函式，輕鬆畫出三條線！
drawBeam(cx, 10, 'rgba(255, 250, 230, 0.9)', 35);      // 中間主光束
drawBeam(cx -20, 4, 'rgba(215, 160, 80, 0.5)', 15);   // 左側光束
drawBeam(cx +20, 4, 'rgba(215, 160, 80, 0.5)', 15);   // 右側光束

// 1. 建立一個名為 singleParticle 的物件，代表「單一顆金色粒子」的身分證
const singleParticle ={
    x:300,
    y:200,
    size:4,
    color: 'rgba(235,190,110,0.8)'
};
// 2. 如何讀取物件裡面的資料？使用「點語法 ( Dot Notation )」
console.log(singleParticle.x);
console.log(singleParticle.size);

const goldBeam ={
    offset: -50,
    width: 6,
    alpha: 0.5,
    color: 'rgb(215, 160, 80)'
};

const p ={
    x: 100,
    y: 150,
    size: 50,
    color: 'rgba(255, 250, 230, 0.8)'
};

ctx.beginPath();
ctx.fillStyle = p.color;

ctx.arc(p.x,p.y,p.size,0, Math.PI * 2);

ctx.fill();

let lightBeam;

if (Math.random() > 0.5) {
    lightBeam = 'rgba(235,190,110,0.8)';
} else {
    lightBeam = 'rgba(255,255,255,0.8)';
}

ctx.save();
ctx.lineWidth = 20;
ctx.strokeStyle = lightBeam;
ctx.beginPath();
ctx.moveTo(200,800);
ctx.lineTo (800,800);
ctx.stroke();
ctx.restore();

const goldParticles = [];
const particleCount = 80;

for (let i=0; i < particleCount; i++) {

    const newParticle = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 19+1,
        alpha: Math.random() * 0.5+0.2
    };
    
    goldParticles.push(newParticle);
}

const beamLines = [];
const lineCount = 40;

for (let i=0; i<lineCount; i++){

    const newLines = {
        offset: (Math.random() - 0.5)* 500,
        width: Math.random() *3 +1,
        alpha: Math.random() *0.3 +0.1
    };

    beamLines.push(beamLines);
}

function drawGoldParticles() {
    // 使用 forEach 巡邏陣列中的每一個粒子物件 (命名為 p)
    goldParticles.forEach(p => {
        ctx.save(); // 隔離發光與顏色狀態
        
        // 1. 設定粒子的填充顏色與發光
        ctx.fillStyle = `rgba(235, 195, 100, ${p.alpha})`;
        ctx.shadowColor = 'rgba(215, 160, 60, 0.6)';
        ctx.shadowBlur = 6;

        // 2. 開始畫圓形粒子
        ctx.beginPath();
        // arc 參數: (中心X, 中心Y, 半徑, 開始角度0, 結束角度 360度即 Math.PI * 2)
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // 3. 填滿圓形實心色彩
        ctx.fill(); 

        ctx.restore(); // 還原狀態
    });
}

drawGoldParticles();