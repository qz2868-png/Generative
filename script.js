// Elements
const form = document.getElementById("generator-form");
const promptInput = document.getElementById("prompt-input");
const submitBtn = document.getElementById("submit-btn");
const proxyUrlInput = document.getElementById("proxy-url");
const modelSelect = document.getElementById("model-select");
const modelNameInput = document.getElementById("model-name");
const aspectRatioSelect = document.getElementById("aspect-ratio");

const statusBar = document.getElementById("status-bar");
const statusText = document.getElementById("status-text");
const timerEl = document.getElementById("timer");

const imageContainer = document.getElementById("image-container");
const resultImage = document.getElementById("result-image");
const imageActions = document.getElementById("image-actions");
const downloadBtn = document.getElementById("download-btn");
const copyUrlBtn = document.getElementById("copy-url-btn");
const viewFullBtn = document.getElementById("view-full-btn");
const errorBox = document.getElementById("error-message");

// Lightbox Elements
const lightboxModal = document.getElementById("lightbox-modal");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxBackdrop = document.querySelector(".lightbox-backdrop");

// History Elements
const historySection = document.getElementById("history-section");
const historyGallery = document.getElementById("history-gallery");
const clearHistoryBtn = document.getElementById("clear-history-btn");

let timerInterval = null;
let currentImageUrl = null;
let currentPrompt = "";
let historyItems = [];

// Initialize history from localStorage
try {
  const saved = localStorage.getItem("replicate_image_history");
  if (saved) {
    historyItems = JSON.parse(saved);
    renderHistory();
  }
} catch (e) {
  console.warn("Could not load history from localStorage:", e);
}

// Preset pills handler
document.querySelectorAll(".preset-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    promptInput.value = pill.dataset.prompt;
    promptInput.focus();
  });
});

// Model select handler
modelSelect.addEventListener("change", () => {
  if (modelSelect.value === "custom") {
    modelNameInput.classList.remove("hidden");
    modelNameInput.focus();
  } else {
    modelNameInput.classList.add("hidden");
    modelNameInput.value = modelSelect.value;
  }
});

// Aspect Ratio change updates image container aspect ratio for smooth preview
aspectRatioSelect.addEventListener("change", () => {
  const ratio = aspectRatioSelect.value.replace(":", " / ");
  imageContainer.style.aspectRatio = ratio;
});

// Form Submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (prompt) {
    askForPicture(prompt);
  }
});

// Real blob download (bypasses cross-origin download restrictions)
downloadBtn.addEventListener("click", async () => {
  if (!currentImageUrl) return;
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const response = await fetch(currentImageUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    const sanitizedPrompt = currentPrompt
      .slice(0, 30)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    a.download = `replicate_${sanitizedPrompt || "image"}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    downloadBtn.textContent = "Saved!";
    setTimeout(() => {
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
    }, 1500);
  } catch (err) {
    console.error("Direct blob download failed, opening in new tab:", err);
    window.open(currentImageUrl, "_blank");
    downloadBtn.textContent = originalText;
    downloadBtn.disabled = false;
  }
});

// Copy image link button
copyUrlBtn.addEventListener("click", async () => {
  if (!currentImageUrl) return;
  try {
    await navigator.clipboard.writeText(currentImageUrl);
    const originalText = copyUrlBtn.textContent;
    copyUrlBtn.textContent = "Copied!";
    setTimeout(() => {
      copyUrlBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy URL:", err);
  }
});

// Lightbox full-size view handlers
function openLightbox(imageUrl, caption) {
  lightboxImage.src = imageUrl;
  lightboxCaption.textContent = caption || "";
  lightboxModal.classList.remove("hidden");
}

function closeLightbox() {
  lightboxModal.classList.add("hidden");
  lightboxImage.src = "";
}

resultImage.addEventListener("click", () => {
  if (currentImageUrl) openLightbox(currentImageUrl, currentPrompt);
});

viewFullBtn.addEventListener("click", () => {
  if (currentImageUrl) openLightbox(currentImageUrl, currentPrompt);
});

lightboxClose.addEventListener("click", closeLightbox);
lightboxBackdrop.addEventListener("click", closeLightbox);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightboxModal.classList.contains("hidden")) {
    closeLightbox();
  }
});

// Clear history
clearHistoryBtn.addEventListener("click", () => {
  historyItems = [];
  try {
    localStorage.removeItem("replicate_image_history");
  } catch (e) {}
  renderHistory();
});

function addHistoryItem(url, prompt) {
  // Prevent duplicate consecutive entries
  historyItems = historyItems.filter((item) => item.url !== url);
  historyItems.unshift({ url, prompt, timestamp: Date.now() });

  // Limit to 12 items
  if (historyItems.length > 12) {
    historyItems.pop();
  }

  try {
    localStorage.setItem("replicate_image_history", JSON.stringify(historyItems));
  } catch (e) {}

  renderHistory();
}

function renderHistory() {
  if (historyItems.length === 0) {
    historySection.classList.add("hidden");
    historyGallery.innerHTML = "";
    return;
  }

  historySection.classList.remove("hidden");
  historyGallery.innerHTML = "";

  historyItems.forEach((item) => {
    const thumb = document.createElement("div");
    thumb.className = "history-item";
    if (item.url === currentImageUrl) {
      thumb.classList.add("active");
    }
    thumb.title = item.prompt;

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.prompt;
    img.loading = "lazy";

    thumb.appendChild(img);
    thumb.addEventListener("click", () => {
      promptInput.value = item.prompt;
      displayImage(item.url, item.prompt);
    });

    historyGallery.appendChild(thumb);
  });
}

function displayImage(imageUrl, prompt) {
  currentImageUrl = imageUrl;
  currentPrompt = prompt;
  resultImage.src = imageUrl;
  imageContainer.classList.remove("empty");
  imageContainer.classList.add("has-image");
  imageActions.classList.remove("hidden");
  renderHistory();
}

/**
 * Request image generation from Replicate through the proxy endpoint.
 * Corresponds to askForPicture in the original p5 sketch.
 */
async function askForPicture(prompt) {
  const proxyUrl = proxyUrlInput.value.trim();
  const selectedModel = modelSelect.value === "custom" 
    ? modelNameInput.value.trim() 
    : modelSelect.value;
  const aspectRatio = aspectRatioSelect.value;

  setLoading(true);
  hideError();
  statusText.textContent = "Sending request to Replicate...";
  statusBar.className = "status-bar running";

  const startTime = Date.now();
  startTimer(startTime);

  const payload = {
    model: selectedModel || "google/nano-banana-2",
    input: {
      prompt: prompt,
      aspect_ratio: aspectRatio,
    },
  };

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  console.log("Sending payload:", payload, "to:", proxyUrl);

  try {
    const response = await fetch(proxyUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const prediction = await response.json();
    console.log("Prediction response:", prediction);

    if (prediction.error) {
      throw new Error(prediction.error);
    }

    let imageUrl = "";
    if (Array.isArray(prediction.output) && prediction.output.length > 0) {
      imageUrl = prediction.output[0];
    } else if (typeof prediction.output === "string") {
      imageUrl = prediction.output;
    }

    if (!imageUrl) {
      throw new Error("No image URL was returned in prediction output.");
    }

    statusText.textContent = "Loading generated image...";
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      displayImage(imageUrl, prompt);
      addHistoryItem(imageUrl, prompt);

      stopTimer();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      statusText.textContent = `Completed in ${elapsed}s`;
      statusBar.className = "status-bar success";
      setLoading(false);
    };

    img.onerror = () => {
      throw new Error("Failed to load image from URL: " + imageUrl);
    };
  } catch (error) {
    console.error("Error generating image:", error);
    showError(error.message || "An unknown error occurred while calling the API.");
    statusText.textContent = "Failed to generate";
    statusBar.className = "status-bar error";
    stopTimer();
    setLoading(false);
  }
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
  promptInput.disabled = isLoading;
}

function startTimer(startTime) {
  clearInterval(timerInterval);
  timerEl.textContent = "0.0s";
  timerInterval = setInterval(() => {
    const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
    timerEl.textContent = `${seconds}s`;
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function showError(msg) {
  errorBox.textContent = `Error: ${msg}`;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}
