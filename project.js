const projectNav = document.querySelector(".project-nav");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

function closeProjectMenu() {
  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeProjectMenu));
document.addEventListener("click", (event) => {
  if (navLinks.classList.contains("is-open") && !projectNav.contains(event.target)) closeProjectMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navLinks.classList.contains("is-open")) {
    closeProjectMenu();
    navToggle.focus();
  }
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 1080) closeProjectMenu();
});

document.querySelectorAll(".par-week-video iframe").forEach((frame, index) => {
  if (!frame.title) frame.title = `Project video ${index + 1}`;
  frame.loading = "lazy";
});

document.querySelectorAll("[data-video-facade]").forEach((button) => {
  button.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${button.dataset.videoId}?rel=0`;
    frame.title = button.dataset.videoTitle || "Project video";
    frame.loading = "lazy";
    frame.allowFullscreen = true;
    frame.allow = "accelerometer; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    button.replaceWith(frame);
    frame.focus();
  });
});
