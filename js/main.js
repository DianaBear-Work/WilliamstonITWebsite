
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  if (toggle && nav) {
    // Set the initial mobile menu state.
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");

      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open
        ? 'Close <span aria-hidden="true">×</span>'
        : 'Menu <span aria-hidden="true">☰</span>';
    });

    // Close the mobile menu after a navigation link is selected.
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML =
          'Menu <span aria-hidden="true">☰</span>';
      });
    });
  }

  // Highlight the current page in the navigation.
  const currentPath = window.location.pathname.replace(/\/+$/, "");

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPath = new URL(
      link.href,
      window.location.href
    ).pathname.replace(/\/+$/, "");

    const isCurrentPage =
      linkPath === currentPath ||
      (linkPath.endsWith("/index.html") &&
        currentPath === linkPath.replace(/\/index\.html$/, ""));

    if (isCurrentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
});
