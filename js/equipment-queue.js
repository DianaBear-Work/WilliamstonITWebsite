
"use strict";

/*
 * WILLIAMSTON IT EQUIPMENT QUEUE
 *
 * ADMINISTRATOR SETTINGS:
 * Edit the inventory quantities in the inventory array below.
 *
 * IMPORTANT:
 * This is a GitHub Pages demonstration. Browser-side JavaScript is public
 * and can be modified by visitors. Do not use this as a secure inventory
 * database or for real employee records.
 */

/* =========================================
   1. ADMINISTRATOR-MAINTAINED INVENTORY
   Change quantity values here.
   ========================================= */

const inventory = [
  {
    id: 1,
    name: "Laptop",
    category: "Computers",
    quantity: 5,
    description: "Standard employee laptop"
  },
  {
    id: 2,
    name: "Laptop Charger",
    category: "Accessories",
    quantity: 12,
    description: "Compatible laptop power adapter"
  },
  {
    id: 3,
    name: "Laptop Backpack",
    category: "Accessories",
    quantity: 0,
    description: "Standard Vertiv laptop backpack"
  },
  {
    id: 4,
    name: "Docking Station",
    category: "Accessories",
    quantity: 4,
    description: "USB-C docking station"
  },
  {
    id: 5,
    name: "Keyboard and Mouse",
    category: "Accessories",
    quantity: 8,
    description: "Standard keyboard and mouse set"
  },
  {
    id: 6,
    name: "Monitor",
    category: "Displays",
    quantity: 3,
    description: "Standard office monitor"
  }
];

/* =========================================
   2. DEMONSTRATION LAPTOP BUILD RECORDS
   Replace these with fictional/demo entries
   until an approved private backend exists.
   ========================================= */

const laptopBuilds = [
  {
    id: 101,
    employee: "Sample Employee 1",
    manager: "Sample Manager",
    status: "In Progress",
    accessories: "Laptop, charger, backpack"
  },
  {
    id: 102,
    employee: "Sample Employee 2",
    manager: "Sample Manager",
    status: "Pending",
    accessories: "Laptop, docking station"
  },
  {
    id: 103,
    employee: "Sample Employee 3",
    manager: "Sample Manager",
    status: "Complete",
    accessories: "Laptop, charger"
  }
];

/*
 * Prototype requests are saved in localStorage.
 * Each visitor's browser has its own copy.
 */
const REQUEST_STORAGE_KEY = "williamstonEquipmentRequests";
const WAITLIST_STORAGE_KEY = "williamstonEquipmentWaitlist";

let equipmentRequests = readLocalArray(REQUEST_STORAGE_KEY);
let equipmentWaitlist = readLocalArray(WAITLIST_STORAGE_KEY);

/* =========================================
   3. GENERAL HELPERS
   ========================================= */

function readLocalArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Could not read local demo data:", error);
    return [];
  }
}

function saveLocalArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Could not save local demo data:", error);
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function getElement(id) {
  return document.getElementById(id);
}

function formatStatus(status) {
  if (status === "Complete") {
    return "status-complete";
  }

  if (status === "In Progress") {
    return "status-progress";
  }

  return "status-pending";
}

/* =========================================
   4. INVENTORY DISPLAY
   Stock quantities come from the inventory
   array above, not from visitor input.
   ========================================= */

function renderInventory() {
  const grid = getElement("inventoryGrid");
  const searchInput = getElement("inventorySearch");

  if (!grid) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const matchingItems = inventory.filter(item => {
    const searchable = [
      item.name,
      item.category,
      item.description
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });

  if (matchingItems.length === 0) {
    grid.innerHTML = '<p class="empty-state">No matching inventory items found.</p>';
    return;
  }

  grid.innerHTML = matchingItems.map(item => {
    const available = item.quantity > 0;

    return `
      <article class="inventory-card">
        <span class="category-label">${escapeHTML(item.category)}</span>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="item-description">${escapeHTML(item.description)}</p>

        <p class="stock-label ${available ? "stock-available" : "stock-unavailable"}">
          ${available
            ? `${item.quantity} available`
            : "Currently unavailable"}
        </p>

        <button
          class="btn-primary"
          type="button"
          data-request-item="${item.id}"
          ${available ? "" : "disabled"}
        >
          ${available ? "Request Equipment" : "Out of Stock"}
        </button>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-request-item]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = Number(button.dataset.requestItem);
      const select = getElement("requestItem");
      const form = getElement("request-equipment");

      if (select) {
        select.value = String(itemId);
      }

      form?.scrollIntoView({ behavior: "smooth", block: "start" });
      getElement("requestName")?.focus({ preventScroll: true });
    });
  });
}

function populateInventorySelect() {
  const select = getElement("requestItem");

  if (!select) return;

  select.innerHTML = '<option value="">Select equipment</option>';

  inventory.forEach(item => {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = `${item.name} (${item.quantity} available)`;
    option.disabled = item.quantity <= 0;
    select.appendChild(option);
  });
}

/* =========================================
   5. REQUEST VALIDATION
   Checks required fields and ticket format.
   Does NOT verify the ticket in ServiceNow.
   ========================================= */

function validateReservationForm(formData) {
  const name = String(formData.get("requestName") || "").trim();
  const email = String(formData.get("requestEmail") || "").trim();
  const ticket = String(formData.get("requestTicket") || "")
    .trim()
    .toUpperCase();

  const itemId = Number(formData.get("requestItem"));
  const quantity = Number(formData.get("requestQuantity"));
  const notes = String(formData.get("requestNotes") || "").trim();

  if (!name || !email || !ticket || !itemId) {
    return {
      error: "Please complete your name, work email, ticket number, and equipment selection."
    };
  }

  if (!/^[^\s@]+@vertivco\.com$/i.test(email)) {
    return {
      error: "Please enter your Vertiv work email ending in @vertivco.com."
    };
  }

  if (!/^(RITM|SCTASK|INC|REQ)\d+$/i.test(ticket)) {
    return {
      error: "Enter a ticket such as RITM1234567, SCTASK1234567, INC1234567, or REQ1234567."
    };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      error: "Quantity must be a whole number of at least 1."
    };
  }

  const item = inventory.find(entry => entry.id === itemId);

  if (!item) {
    return { error: "Please select a valid inventory item." };
  }

  if (item.quantity <= 0) {
    return {
      error: `${item.name} is currently out of stock. You can join the waitlist below.`
    };
  }

  if (quantity > item.quantity) {
    return {
      error: `Only ${item.quantity} unit(s) of ${item.name} are listed as available.`
    };
  }

  return {
    requesterName: name,
    requesterEmail: email,
    ticketNumber: ticket,
    itemId,
    quantity,
    notes
  };
}

function showReservationMessage(message, type) {
  const element = getElement("reservationMessage");

  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
}

function handleReservationSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const validation = validateReservationForm(formData);

  if (validation.error) {
    showReservationMessage(validation.error, "error");
    return;
  }

  const item = inventory.find(entry => entry.id === validation.itemId);

  /*
   * Demo only: records a request in this browser.
   * It intentionally does not change official stock quantities.
   * It does not submit to ServiceNow or notify IT.
   */
  const request = {
    id: `DEMO-${Date.now()}`,
    requesterName: validation.requesterName,
    requesterEmail: validation.requesterEmail,
    ticketNumber: validation.ticketNumber,
    itemId: item.id,
    itemName: item.name,
    quantity: validation.quantity,
    notes: validation.notes,
    status: "Submitted - Demo Only",
    submittedAt: new Date().toISOString()
  };

  equipmentRequests.push(request);

  if (!saveLocalArray(REQUEST_STORAGE_KEY, equipmentRequests)) {
    equipmentRequests.pop();
    showReservationMessage(
      "The browser could not save this demo request. Please try again.",
      "error"
    );
    return;
  }

  showReservationMessage(
    `Demo request recorded in this browser for ${item.name}. This has not been sent to IT or ServiceNow.`,
    "success"
  );

  /*
   * The inventory array is deliberately unchanged.
   * An actual reservation system must deduct stock on a protected backend
   * after the request is approved.
   */
  form.reset();
  populateInventorySelect();
  renderInventory();
  updateStats();
}

/* =========================================
   6. LAPTOP BUILD QUEUE
   Sample records only.
   ========================================= */

function renderLaptopBuilds() {
  const body = getElement("buildTableBody");
  const searchInput = getElement("buildSearch");

  if (!body) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const matchingBuilds = laptopBuilds.filter(build => {
    return [
      build.employee,
      build.manager,
      build.status,
      build.accessories
    ].join(" ").toLowerCase().includes(query);
  });

  if (matchingBuilds.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4">No matching laptop builds found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = matchingBuilds.map(build => `
    <tr>
      <td>${escapeHTML(build.employee)}</td>
      <td>${escapeHTML(build.manager)}</td>
      <td>
        <span class="status-pill ${formatStatus(build.status)}">
          ${escapeHTML(build.status)}
        </span>
      </td>
      <td>${escapeHTML(build.accessories)}</td>
    </tr>
  `).join("");
}

/* =========================================
   7. EQUIPMENT WAITLIST
   Requires name, email, ticket, and item.
   ========================================= */

function renderWaitlist() {
  const container = getElement("waitlistList");
  const searchInput = getElement("waitlistSearch");

  if (!container) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const matchingRequests = equipmentWaitlist.filter(request => {
    return [
      request.itemName,
      request.requesterName,
      request.requesterEmail,
      request.ticketNumber,
      request.status
    ].join(" ").toLowerCase().includes(query);
  });

  if (matchingRequests.length === 0) {
    container.innerHTML = `
      <p class="empty-state">
        No waitlist entries in this browser. To request an out-of-stock item,
        select it in the equipment form and follow your normal IT ticket process.
      </p>
    `;
    return;
  }

  container.innerHTML = matchingRequests.map(request => `
    <article class="waitlist-card">
      <h3>${escapeHTML(request.itemName)}</h3>
      <p><strong>Requested by:</strong> ${escapeHTML(request.requesterName)}</p>
      <p><strong>Email:</strong> ${escapeHTML(request.requesterEmail)}</p>
      <p><strong>Ticket:</strong> ${escapeHTML(request.ticketNumber)}</p>
      <p><strong>Quantity:</strong> ${Number(request.quantity)}</p>
      <p><strong>Status:</strong> ${escapeHTML(request.status)}</p>
    </article>
  `).join("");
}

function handleOutOfStockRequest() {
  const form = getElement("reservationForm");
  if (!form) return;

  const formData = new FormData(form);

  const name = String(formData.get("requestName") || "").trim();
  const email = String(formData.get("requestEmail") || "").trim();
  const ticket = String(formData.get("requestTicket") || "")
    .trim()
    .toUpperCase();
  const itemId = Number(formData.get("requestItem"));
  const quantity = Number(formData.get("requestQuantity"));

  if (!name || !email || !ticket || !itemId) {
    showReservationMessage(
      "To join the waitlist, complete your name, work email, ticket number, and equipment selection.",
      "error"
    );
    return;
  }

  if (!/^[^\s@]+@vertivco\.com$/i.test(email)) {
    showReservationMessage(
      "Please enter your Vertiv work email ending in @vertivco.com.",
      "error"
    );
    return;
  }

  if (!/^(RITM|SCTASK|INC|REQ)\d+$/i.test(ticket)) {
    showReservationMessage(
      "Enter a ticket such as RITM1234567, SCTASK1234567, INC1234567, or REQ1234567.",
      "error"
    );
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showReservationMessage(
      "Quantity must be a whole number of at least 1.",
      "error"
    );
    return;
  }

  const item = inventory.find(entry => entry.id === itemId);

  if (!item) {
    showReservationMessage("Please select a valid item.", "error");
    return;
  }

  if (item.quantity > 0) {
    showReservationMessage(
      "This item is currently listed as available. Submit a standard equipment request instead.",
      "error"
    );
    return;
  }

  equipmentWaitlist.push({
    id: `WAIT-${Date.now()}`,
    itemId: item.id,
    itemName: item.name,
    requesterName: name,
    requesterEmail: email,
    ticketNumber: ticket,
    quantity,
    status: "Waiting - Demo Only",
    submittedAt: new Date().toISOString()
  });

  if (!saveLocalArray(WAITLIST_STORAGE_KEY, equipmentWaitlist)) {
    equipmentWaitlist.pop();
    showReservationMessage(
      "The browser could not save this demo waitlist entry.",
      "error"
    );
    return;
  }

  showReservationMessage(
    `Demo waitlist entry recorded for ${item.name}. It has not been sent to IT.`,
    "success"
  );

  form.reset();
  populateInventorySelect();
  renderWaitlist();
  updateStats();
}

/* =========================================
   8. SUMMARY COUNTS
   ========================================= */

function updateStats() {
  const itemTypes = getElement("statItemTypes");
  const units = getElement("statUnits");
  const builds = getElement("statBuilds");
  const waitlist = getElement("statWaitlist");

  if (itemTypes) {
    itemTypes.textContent = String(inventory.length);
  }

  if (units) {
    units.textContent = String(
      inventory.reduce((total, item) => total + item.quantity, 0)
    );
  }

  if (builds) {
    builds.textContent = String(laptopBuilds.length);
  }

  if (waitlist) {
    waitlist.textContent = String(equipmentWaitlist.length);
  }
}

/* =========================================
   9. MOBILE NAVIGATION
   ========================================= */

function setupMobileNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
  });
}

/* =========================================
   10. INITIALIZE PAGE
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupMobileNavigation();

  populateInventorySelect();
  renderInventory();
  renderLaptopBuilds();
  renderWaitlist();
  updateStats();

  getElement("inventorySearch")?.addEventListener("input", renderInventory);
  getElement("buildSearch")?.addEventListener("input", renderLaptopBuilds);
  getElement("waitlistSearch")?.addEventListener("input", renderWaitlist);

  getElement("reservationForm")?.addEventListener("submit", event => {
    const selectedId = Number(getElement("requestItem")?.value);
    const selectedItem = inventory.find(item => item.id === selectedId);

    if (selectedItem && selectedItem.quantity <= 0) {
      event.preventDefault();
      handleOutOfStockRequest();
      return;
    }

    handleReservationSubmit(event);
  });

  /*
   * No employee-facing controls modify the inventory array.
   * Quantities are edited by the site maintainer in the source code.
   */
});
