
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "× Close" : "☰ Menu";
    });
  }

  const currentPath = window.location.pathname.replace(/\/+$/, "");

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPath = new URL(link.href, window.location.href)
      .pathname.replace(/\/+$/, "");

    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });
});
