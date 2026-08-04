const layouts = [
  { id: "2v", label: "2 ảnh dọc", count: 2, orientation: "vertical" },
  { id: "2h", label: "2 ảnh ngang", count: 2, orientation: "horizontal" },
  { id: "3v", label: "3 ảnh dọc", count: 3, orientation: "vertical" },
  { id: "4v", label: "4 ảnh dọc", count: 4, orientation: "vertical" },
  { id: "4h", label: "4 ảnh ngang", count: 4, orientation: "horizontal" },
];

const frames = [
  { id: "vintage", label: "Cổ điển (Vintage)", swatch: "#f5ead3" },
  { id: "polaroid", label: "Polaroid", swatch: "#fbfbf7" },
  { id: "neon", label: "Neon", swatch: "#111827" },
  { id: "clean", label: "Tối giản (Clean)", swatch: "#ffffff" },
  { id: "film", label: "Dải phim (Film)", swatch: "#151515" },
];

const stickers = [
  "✨",
  "🩷",
  "🌷",
  "🌟",
  "🎀",
  "🔥",
  "🪩",
  "🍒",
  "🕊️"
];
const state = {
  layout: layouts[3],
  frame: frames[0],
  applyStickerAll: true,
  placedStickers: [{ icon: stickers[0], x: 86, y: 14 }],
  caption: "",
  font: "Inter",
  textColor: "#111827",
  textPosition: "bottom",
  textPoint: { x: 50, y: 88 },
  countdown: 3,
  photos: [],
  photoDownloads: [],
  activeSlot: 0,
  facingMode: "user",
  stream: null,
  isCounting: false,
};

const $ = (selector) => document.querySelector(selector);
const setupPreview = $("#setupPreview");
const captureStrip = $("#captureStrip");
const reviewStrip = $("#reviewStrip");
const exportCanvas = $("#exportCanvas");
const captureCanvas = $("#captureCanvas");

function init() {
  renderLayoutOptions();
  renderFrameOptions();
  renderStickerOptions();
  bindControls();
  resetPhotos();
  renderAllStrips();
}

function renderLayoutOptions() {
  $("#layoutOptions").innerHTML = layouts.map((layout) => (
    `<button type="button" class="option-card ${layout.id === state.layout.id ? "active" : ""}" data-layout="${layout.id}">${layout.label}</button>`
  )).join("");
}

function renderFrameOptions() {
  $("#frameOptions").innerHTML = frames.map((frame) => (
    `<button type="button" class="style-card ${frame.id === state.frame.id ? "active" : ""}" data-frame="${frame.id}">
      <span class="style-swatch" style="background:${frame.swatch}"></span>
      <span>${frame.label}</span>
    </button>`
  )).join("");
}

function renderStickerOptions() {
  $("#stickerOptions").innerHTML = stickers.map((sticker) => (
    `<button type="button" class="sticker-card" data-sticker="${sticker}" title="Add sticker">${sticker}</button>`
  )).join("");
}

function bindControls() {
  $("#layoutOptions").addEventListener("click", (event) => {
    const id = event.target.closest("button")?.dataset.layout;
    if (!id) return;
    state.layout = layouts.find((layout) => layout.id === id);
    resetPhotos();
    renderLayoutOptions();
    renderAllStrips();
  });

  $("#frameOptions").addEventListener("click", (event) => {
    const id = event.target.closest("button")?.dataset.frame;
    if (!id) return;
    state.frame = frames.find((frame) => frame.id === id);
    renderFrameOptions();
    renderAllStrips();
  });

  $("#stickerOptions").addEventListener("click", (event) => {
    const sticker = event.target.closest("button")?.dataset.sticker;
    if (!sticker) return;
    const offset = state.placedStickers.length * 7;
    state.placedStickers.push({
      icon: sticker,
      x: Math.min(92, 22 + offset),
      y: Math.min(90, 20 + offset),
    });
    renderStickerOptions();
    renderAllStrips();
  });

  $("#applyStickerAll").addEventListener("change", (event) => {
    state.applyStickerAll = event.target.checked;
    renderAllStrips();
  });

  $("#captionInput").addEventListener("input", (event) => {
    state.caption = event.target.value;
    renderAllStrips();
  });

  $("#fontSelect").addEventListener("change", (event) => {
    state.font = event.target.value;
    renderAllStrips();
  });

  $("#textColor").addEventListener("input", (event) => {
    state.textColor = event.target.value;
    renderAllStrips();
  });

  $("#textPosition").addEventListener("change", (event) => {
    state.textPosition = event.target.value;
    const presets = {
      top: { x: 50, y: 8 },
      center: { x: 50, y: 50 },
      bottom: { x: 50, y: 88 },
    };
    if (presets[state.textPosition]) {
      state.textPoint = presets[state.textPosition];
    }
    renderAllStrips();
  });

  $("#countdownOptions").addEventListener("click", (event) => {
    const value = event.target.closest("button")?.dataset.countdown;
    if (!value) return;
    state.countdown = Number(value);
    $("#captureCountdown").value = value;
    document.querySelectorAll("#countdownOptions button").forEach((button) => {
      button.classList.toggle("active", button.dataset.countdown === value);
    });
  });

  $("#captureCountdown").addEventListener("change", (event) => {
    state.countdown = Number(event.target.value);
  });

  $("#cameraFacing").addEventListener("change", async (event) => {
    state.facingMode = event.target.value;
    await switchCamera();
  });

  $("#startButton").addEventListener("click", startCapture);
  $("#backSetupButton").addEventListener("click", () => showScreen("setup"));
  $("#captureButton").addEventListener("click", captureCurrentSlot);
  $("#uploadPhotoButton").addEventListener("click", () => $("#photoUploadInput").click());
  $("#photoUploadInput").addEventListener("change", uploadPhotoToSlot);
  $("#nextExportButton").addEventListener("click", showExport);
  $("#downloadStripButton").addEventListener("click", downloadStrip);
  $("#downloadPhotosButton").addEventListener("click", downloadPhotos);
  $("#selectAllPhotosButton").addEventListener("click", selectAllPhotosForDownload);
  $("#shareButton").addEventListener("click", shareStrip);
  $("#newSessionButton").addEventListener("click", newSession);
}

function resetPhotos() {
  state.photos = Array.from({ length: state.layout.count }, () => null);
  state.photoDownloads = [];
  state.activeSlot = 0;
}

function renderAllStrips() {
  renderStrip(setupPreview, { mode: "setup" });
  renderStrip(captureStrip, { mode: "capture" });
  renderStrip(reviewStrip, { mode: "review" });
  updateStatus();
}

function renderStrip(container, { mode }) {
  container.className = `photo-strip ${state.layout.orientation} ${state.frame.id}`;
  container.innerHTML = "";

  for (let index = 0; index < state.layout.count; index += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";

    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = `${index + 1}/${state.layout.count}`;
    slot.append(label);

    if (state.photos[index]) {
      const img = document.createElement("img");
      img.src = state.photos[index];
      img.alt = `Photo ${index + 1}`;
      slot.append(img);
    } else if (mode === "capture" && index === state.activeSlot && state.stream) {
      const video = $("#cameraVideo").cloneNode();
      video.srcObject = state.stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.className = state.facingMode === "user" ? "mirrored" : "rear-facing";
      slot.append(video);
    }

    if (mode === "review" && state.photos[index]) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slot-delete";
      remove.textContent = "Xóa";
      remove.addEventListener("click", () => deleteSlot(index));
      slot.append(remove);
    }

    container.append(slot);
  }

  addDecorations(container);
}

function addDecorations(container) {
  if (state.caption.trim()) {
    const caption = document.createElement("div");
    caption.className = `strip-caption ${state.textPosition}`;
    caption.style.fontFamily = `"${state.font}", sans-serif`;
    caption.style.color = state.textColor;
    caption.style.setProperty("--text-x", `${state.textPoint.x}%`);
    caption.style.setProperty("--text-y", `${state.textPoint.y}%`);
    caption.textContent = state.caption;
    caption.addEventListener("pointerdown", beginDragText);
    container.append(caption);
  }

  const layer = document.createElement("div");
  layer.className = "sticker-layer";
  const placed = state.applyStickerAll ? state.placedStickers : state.placedStickers.slice(0, state.layout.count);

  placed.forEach((item, index) => {
    const sticker = document.createElement("div");
    sticker.className = "sticker";
    sticker.style.left = `${item.x}%`;
    sticker.style.top = `${item.y}%`;
    sticker.dataset.index = index;

    const icon = document.createElement("span");
    icon.className = "sticker-icon";
    icon.textContent = item.icon;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "sticker-remove";
    remove.textContent = "x";
    remove.title = "Delete sticker";
    remove.addEventListener("pointerdown", (event) => event.stopPropagation());
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSticker(index);
    });

    sticker.append(icon, remove);
    sticker.addEventListener("pointerdown", beginDragSticker);
    layer.append(sticker);
  });

  container.append(layer);
}

function deleteSticker(index) {
  state.placedStickers.splice(index, 1);
  renderAllStrips();
  if (document.querySelector("#exportScreen.active")) {
    drawExportCanvas();
  }
}

function beginDragText(event) {
  const caption = event.currentTarget;
  const strip = caption.closest(".photo-strip");
  caption.setPointerCapture(event.pointerId);
  state.textPosition = "custom";
  $("#textPosition").value = "custom";

  const move = (moveEvent) => {
    const rect = strip.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
    state.textPoint = { x, y };
    caption.style.setProperty("--text-x", `${x}%`);
    caption.style.setProperty("--text-y", `${y}%`);
    caption.className = "strip-caption custom";
  };

  const stop = () => {
    caption.removeEventListener("pointermove", move);
    caption.removeEventListener("pointerup", stop);
    renderAllStrips();
  };

  caption.addEventListener("pointermove", move);
  caption.addEventListener("pointerup", stop);
}

function beginDragSticker(event) {
  const sticker = event.currentTarget;
  const strip = sticker.closest(".photo-strip");
  sticker.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const rect = strip.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
    const item = state.placedStickers[Number(sticker.dataset.index)];
    state.placedStickers[Number(sticker.dataset.index)] = { ...item, x, y };
    sticker.style.left = `${x}%`;
    sticker.style.top = `${y}%`;
  };

  const stop = () => {
    sticker.removeEventListener("pointermove", move);
    sticker.removeEventListener("pointerup", stop);
    renderAllStrips();
  };

  sticker.addEventListener("pointermove", move);
  sticker.addEventListener("pointerup", stop);
}

async function startCapture() {
  showScreen("capture");
  await ensureCamera();
  state.activeSlot = findNextEmptySlot();
  renderAllStrips();
}

async function ensureCamera() {
  if (state.stream) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: state.facingMode } },
      audio: false,
    });
    $("#cameraVideo").srcObject = state.stream;
    updateCameraMirror();
    $("#cameraPlaceholder").classList.add("hidden");
  } catch (error) {
    $("#cameraPlaceholder").textContent = "Không thể mở camera. Vui lòng cho phép quyền truy cập camera trên trình duyệt của bạn.";
  }
}

async function switchCamera() {
  stopCamera();
  $("#cameraPlaceholder").classList.remove("hidden");
  $("#cameraPlaceholder").textContent = "Đang mở camera...";
  await ensureCamera();
  renderAllStrips();
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  $("#cameraVideo").srcObject = null;
}

function updateCameraMirror() {
  const mirrored = state.facingMode === "user";
  $("#cameraVideo").classList.toggle("mirrored", mirrored);
  $("#cameraVideo").classList.toggle("rear-facing", !mirrored);
}

async function captureCurrentSlot() {
  if (state.isCounting || !state.stream) return;
  const slot = state.activeSlot;
  if (slot < 0 || state.photos[slot]) return;

  state.isCounting = true;
  await runCountdown();
  fireFlash();
  playShutterSound();
  state.photos[slot] = grabFrame();
  state.activeSlot = findNextEmptySlot();
  state.isCounting = false;
  renderAllStrips();

  if (state.activeSlot === -1) showScreen("review");
}

function uploadPhotoToSlot(event) {
  const file = event.target.files?.[0];
  const slot = state.activeSlot;
  event.target.value = "";
  if (!file || slot < 0 || state.photos[slot]) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.photos[slot] = reader.result;
    state.activeSlot = findNextEmptySlot();
    renderAllStrips();
    if (state.activeSlot === -1) showScreen("review");
  };
  reader.readAsDataURL(file);
}

function runCountdown() {
  return new Promise((resolve) => {
    let left = state.countdown;
    const badge = $("#countdownBadge");
    badge.classList.add("show");
    badge.textContent = left;

    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        badge.classList.remove("show");
        badge.textContent = "";
        resolve();
      } else {
        badge.textContent = left;
      }
    }, 1000);
  });
}

function fireFlash() {
  const flash = $("#flash");
  flash.classList.remove("fire");
  void flash.offsetWidth;
  flash.classList.add("fire");
}

function playShutterSound() {
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 720;
  gain.gain.setValueAtTime(0.12, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.13);
}

function grabFrame() {
  const video = $("#cameraVideo");
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 960;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext("2d");
  if (state.facingMode === "user") {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  return captureCanvas.toDataURL("image/jpeg", 0.95);
}

function deleteSlot(index) {
  state.photos[index] = null;
  state.activeSlot = index;
  renderAllStrips();
}

function findNextEmptySlot() {
  return state.photos.findIndex((photo) => !photo);
}

function updateStatus() {
  $("#layoutLabel").textContent = state.layout.label;
  $("#captureTitle").textContent = state.activeSlot >= 0 ? `Khung ${state.activeSlot + 1}` : "Đã chụp xong tất cả";
  $("#slotCounter").textContent = `${state.photos.filter(Boolean).length}/${state.layout.count} ảnh`;
  $("#captureButton").disabled = state.activeSlot === -1 || state.isCounting;
  $("#uploadPhotoButton").disabled = state.activeSlot === -1 || state.isCounting;
  $("#nextExportButton").disabled = state.photos.some((photo) => !photo);
  $("#reviewActions").innerHTML = state.photos.map((photo, index) => (
    `<button type="button" class="secondary-action" data-retake="${index}" ${photo ? "disabled" : ""}>Chụp lại khung ${index + 1}</button>`
  )).join("");

  $("#reviewActions").querySelectorAll("[data-retake]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSlot = Number(button.dataset.retake);
      showScreen("capture");
      renderAllStrips();
    });
  });
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  $(`#${name}Screen`).classList.add("active");
  document.querySelectorAll(".progress-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.stepDot === name);
  });
}

function showExport() {
  showScreen("export");
  preparePhotoDownloadList();
  drawExportCanvas();
}

function preparePhotoDownloadList() {
  state.photoDownloads = state.photos.map((photo, index) => ({
    photo,
    selected: true,
    name: state.photoDownloads[index]?.name || `anh-photobooth-${index + 1}`,
  }));
  renderPhotoDownloadList();
}

function renderPhotoDownloadList() {
  const list = $("#photoDownloadList");
  list.innerHTML = state.photoDownloads.map((item, index) => `
    <label class="photo-download-row">
      <input type="checkbox" data-photo-selected="${index}" ${item.selected ? "checked" : ""}>
      <img src="${item.photo}" alt="Ảnh ${index + 1}">
      <span>
        <span>Khung ${index + 1}</span>
        <input type="text" data-photo-name="${index}" value="${escapeHtml(item.name)}" placeholder="Tên file ảnh ${index + 1}">
      </span>
    </label>
  `).join("");

  list.querySelectorAll("[data-photo-selected]").forEach((input) => {
    input.addEventListener("change", () => {
      state.photoDownloads[Number(input.dataset.photoSelected)].selected = input.checked;
    });
  });

  list.querySelectorAll("[data-photo-name]").forEach((input) => {
    input.addEventListener("input", () => {
      state.photoDownloads[Number(input.dataset.photoName)].name = input.value;
    });
  });
}

function selectAllPhotosForDownload() {
  state.photoDownloads.forEach((item) => {
    item.selected = true;
  });
  renderPhotoDownloadList();
}

function drawExportCanvas() {
  const ctx = exportCanvas.getContext("2d");
  const horizontal = state.layout.orientation === "horizontal";
  const slotW = horizontal ? 320 : 760;
  const slotH = horizontal ? 430 : 520;
  const pad = 70;
  const gap = 28;
  exportCanvas.width = horizontal ? pad * 2 + state.layout.count * slotW + (state.layout.count - 1) * gap : pad * 2 + slotW;
  exportCanvas.height = horizontal ? pad * 2 + slotH + 130 : pad * 2 + state.layout.count * slotH + (state.layout.count - 1) * gap + 130;
  paintFrameBackground(ctx, exportCanvas.width, exportCanvas.height);

  Promise.all(state.photos.map(loadImage)).then((images) => {
    images.forEach((img, index) => {
      const x = horizontal ? pad + index * (slotW + gap) : pad;
      const y = horizontal ? pad : pad + index * (slotH + gap);
      ctx.save();
      roundedRect(ctx, x, y, slotW, slotH, 18);
      ctx.clip();
      drawCover(ctx, img, x, y, slotW, slotH);
      ctx.restore();
    });
    drawOverlayText(ctx);
    drawExportStickers(ctx);
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function paintFrameBackground(ctx, width, height) {
  const colors = { vintage: "#f5ead3", polaroid: "#fbfbf7", neon: "#111827", clean: "#ffffff", film: "#151515" };
  ctx.fillStyle = colors[state.frame.id] || "#fff";
  ctx.fillRect(0, 0, width, height);
  if (state.frame.id === "film") {
    ctx.fillStyle = "#f8fafc";
    for (let y = 24; y < height; y += 58) {
      ctx.fillRect(16, y, 28, 30);
      ctx.fillRect(width - 44, y, 28, 30);
    }
  }
}

function drawCover(ctx, img, x, y, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const sw = width / scale;
  const sh = height / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, width, height);
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawOverlayText(ctx) {
  if (!state.caption.trim()) return;
  ctx.save();
  ctx.fillStyle = state.textColor;
  ctx.font = `700 48px "${state.font}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const x = exportCanvas.width * state.textPoint.x / 100;
  const y = exportCanvas.height * state.textPoint.y / 100;
  state.caption.split("\n").forEach((line, index) => {
    ctx.fillText(line, x, y + index * 52);
  });
  ctx.restore();
}

function drawExportStickers(ctx) {
  ctx.save();
  ctx.font = "72px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  state.placedStickers.forEach((item) => {
    ctx.fillText(item.icon, exportCanvas.width * item.x / 100, exportCanvas.height * item.y / 100);
  });
  ctx.restore();
}

function downloadStrip() {
  const link = document.createElement("a");
  link.download = `${safeFileName($("#stripFileName").value || "photobooth-strip")}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function downloadPhotos() {
  state.photoDownloads.forEach((item, index) => {
    if (!item.selected) return;
    const link = document.createElement("a");
    link.download = `${safeFileName(item.name || `photobooth-photo-${index + 1}`)}.jpg`;
    link.href = item.photo;
    link.click();
  });
}

function safeFileName(value) {
  const clean = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return clean || "photobooth";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

async function shareStrip() {
  exportCanvas.toBlob(async (blob) => {
    const file = new File([blob], "photobooth-strip.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "PhotoBooth Strip" });
    } else {
      downloadStrip();
    }
  });
}

function newSession() {
  resetPhotos();
  showScreen("setup");
  renderAllStrips();
}

init();
