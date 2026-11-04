
function setMasterAdminNavVisible(isMaster) {
  document.querySelectorAll("[data-master-admin-only]").forEach((link) => {
    link.hidden = !isMaster;
  });
}

window.setMasterAdminNavVisible = setMasterAdminNavVisible;

function setAdminHeaderSession(session) {
  const authenticated = Boolean(session && session.authenticated);
  const adminButton = document.querySelector(".admin-open");
  setMasterAdminNavVisible(Boolean(authenticated && session.isMaster));

  if (!adminButton) return;

  let signOut = document.querySelector(".admin-header-signout");
  if (!signOut) {
    signOut = document.createElement("button");
    signOut.className = "admin-header-signout";
    signOut.type = "button";
    signOut.textContent = "Sign out";
    signOut.hidden = true;
    adminButton.after(signOut);

    const status = document.createElement("span");
    status.className = "admin-header-status";
    status.setAttribute("role", "status");
    signOut.after(status);

    signOut.addEventListener("click", async () => {
      signOut.disabled = true;
      status.textContent = "";
      status.classList.remove("is-visible");
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || `Sign out failed (HTTP ${response.status}).`);
        }
        setAdminHeaderSession({ authenticated: false });
        document.dispatchEvent(new CustomEvent("site-admin-session-changed", {
          detail: { authenticated: false }
        }));
      } catch (error) {
        status.textContent = error.message || "Could not sign out. Please try again.";
        status.classList.add("is-visible");
      } finally {
        signOut.disabled = false;
      }
    });
  }
  signOut.hidden = !authenticated;
  adminButton.textContent = authenticated ? "Admin tools" : "Admin sign in";
}

window.setAdminHeaderSession = setAdminHeaderSession;

document.addEventListener("DOMContentLoaded", () => {
  const masterAdminLinks = document.querySelectorAll("[data-master-admin-only]");
  const adminButton = document.querySelector(".admin-open");
  if (masterAdminLinks.length > 0 || adminButton) {
    window.masterAdminSessionCheck = window.masterAdminSessionCheck ||
      fetch("/api/session", { credentials: "same-origin" });
    window.masterAdminSessionCheck
      .then((response) => response.ok ? response.json() : null)
      .then((session) => setAdminHeaderSession(session))
      .catch(() => setAdminHeaderSession(null));
  }

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

    // Close the menu when the responsive layout hides the toggle
    window.addEventListener("resize", () => {
      if (getComputedStyle(toggle).display === "none") {
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
