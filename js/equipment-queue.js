/* =========================================================
   PELZER 2 IT — EQUIPMENT INVENTORY
   Update inventory quantities directly in the inventory array.
   This is a manually maintained inventory, not live stock.
   ========================================================= */

/* ---------------------------------------------------------
   SERVICENOW REQUEST LINKS
   --------------------------------------------------------- */

const serviceNowRequests = {
  laptop:
    "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=4e774a921b3642106c9db802dd4bcb8d",

  accessory:
    "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=089b54c1db89d300b1af38ff9d961909"
};

/* ---------------------------------------------------------
   INVENTORY
   Update the quantity values as needed.
   0 means the quantity has not been entered or is out of stock.
   --------------------------------------------------------- */

const inventory = [
  {
    id: 1,
    name: "Standard Laptop",
    category: "Computers",
    quantity: 7,
    restockStatus: "Not Yet Requested",
    description: "Standard employee laptop",
    requestType: "laptop"
  },
  {
    id: 2,
    name: "Engineering Laptop",
    category: "Computers",
    quantity: 0,
    restockStatus: "Not Yet Requested",
    description: "Laptop intended for engineering applications and workloads",
    requestType: "laptop"
  },
  {
    id: 3,
    name: "Laptop Charger",
    category: "Accessories",
    quantity: "Many in Stock",
    restockStatus: "Not Yet Requested",
    description: "Compatible laptop power adapter",
    requestType: "accessory"
  },
  {
    id: 4,
    name: "DP Cable",
    category: "Cables",
    quantity: 3,
    restockStatus: "Ordered",
    description: "DisplayPort cable for connecting a computer to a monitor",
    requestType: "accessory"
  },
  {
    id: 5,
    name: "Engineering Docking Station",
    category: "Docking Stations",
    quantity: "Many in Stock",
    restockStatus: "Not Yet Requested",
    description: "Docking station intended for engineering workstations",
    requestType: "accessory"
  },
  {
    id: 6,
    name: "Standard Docking Station",
    category: "Docking Stations",
    quantity: 3,
    restockStatus: "Not Yet Requested",
    description: "Standard USB-C docking station",
    requestType: "accessory"
  },
  {
    id: 7,
    name: "Headset",
    category: "Accessories",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Computer headset for calls and meetings",
    requestType: "accessory"
  },
  {
    id: 8,
    name: "Mouse",
    category: "Accessories",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Standard computer mouse",
    requestType: "accessory"
  },
  {
    id: 9,
    name: "Keyboard and Mouse Combo",
    category: "Accessories",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Standard keyboard and mouse set",
    requestType: "accessory"
  },
  {
    id: 10,
    name: "Wired Keyboard",
    category: "Accessories",
    quantity: 4,
    restockStatus: "Not Yet Requested",
    description: "Standard wired computer keyboard",
    requestType: "accessory"
  },
  {
    id: 11,
    name: "Standard Backpack",
    category: "Bags",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Standard employee laptop backpack",
    requestType: "accessory"
  },
  {
    id: 12,
    name: "Field Backpack",
    category: "Bags",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Laptop backpack intended for field use",
    requestType: "accessory"
  },
  {
    id: 13,
    name: "Monitor",
    category: "Displays",
    quantity: 0,
    restockStatus: "Ordered",
    description: "Standard office monitor",
    requestType: "accessory"
  }
];

/* ---------------------------------------------------------
   HELPER FUNCTIONS
   --------------------------------------------------------- */

function getElement(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function getRequestLink(item) {
  return serviceNowRequests[item.requestType] ||
    serviceNowRequests.accessory;
}

function formatQuantity(quantity) {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

/* ---------------------------------------------------------
   INVENTORY CARD RENDERING
   --------------------------------------------------------- */

function renderInventory(searchTerm = "") {
  const inventoryGrid = getElement("inventoryGrid");

  if (!inventoryGrid) {
    console.warn(
      "Equipment inventory: element #inventoryGrid was not found."
    );
    return;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredInventory = inventory.filter(function (item) {
    const searchableText = [
      item.name,
      item.category,
      item.description
    ].join(" ").toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  if (filteredInventory.length === 0) {
    inventoryGrid.innerHTML = `
      <div class="inventory-empty">
        <h3>No equipment found</h3>
        <p>Try a different search term.</p>
      </div>
    `;
    return;
  }

  inventoryGrid.innerHTML = filteredInventory.map(function (item) {
    const quantity = formatQuantity(item.quantity);
    const inStock = quantity > 0;
    const requestLink = getRequestLink(item);

    const stockLabel = inStock
      ? `${quantity} available`
      : "Out of stock / quantity not entered";

    const stockClass = inStock
      ? "in-stock"
      : "out-of-stock";

    return `
      <article class="inventory-card">
        <div class="inventory-card-content">

          <span class="inventory-category">
            ${escapeHTML(item.category)}
          </span>

          <h3 class="inventory-item-name">
            ${escapeHTML(item.name)}
          </h3>

          <p class="inventory-description">
            ${escapeHTML(item.description)}
          </p>

          <div class="inventory-stock ${stockClass}">
            <span class="stock-indicator" aria-hidden="true"></span>
            <span>${escapeHTML(stockLabel)}</span>
          </div>

          <a
            class="inventory-request-button"
            href="${escapeHTML(requestLink)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Request ${escapeHTML(item.name)} through ServiceNow"
          >
            Request through ServiceNow
            <span aria-hidden="true">&rarr;</span>
          </a>

        </div>
      </article>
    `;
  }).join("");
}

/* ---------------------------------------------------------
   INVENTORY SUMMARY
   Updates the summary numbers shown on the page.
   --------------------------------------------------------- */

function updateStats() {
  const itemTypesElement = getElement("statItemTypes");
  const totalUnitsElement = getElement("statUnits");

  const totalItemTypes = inventory.length;

  const totalUnits = inventory.reduce(function (total, item) {
    return total + formatQuantity(item.quantity);
  }, 0);

  if (itemTypesElement) {
    itemTypesElement.textContent = totalItemTypes;
  }

  if (totalUnitsElement) {
    totalUnitsElement.textContent = totalUnits;
  }
}

/* ---------------------------------------------------------
   INVENTORY SEARCH
   --------------------------------------------------------- */

function setupInventorySearch() {
  const searchInput = getElement("inventorySearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    renderInventory(searchInput.value);
  });
}

/* ---------------------------------------------------------
   MOBILE NAVIGATION
   --------------------------------------------------------- */

function setupMobileNavigation() {
  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = getElement("primary-nav");

  if (!menuToggle || !primaryNav) {
    return;
  }

  menuToggle.addEventListener("click", function () {
    const isOpen = primaryNav.classList.toggle("is-open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  primaryNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      primaryNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------------------------------------------------
   INITIALIZE PAGE
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  setupMobileNavigation();
  setupInventorySearch();
  renderInventory();
  updateStats();
});