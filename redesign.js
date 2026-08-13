const body = document.body;
const intro = document.getElementById("site-intro");
const introVideo = document.getElementById("intro-video");
const introName = document.getElementById("intro-name");
const introSkip = document.getElementById("intro-skip");
const progressBar = document.getElementById("intro-progress-bar");
const skipLink = document.querySelector(".skip-link");
const siteHeader = document.getElementById("site-header");
const main = document.getElementById("main");
const landing = document.querySelector(".landing");
const landingMedia = document.getElementById("landing-media");
const landingVideos = [
  document.getElementById("landing-video-a"),
  document.getElementById("landing-video-b"),
].filter(Boolean);
const landingMotionToggle = document.getElementById("landing-motion-toggle");
const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
const saveData = Boolean(window.navigator?.connection?.saveData);
const isDeepLink = Boolean(window.location.hash && window.location.hash !== "#top");
const INTRO_STORAGE_KEY = "zhenhao-intro-seen-v1";
let introFallbackTimeout;
let introStartupTimeout;
let introNameTimeout;
let introPhase = "idle";

function hasSeenIntro() {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in privacy modes; the intro still remains skippable.
  }
}

function finishIntro({ moveFocus = false } = {}) {
  if (!body.classList.contains("intro-active")) return;
  window.clearTimeout(introFallbackTimeout);
  window.clearTimeout(introStartupTimeout);
  window.clearTimeout(introNameTimeout);
  introPhase = "complete";
  intro.classList.add("is-complete");
  intro.setAttribute("aria-hidden", "true");
  intro.setAttribute("inert", "");
  body.classList.remove("intro-active");
  siteHeader.removeAttribute("inert");
  main.removeAttribute("inert");
  introVideo.pause();
  startLandingPlayback();
  window.setTimeout(() => {
    intro.hidden = true;
  }, 1150);
  if (moveFocus) requestAnimationFrame(() => main.focus({ preventScroll: true }));
}

function revealIntroName() {
  if (!body.classList.contains("intro-active") || introPhase === "name") return;
  window.clearTimeout(introFallbackTimeout);
  window.clearTimeout(introStartupTimeout);
  introPhase = "name";
  introVideo.pause();
  intro.classList.add("is-name-reveal");
  injectLandingSources();
  introNameTimeout = window.setTimeout(finishIntro, 3200);
}

function startIntro() {
  const source = introVideo?.querySelector("source[data-src]");
  if (!intro || !introVideo || !introName || !source) return;

  introPhase = "video";
  rememberIntro();
  body.classList.add("intro-active");
  siteHeader.setAttribute("inert", "");
  main.setAttribute("inert", "");
  intro.hidden = false;
  intro.setAttribute("aria-hidden", "false");
  intro.removeAttribute("inert");
  source.src = source.dataset.src;
  introVideo.load();
  introStartupTimeout = window.setTimeout(revealIntroName, 4500);
  introFallbackTimeout = window.setTimeout(revealIntroName, 16000);

  const playAttempt = introVideo.play();
  if (playAttempt) playAttempt.catch(revealIntroName);
}

skipLink.addEventListener("click", () => finishIntro({ moveFocus: true }));
introSkip.addEventListener("click", () => finishIntro({ moveFocus: true }));
introVideo.addEventListener("ended", revealIntroName);
introVideo.addEventListener("playing", () => window.clearTimeout(introStartupTimeout));
["error", "abort"].forEach((eventName) => introVideo.addEventListener(eventName, revealIntroName));
introVideo.addEventListener("timeupdate", () => {
  if (!introVideo.duration) return;
  progressBar.style.width = `${Math.min(100, (introVideo.currentTime / introVideo.duration) * 100)}%`;
});

if (!reducedMotion && !saveData && !isDeepLink && !hasSeenIntro()) startIntro();

const LANDING_LOOP_START = 0;
const LANDING_LOOP_END = 21.9;
const LANDING_PLAYBACK_RATE = 1;
const LANDING_CROSSFADE = 0.55;
const LANDING_CROSSFADE_POINT = LANDING_LOOP_END - LANDING_CROSSFADE * LANDING_PLAYBACK_RATE;
const landingPortraitMedia = window.matchMedia?.("(orientation: portrait) and (max-width: 900px)");
const LANDING_PORTRAIT_FOCUS = [
  [0, 2.4, 58],
  [2.4, 4.8, 42],
  [4.8, 7.2, 50],
  [7.2, 9.6, 35],
  [9.6, 12.1, 72],
  [12.1, 14.4, 50],
  [14.4, 16.7, 50],
  [16.7, 19.3, 72],
  [19.3, 21.9, 45],
];
let landingActiveVideo = landingVideos[0] || null;
let landingStandbyVideo = landingVideos[1] || null;
let landingMotionEnabled = !reducedMotion && !saveData;
let landingInView = true;
let landingInitialized = false;
let landingCrossfading = false;
let landingAnimationFrame = 0;
let landingSwapTimeout = 0;

function updateLandingMotionToggle() {
  if (!landingMotionToggle) return;
  landingMotionToggle.hidden = false;
  landingMotionToggle.setAttribute("aria-pressed", String(!landingMotionEnabled));
  landingMotionToggle.textContent = landingMotionEnabled ? "Pause background video" : "Play background video";
}

function shouldPlayLanding() {
  return landingMotionEnabled && landingInView && !document.hidden && !body.classList.contains("intro-active");
}

function injectLandingSources() {
  if (landingInitialized) return;
  landingVideos.forEach((video) => {
    const source = video.querySelector("source[data-src]");
    if (!source) return;
    source.src = source.dataset.src;
    video.preload = "auto";
    video.defaultPlaybackRate = LANDING_PLAYBACK_RATE;
    video.playbackRate = LANDING_PLAYBACK_RATE;
    video.addEventListener("timeupdate", () => updateLandingVideoFocus(video));
    video.addEventListener("seeked", () => updateLandingVideoFocus(video));
    video.load();
  });
  landingInitialized = true;
}

function updateLandingVideoFocus(video) {
  if (!video) return;
  const portrait = Boolean(landingPortraitMedia?.matches);
  const focus = portrait
    ? LANDING_PORTRAIT_FOCUS.find(([start, end]) => video.currentTime >= start && video.currentTime < end)?.[2] ?? 50
    : 50;
  video.style.setProperty("--landing-focus-x", `${focus}%`);
}

function seekAndPlayLandingVideo(video, time) {
  return new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error("Landing video is unavailable"));
      return;
    }

    const begin = () => {
      try {
        video.currentTime = time;
        video.playbackRate = LANDING_PLAYBACK_RATE;
        updateLandingVideoFocus(video);
        const attempt = video.play();
        if (attempt) attempt.then(resolve).catch(reject);
        else resolve();
      } catch (error) {
        reject(error);
      }
    };

    if (video.readyState >= 1) begin();
    else video.addEventListener("loadedmetadata", begin, { once: true });
  });
}

function stopLandingPlayback() {
  window.cancelAnimationFrame(landingAnimationFrame);
  window.clearTimeout(landingSwapTimeout);
  landingAnimationFrame = 0;
  landingSwapTimeout = 0;
  landingCrossfading = false;
  landingVideos.forEach((video) => video.pause());
  if (landingActiveVideo) landingActiveVideo.classList.add("is-visible");
  if (landingStandbyVideo) landingStandbyVideo.classList.remove("is-visible");
}

function showLandingPoster() {
  stopLandingPlayback();
  landingMotionEnabled = false;
  landing?.classList.add("is-static");
  updateLandingMotionToggle();
}

function beginLandingCrossfade() {
  if (landingCrossfading || !landingActiveVideo || !landingStandbyVideo) return;
  landingCrossfading = true;
  const outgoing = landingActiveVideo;
  const incoming = landingStandbyVideo;

  seekAndPlayLandingVideo(incoming, LANDING_LOOP_START).then(() => {
    if (!shouldPlayLanding()) {
      incoming.pause();
      landingCrossfading = false;
      return;
    }
    incoming.classList.add("is-visible");
    outgoing.classList.remove("is-visible");
    landingSwapTimeout = window.setTimeout(() => {
      outgoing.pause();
      landingActiveVideo = incoming;
      landingStandbyVideo = outgoing;
      landingCrossfading = false;
    }, LANDING_CROSSFADE * 1000);
  }).catch(() => {
    landingCrossfading = false;
    try {
      outgoing.currentTime = LANDING_LOOP_START;
      outgoing.play().catch(showLandingPoster);
    } catch {
      showLandingPoster();
    }
  });
}

function monitorLandingLoop() {
  window.cancelAnimationFrame(landingAnimationFrame);
  const monitor = () => {
    if (!shouldPlayLanding() || !landingActiveVideo) return;
    landingVideos.forEach(updateLandingVideoFocus);
    if (!landingCrossfading && landingActiveVideo.currentTime >= LANDING_CROSSFADE_POINT) {
      beginLandingCrossfade();
    }
    if (!landingCrossfading && landingActiveVideo.currentTime >= LANDING_LOOP_END) {
      landingActiveVideo.currentTime = LANDING_LOOP_START;
    }
    landingAnimationFrame = window.requestAnimationFrame(monitor);
  };
  landingAnimationFrame = window.requestAnimationFrame(monitor);
}

function startLandingPlayback() {
  if (!landing || !landingActiveVideo || !shouldPlayLanding()) return;
  injectLandingSources();
  landing.classList.remove("is-static");
  const currentTime = landingActiveVideo.currentTime;
  const needsReset = !Number.isFinite(currentTime) || currentTime < LANDING_LOOP_START || currentTime >= LANDING_CROSSFADE_POINT;
  const playAttempt = needsReset
    ? seekAndPlayLandingVideo(landingActiveVideo, LANDING_LOOP_START)
    : landingActiveVideo.play();

  Promise.resolve(playAttempt).then(() => {
    if (!shouldPlayLanding()) {
      stopLandingPlayback();
      return;
    }
    monitorLandingLoop();
  }).catch(showLandingPoster);
}

function setLandingMotion(enabled) {
  landingMotionEnabled = enabled;
  updateLandingMotionToggle();
  if (enabled) startLandingPlayback();
  else stopLandingPlayback();
}

if (landing && landingMotionToggle && landingVideos.length === 2) {
  updateLandingMotionToggle();
  if (landingMotionEnabled) startLandingPlayback();
  else landing.classList.add("is-static");

  landingMotionToggle.addEventListener("click", () => setLandingMotion(!landingMotionEnabled));

  if ("IntersectionObserver" in window) {
    const landingObserver = new IntersectionObserver(([entry]) => {
      landingInView = Boolean(entry?.isIntersecting);
      if (landingInView) startLandingPlayback();
      else stopLandingPlayback();
    }, { rootMargin: "12% 0px" });
    landingObserver.observe(landing);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLandingPlayback();
    else startLandingPlayback();
  });
}

let landingScrollFrame = 0;
function updateLandingTransition() {
  landingScrollFrame = 0;
  if (!landing) return;
  const rect = landing.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * .78)));
  landingMedia?.style.setProperty("--landing-media-opacity", String(1 - progress * .84));
  landing.style.setProperty("--landing-copy-opacity", String(1 - progress));
  landing.style.setProperty("--landing-copy-shift", `${progress * 18}px`);
  landing.classList.toggle("is-leaving", progress > .72);
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 24);
}

function queueLandingTransition() {
  if (landingScrollFrame) return;
  landingVideos.forEach(updateLandingVideoFocus);
  landingScrollFrame = window.requestAnimationFrame(updateLandingTransition);
}

updateLandingTransition();
window.addEventListener("scroll", queueLandingTransition, { passive: true });
window.addEventListener("resize", queueLandingTransition);

if ("IntersectionObserver" in window && !reducedMotion) {
  document.documentElement.classList.add("reveal-ready");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

  document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
}

const menuToggle = document.getElementById("menu-toggle");
const siteNav = document.getElementById("site-nav");

function closeMenu() {
  siteNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
  const open = siteNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("click", (event) => {
  if (siteNav.classList.contains("is-open") && !siteHeader.contains(event.target)) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
    closeMenu();
    menuToggle.focus();
  }
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 1080) closeMenu();
});

const videoDialog = document.getElementById("video-dialog");
const videoFrame = document.getElementById("video-frame");
const videoTitle = document.getElementById("video-dialog-title");
const videoExternal = document.getElementById("video-external");
const dialogClose = document.getElementById("dialog-close");
let activeVideoTrigger = null;

document.querySelectorAll("[data-video-id]").forEach((button) => {
  button.addEventListener("click", () => {
    const title = button.dataset.videoTitle || "Film";
    activeVideoTrigger = button;
    videoTitle.textContent = title;
    videoFrame.title = title;
    videoFrame.src = `https://www.youtube.com/embed/${button.dataset.videoId}?autoplay=1&rel=0`;
    videoExternal.href = `https://www.youtube.com/watch?v=${button.dataset.videoId}`;
    videoDialog.showModal();
  });
});

function closeVideo() {
  videoFrame.src = "";
  videoExternal.href = "https://www.youtube.com/";
  if (videoDialog.open) videoDialog.close();
}

dialogClose.addEventListener("click", closeVideo);
videoDialog.addEventListener("click", (event) => {
  if (event.target === videoDialog) closeVideo();
});
videoDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeVideo();
});
videoDialog.addEventListener("close", () => {
  activeVideoTrigger?.focus();
  activeVideoTrigger = null;
});

const galleryDialog = document.getElementById("gallery-dialog");
const galleryTitle = document.getElementById("gallery-title");
const galleryDescription = document.getElementById("gallery-description");
const galleryCount = document.getElementById("gallery-count");
const galleryGrid = document.getElementById("gallery-grid");
const galleryClose = document.getElementById("gallery-close");
const galleryViewer = document.getElementById("gallery-viewer");
const viewerBack = document.getElementById("viewer-back");
const viewerCloseGallery = document.getElementById("viewer-close-gallery");
const viewerImage = document.getElementById("viewer-image");
const viewerCaption = document.getElementById("viewer-caption");
const viewerPosition = document.getElementById("viewer-position");
const viewerPrevious = document.getElementById("viewer-previous");
const viewerNext = document.getElementById("viewer-next");
const galleries = window.PORTFOLIO_GALLERIES || {};
let activeGalleryTrigger = null;
let activeGallery = null;
let activeImageIndex = 0;
let activeThumbnail = null;

function applyNativeResolutionLimit(image) {
  const setLimit = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    image.style.setProperty("--native-width", `${image.naturalWidth}px`);
    image.style.setProperty("--native-height", `${image.naturalHeight}px`);
  };

  if (image.complete) setLimit();
  else image.addEventListener("load", setLimit, { once: true });
}

function renderViewer(index) {
  if (!activeGallery?.items.length) return;
  activeImageIndex = (index + activeGallery.items.length) % activeGallery.items.length;
  const item = activeGallery.items[activeImageIndex];
  viewerImage.style.removeProperty("--native-width");
  viewerImage.style.removeProperty("--native-height");
  viewerImage.width = item.width;
  viewerImage.height = item.height;
  viewerImage.src = item.src;
  viewerImage.alt = item.alt;
  applyNativeResolutionLimit(viewerImage);
  viewerCaption.textContent = item.alt;
  viewerPosition.textContent = `${activeImageIndex + 1} of ${activeGallery.items.length}`;
}

function openViewer(index, thumbnail) {
  activeThumbnail = thumbnail;
  renderViewer(index);
  galleryViewer.hidden = false;
  galleryViewer.setAttribute("aria-hidden", "false");
  galleryGrid.setAttribute("inert", "");
  viewerBack.focus();
}

function closeViewer({ restoreFocus = true } = {}) {
  if (galleryViewer.hidden) return;
  galleryViewer.hidden = true;
  galleryViewer.setAttribute("aria-hidden", "true");
  galleryGrid.removeAttribute("inert");
  viewerImage.removeAttribute("src");
  if (restoreFocus) activeThumbnail?.focus();
}

function openGallery(trigger, key) {
  const gallery = galleries[key];
  if (!gallery) return;
  activeGalleryTrigger = trigger;
  activeGallery = gallery;
  galleryTitle.textContent = gallery.title;
  galleryDescription.textContent = gallery.description;
  galleryCount.textContent = `${gallery.items.length} photographs`;
  galleryGrid.replaceChildren();

  const fragment = document.createDocumentFragment();
  gallery.items.forEach((item, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    button.type = "button";
    button.className = "gallery-thumb";
    button.setAttribute("aria-label", `View ${item.alt}`);
    image.src = item.thumb || item.src;
    image.alt = item.alt;
    image.width = item.width;
    image.height = item.height;
    image.loading = index < 8 ? "eager" : "lazy";
    image.decoding = "async";
    button.append(image);
    button.addEventListener("click", () => openViewer(index, button));
    fragment.append(button);
  });

  galleryGrid.append(fragment);
  galleryDialog.showModal();
}

document.querySelectorAll("[data-gallery]").forEach((button) => {
  button.addEventListener("click", () => openGallery(button, button.dataset.gallery));
});

galleryClose.addEventListener("click", () => galleryDialog.close());
viewerCloseGallery.addEventListener("click", () => {
  closeViewer({ restoreFocus: false });
  galleryDialog.close();
});
viewerBack.addEventListener("click", closeViewer);
viewerPrevious.addEventListener("click", () => renderViewer(activeImageIndex - 1));
viewerNext.addEventListener("click", () => renderViewer(activeImageIndex + 1));

galleryDialog.addEventListener("cancel", (event) => {
  if (!galleryViewer.hidden) {
    event.preventDefault();
    closeViewer();
  }
});
galleryDialog.addEventListener("close", () => {
  closeViewer({ restoreFocus: false });
  galleryGrid.replaceChildren();
  activeGallery = null;
  activeGalleryTrigger?.focus();
  activeGalleryTrigger = null;
});
document.addEventListener("keydown", (event) => {
  if (!galleryDialog.open || galleryViewer.hidden) return;
  if (event.key === "ArrowLeft") renderViewer(activeImageIndex - 1);
  if (event.key === "ArrowRight") renderViewer(activeImageIndex + 1);
});
