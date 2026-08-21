(() => {
  "use strict";

  /* ============================================================
     沙畫故事影片輸出
     - 合成主沙畫 Canvas、DOM 文字、前景沙塵 Canvas
     - captureStream() + MediaRecorder
     - 優先輸出瀏覽器原生 MP4；不支援時自動改為 WebM
     ============================================================ */
  const CONFIG = {
    AUTO_RECORD: true,
    WIDTH: 1920,
    HEIGHT: 1080,
    FPS: 60,
    VIDEO_BITS_PER_SECOND: 30000000,
    FILE_BASENAME: "sand-story-1920x1080",
    FINAL_HOLD_MS: 2000
  };

  let exportCanvas;
  let exportCtx;
  let recorder;
  let stream;
  let chunks = [];
  let rafId = null;
  let stopTimer = null;
  let recording = false;

  const number = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  function ensureCanvas() {
    if (exportCanvas) return;
    exportCanvas = document.createElement("canvas");
    exportCanvas.width = CONFIG.WIDTH;
    exportCanvas.height = CONFIG.HEIGHT;
    exportCtx = exportCanvas.getContext("2d", { alpha: false });
  }

  function getPageScale() {
    const page = document.getElementById("audiovisualSection");
    if (!page) return null;
    const rect = page.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      rect,
      sx: CONFIG.WIDTH / rect.width,
      sy: CONFIG.HEIGHT / rect.height
    };
  }

  function toExportRect(rect, scale) {
    return {
      x: (rect.left - scale.rect.left) * scale.sx,
      y: (rect.top - scale.rect.top) * scale.sy,
      width: rect.width * scale.sx,
      height: rect.height * scale.sy
    };
  }

  function drawSourceCanvas(id) {
    const source = document.getElementById(id);
    if (!source || !source.width || !source.height) return;
    exportCtx.drawImage(
      source,
      0, 0, source.width, source.height,
      0, 0, CONFIG.WIDTH, CONFIG.HEIGHT
    );
  }

  function fontString(style, scale) {
    const size = number(style.fontSize, 16) * scale.sy;
    return `${style.fontStyle || "normal"} ${style.fontWeight || "400"} ${size}px ${style.fontFamily || "serif"}`;
  }

  function drawLetterSpacedText(text, centerX, centerY, spacing) {
    const chars = Array.from(text || "");
    const widths = chars.map(char => exportCtx.measureText(char).width);
    const total = widths.reduce((sum, width) => sum + width, 0) +
      Math.max(0, chars.length - 1) * spacing;
    let cursor = centerX - total / 2;
    chars.forEach((char, index) => {
      const width = widths[index];
      exportCtx.fillText(char, cursor + width / 2, centerY);
      cursor += width + spacing;
    });
  }

  function cumulativeOpacity(element) {
    let opacity = 1;
    let node = element;
    const page = document.getElementById("audiovisualSection");
    while (node && node !== page) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return 0;
      opacity *= number(style.opacity, 1);
      node = node.parentElement;
    }
    return Math.max(0, Math.min(1, opacity));
  }

  function drawText(scale) {
    document.querySelectorAll("#text-container .sub-part, #goldenLine .ui-animate-text")
      .forEach(element => {
        const opacity = cumulativeOpacity(element);
        if (opacity <= .001) return;
        const style = getComputedStyle(element);
        const rect = toExportRect(element.getBoundingClientRect(), scale);
        if (rect.width <= 0 || rect.height <= 0) return;
        const mask = element.closest(".ui-line-mask");

        exportCtx.save();
        if (mask) {
          const clip = toExportRect(mask.getBoundingClientRect(), scale);
          const safeX = 36 * scale.sx;
          exportCtx.beginPath();
          exportCtx.rect(clip.x - safeX, clip.y, clip.width + safeX * 2, clip.height);
          exportCtx.clip();
        }
        exportCtx.globalAlpha = opacity;
        exportCtx.fillStyle = style.color;
        exportCtx.font = fontString(style, scale);
        exportCtx.textAlign = "center";
        exportCtx.textBaseline = "middle";
        drawLetterSpacedText(
          element.textContent,
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          number(style.letterSpacing, 0) * scale.sx
        );
        exportCtx.restore();
      });
  }

  function renderFrame() {
    ensureCanvas();
    const scale = getPageScale();
    if (!scale) return;
    exportCtx.globalAlpha = 1;
    exportCtx.filter = "none";
    exportCtx.fillStyle = "#1a1a1a";
    exportCtx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    drawSourceCanvas("CanvasAnime");
    drawText(scale);
    drawSourceCanvas("CanvasDustFront");
  }

  function renderLoop() {
    renderFrame();
    rafId = requestAnimationFrame(renderLoop);
  }

  function recordingFormat() {
    const formats = [
      { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
      { mime: "video/mp4", ext: "mp4" },
      { mime: "video/webm;codecs=vp9", ext: "webm" },
      { mime: "video/webm;codecs=vp8", ext: "webm" },
      { mime: "video/webm", ext: "webm" }
    ];
    return formats.find(item => MediaRecorder.isTypeSupported(item.mime)) ||
      { mime: "", ext: "webm" };
  }

  function download(blob, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${CONFIG.FILE_BASENAME}.${extension}`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function startRecording() {
    if (recording) return true;
    if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) {
      console.error("目前瀏覽器不支援 Canvas MediaRecorder 錄影。");
      return false;
    }
    ensureCanvas();
    renderFrame();
    if (rafId === null) rafId = requestAnimationFrame(renderLoop);
    stream = exportCanvas.captureStream(CONFIG.FPS);
    chunks = [];
    const format = recordingFormat();
    const options = { videoBitsPerSecond: CONFIG.VIDEO_BITS_PER_SECOND };
    if (format.mime) options.mimeType = format.mime;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (error) {
      console.error("MediaRecorder 建立失敗：", error);
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      return false;
    }
    recorder.addEventListener("dataavailable", event => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      recording = false;
      const type = recorder.mimeType || format.mime || "video/webm";
      const extension = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type });
      if (blob.size) download(blob, extension);
      else console.error("錄影資料為空，未建立影片。");
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      recorder = null;
      chunks = [];
      console.log(`沙畫影片錄製完成（${extension.toUpperCase()}）。`);
    });
    recorder.start(1000);
    recording = true;
    console.log(`開始錄製：1920×1080 / 60 FPS / ${format.ext.toUpperCase()}`);
    return true;
  }

  function stopRecording() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  window.addEventListener("sandstory:visual-complete", () => {
    if (!recording || stopTimer) return;
    stopTimer = setTimeout(stopRecording, CONFIG.FINAL_HOLD_MS);
  });

  window.sandStoryExporter = {
    CONFIG,
    get autoRecord() {
      return CONFIG.AUTO_RECORD;
    },
    startRecording,
    stopRecording,
    renderFrame,
    get canvas() {
      ensureCanvas();
      return exportCanvas;
    }
  };
})();
