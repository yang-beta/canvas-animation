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

//上面宣告完成後，底下是實際進入繪製階段
ctx.beginPath();
ctx.moveTo(cx,0);
ctx.lineTo(cx, canvas.height);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(0, canvas.height * 0.75);
ctx.lineTo(cx * 2, canvas.height * 0.75);
ctx.stroke();

