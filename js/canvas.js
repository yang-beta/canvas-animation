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
    // 1. 取得瀏覽器視窗初始也是實際的寬與高
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

ctx.save(); 

ctx.shadowColor = 'rgba(255, 240, 200, 0.9)'; 
ctx.shadowBlur = 35;
ctx.beginPath();
ctx.lineWidth = 10;
ctx.strokeStyle = 'rgba(255, 250, 230, 0.9)';
ctx.lineCap = 'round';
ctx.moveTo(cx, 0);
ctx.lineTo(cx, canvas.height * 0.65);
ctx.stroke();

ctx.restore();

ctx.save(); 

ctx.shadowColor = 'rgba(215, 160, 80, 0.5)'; 
ctx.shadowBlur = 15;
ctx.beginPath();
ctx.lineWidth = 4;
ctx.strokeStyle = 'rgba(215, 160, 80, 0.5)';
ctx.lineCap = 'round';
ctx.moveTo(cx -40, 0);
ctx.lineTo(cx -40, canvas.height * 0.65);
ctx.stroke();

ctx.restore();

ctx.save(); 

ctx.shadowColor = 'rgba(215, 160, 80, 0.5)'; 
ctx.shadowBlur = 15;
ctx.beginPath();
ctx.lineWidth = 4;
ctx.strokeStyle = 'rgba(215, 160, 80, 0.5)';
ctx.lineCap = 'round';
ctx.moveTo(cx +40, 0);
ctx.lineTo(cx +40, canvas.height * 0.65);
ctx.stroke();

ctx.restore();

