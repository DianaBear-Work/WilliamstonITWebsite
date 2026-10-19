
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  // Mobile menu toggle
  if (toggle && nav) {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();

      const isOpen = nav.classList.toggle("is-open");

      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.innerHTML = isOpen
        ? 'Close <span aria-hidden="true">×</span>'
        : 'Menu <span aria-hidden="true">☰</span>';
    });

    // Close the menu after selecting a navigation link
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML =
          'Menu <span aria-hidden="true">☰</span>';
      });
    });

    // Close the menu when switching back to desktop width
    window.addEventListener("resize", () => {
      if (window.innerWidth > 700) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML =
          'Menu <span aria-hidden="true">☰</span>';
      }
    });
  }

  // Highlight the current page in the navigation
  const currentPath = window.location.pathname.replace(/\/+$/, "");

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPath = new URL(
      link.href,
      window.location.href
    ).pathname.replace(/\/+$/, "");

    if (
      linkPath === currentPath ||
      (currentPath === "" && linkPath.endsWith("/index.html"))
    ) {
      link.setAttribute("aria-current", "page");
    }
  });
});
