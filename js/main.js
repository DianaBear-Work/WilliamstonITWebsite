document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open ? 'Close <span aria-hidden="true">×</span>' : 'Menu <span aria-hidden="true">☰</span>';
    });
  }

  const currentPath = window.location.pathname.replace(/\/+$/, "");
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/+$/, "");
    if (linkPath === currentPath || (currentPath.endsWith("/") && linkPath.endsWith("/index.html"))) {
      link.setAttribute("aria-current", "page");
    }
  });
});