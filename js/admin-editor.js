(function () {
  const config = window.siteAdminConfig;
  if (!config) {
    console.error("Admin editor configuration is missing for this page.");
    return;
  }

  const allowedTags = new Set([
    "A", "ARTICLE", "B", "BR", "DIV", "EM", "H1", "H2", "H3", "H4",
    "I", "LI", "OL", "P", "PATH", "RECT", "SECTION", "SPAN", "STRONG",
    "SVG", "UL"
  ]);
  const allowedAttributes = new Set([
    "aria-label", "aria-hidden", "class", "d", "fill", "height", "href",
    "rel", "role", "rx", "stroke", "stroke-linecap", "stroke-linejoin",
    "stroke-width", "target", "viewbox", "width"
  ]);
  const forbiddenTags = new Set([
    "IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG:SCRIPT"
  ]);

  function sanitizeAdminHtml(html) {
    const parsed = new DOMParser().parseFromString(String(html), "text/html");

    function clean(parent) {
      Array.from(parent.children).forEach(function (element) {
        if (!allowedTags.has(element.tagName)) {
          if (forbiddenTags.has(element.tagName)) {
            element.remove();
            return;
          }
          const replacement = parsed.createDocumentFragment();
          while (element.firstChild) {
            replacement.appendChild(element.firstChild);
          }
          element.replaceWith(replacement);
          return;
        }

        Array.from(element.attributes).forEach(function (attribute) {
          const name = attribute.name.toLowerCase();
          const value = attribute.value.trim();

          if (!allowedAttributes.has(name) && name !== "style") {
            element.removeAttribute(attribute.name);
            return;
          }

          if (name === "href") {
            let safeHref = false;
            try {
              const parsedHref = new URL(value, window.location.href);
              const trimmedHref = value.trim();
              const isRelativeUrl =
                !/^[a-z][a-z\d+.-]*:/i.test(trimmedHref) &&
                !trimmedHref.startsWith("//") &&
                !value.includes("\\");
              safeHref = isRelativeUrl ||
                (
                !value.includes("\\") &&
                ["http:", "https:", "mailto:"].includes(parsedHref.protocol)
                );
            } catch {
              safeHref = false;
            }
            if (!safeHref) {
              element.removeAttribute(attribute.name);
            }
          }

          if (name === "target" && value !== "_blank") {
            element.removeAttribute(attribute.name);
          }

          if (name === "style" &&
              !/^margin-top:\s*\d+(?:\.\d+)?(?:px|rem);?$/i.test(value)) {
            element.removeAttribute(attribute.name);
          }
        });

        if (element.tagName === "A" &&
            element.getAttribute("target") === "_blank") {
          element.setAttribute("rel", "noopener noreferrer");
        }

        clean(element);
      });
    }

    clean(parsed.body);
    return parsed.body.innerHTML;
  }

  window.sanitizeAdminHtml = sanitizeAdminHtml;

  function request(url, options) {
    return fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers)
      }
    }).then(async function (response) {
      const result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(result.error || "The request could not be completed.");
      }

      return result;
    });
  }

  function buildPanel() {
    const panel = document.createElement("section");
    panel.className = "admin-panel";
    panel.id = "admin-panel";
    panel.hidden = true;
    panel.setAttribute("aria-labelledby", "admin-panel-title");
    panel.innerHTML = `
      <div class="admin-panel-header">
        <h2 id="admin-panel-title">IT administrator</h2>
        <button type="button" data-action="close" aria-label="Close admin panel">Close</button>
      </div>
      <p class="admin-status" id="admin-status" role="status" aria-live="polite"></p>
      <form id="admin-login">
        <p class="admin-help">Sign in with the admin password to make changes. Site contents remain public.</p>
        <label for="admin-password">Admin password</label>
        <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
        <div class="admin-actions">
          <button class="admin-primary" type="submit">Sign in</button>
        </div>
      </form>
      <div id="admin-tools" hidden>
        <p class="admin-help" id="admin-help"></p>
        <div id="admin-records"></div>
        <div class="admin-actions">
          <button type="button" data-action="add-record">Add entry</button>
          <button class="admin-primary" type="button" data-action="save">Save changes</button>
          <button type="button" data-action="reset">Restore published version</button>
          <button type="button" data-action="logout">Sign out</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function setStatus(message, isError) {
    const status = document.getElementById("admin-status");
    status.textContent = message;
    status.dataset.error = String(Boolean(isError));
  }

  function setPublicStatus(message) {
    let status = document.getElementById("admin-public-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "admin-public-status";
      status.id = "admin-public-status";
      status.setAttribute("role", "status");
      const header = document.querySelector("header");
      if (header) {
        header.after(status);
      } else {
        document.body.prepend(status);
      }
    }
    status.textContent = message;
    status.hidden = !message;
  }

  function showEditor(authenticated) {
    const login = document.getElementById("admin-login");
    const tools = document.getElementById("admin-tools");
    const openButton = document.getElementById("admin-open");
    login.hidden = authenticated;
    tools.hidden = !authenticated;
    openButton.textContent = authenticated
      ? "IT admin (signed in)"
      : "IT admin sign in";
  }

  function applyContent(content) {
    if (content === null) {
      return;
    }

    config.applyData(content);
  }

  function prepareEditor() {
    const help = document.getElementById("admin-help");
    document.querySelector("#admin-panel [data-action='add-record']").hidden =
      config.mode === "visual";

    if (config.mode === "visual") {
      help.textContent =
        "Edit the visible page text below the toolbar, then save. Links and page structure are preserved and unsafe markup is removed.";
      return;
    }

    help.textContent =
      "Update the fields below, add or remove entries, then save to publish.";
    renderRecords(config.getData());
  }

  function renderRecords(records) {
    const container = document.getElementById("admin-records");
    container.replaceChildren();

    records.forEach(function (record, index) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "admin-record";
      const legend = document.createElement("legend");
      legend.textContent = `Entry ${index + 1}`;
      fieldset.appendChild(legend);

      config.editorFields.forEach(function (field) {
        const id = `admin-record-${index}-${field.key}`;
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = field.label;

        let input;
        if (field.type === "select") {
          input = document.createElement("select");
          field.options.forEach(function (option) {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            input.appendChild(optionElement);
          });
        } else if (field.type === "textarea" || field.type === "list") {
          input = document.createElement("textarea");
          input.rows = field.type === "list" ? 3 : 4;
          if (field.type === "list") {
            input.value = Array.isArray(record[field.key])
              ? record[field.key].join("\n")
              : "";
          }
        } else {
          input = document.createElement("input");
          input.type = "text";
          input.value = record[field.key] == null
            ? ""
            : String(record[field.key]);
        }

        input.id = id;
        input.dataset.field = field.key;
        fieldset.append(label, input);
      });

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove entry";
      removeButton.setAttribute("aria-label", `Remove entry ${index + 1}`);
      removeButton.addEventListener("click", function () {
        const updatedRecords = readRecords();
        updatedRecords.splice(index, 1);
        renderRecords(updatedRecords);
      });
      fieldset.appendChild(removeButton);
      container.appendChild(fieldset);
    });
  }

  function readRecords() {
    return Array.from(document.querySelectorAll("#admin-records .admin-record"))
      .map(function (fieldset) {
        const record = {};
        config.editorFields.forEach(function (field) {
          const input = fieldset.querySelector(`[data-field="${field.key}"]`);
          record[field.key] = field.type === "list"
            ? input.value.split(/\r?\n/).map(function (value) {
              return value.trim();
            }).filter(Boolean)
            : input.value.trim();
        });
        return record;
      });
  }

  async function loadPublicContent() {
    return request(`/api/content/${encodeURIComponent(config.scope)}`, {
      method: "GET",
      headers: {}
    }).then(function (result) {
      applyContent(result.content);
      return result;
    });
  }

  async function initialize() {
    const openButton = document.getElementById("admin-open");
    if (!openButton) {
      console.error("Admin sign-in button was not found.");
      return;
    }

    const panel = buildPanel();
    let authenticated = false;
    let lastSavedContent = JSON.parse(JSON.stringify(config.initialData));
    openButton.setAttribute("aria-controls", "admin-panel");
    openButton.setAttribute("aria-expanded", "false");

    openButton.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      openButton.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) {
        if (authenticated) {
          prepareEditor();
          if (config.mode === "visual") {
            config.setEditing(true);
          }
          panel.querySelector('[data-action="save"]').focus();
        } else {
          document.getElementById("admin-password").focus();
        }
      } else if (config.mode === "visual") {
        config.setEditing(false);
        applyContent(lastSavedContent);
      }
    });

    panel.querySelector('[data-action="close"]').addEventListener("click", function () {
      config.setEditing(false);
      applyContent(lastSavedContent);
      panel.hidden = true;
      openButton.setAttribute("aria-expanded", "false");
    });

    try {
      const result = await loadPublicContent();
      if (result.content !== null) {
        lastSavedContent = result.content;
      }
    } catch (error) {
      console.error("Could not load saved page content:", error);
      setStatus("Saved content could not be loaded. The page is showing its built-in content.", true);
      setPublicStatus("Saved page content could not be loaded. The built-in content is shown instead.");
    }

    try {
      const session = await request("/api/session", {
        method: "GET",
        headers: {}
      });
      authenticated = session.authenticated;
      showEditor(session.authenticated);
      if (session.authenticated) {
        prepareEditor();
      }
    } catch (error) {
      console.error("Could not check admin session:", error);
      setStatus("Admin sign-in service is unavailable. Public page content is still visible.", true);
    }

    document.getElementById("admin-login").addEventListener("submit", async function (event) {
      event.preventDefault();
      const passwordInput = document.getElementById("admin-password");
      try {
        await request("/api/login", {
          method: "POST",
          body: JSON.stringify({ password: passwordInput.value })
        });
        passwordInput.value = "";
        authenticated = true;
        showEditor(true);
        prepareEditor();
        if (config.mode === "visual") {
          config.setEditing(true);
        }
        setStatus("Signed in. Changes are not published until you save.", false);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    panel.querySelector('[data-action="save"]').addEventListener("click", async function () {
      let content;
      try {
        if (config.mode === "visual") {
          content = sanitizeAdminHtml(config.getData());
        } else {
          content = readRecords();
          if (!config.validateData(content)) {
            throw new Error("Check the required fields and status values.");
          }
        }

        await request(`/api/content/${encodeURIComponent(config.scope)}`, {
          method: "POST",
          body: JSON.stringify({ content })
        });
        applyContent(content);
        lastSavedContent = JSON.parse(JSON.stringify(content));
        prepareEditor();
        if (config.mode === "visual") {
          config.setEditing(true);
        }
        setStatus("Changes saved and visible to everyone.", false);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    panel.querySelector('[data-action="add-record"]').addEventListener("click", function () {
      if (config.mode === "visual") {
        return;
      }
      const records = readRecords();
      records.push(config.createItem());
      renderRecords(records);
      const inputs = document.querySelectorAll(
        "#admin-records .admin-record:last-child input"
      );
      if (inputs.length) {
        inputs[0].focus();
      }
    });

    panel.querySelector('[data-action="reset"]').addEventListener("click", async function () {
      if (!window.confirm("Remove saved edits and restore the page's built-in content for everyone?")) {
        return;
      }

      try {
        await request(`/api/content/${encodeURIComponent(config.scope)}`, {
          method: "DELETE"
        });
        config.applyData(config.initialData);
        lastSavedContent = JSON.parse(JSON.stringify(config.initialData));
        prepareEditor();
        if (config.mode === "visual") {
          config.setEditing(true);
        }
        setStatus("Saved edits were removed. The built-in content is now public.", false);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    panel.querySelector('[data-action="logout"]').addEventListener("click", async function () {
      try {
        await request("/api/logout", { method: "POST" });
        config.setEditing(false);
        applyContent(lastSavedContent);
        authenticated = false;
        showEditor(false);
        setStatus("Signed out.", false);
      } catch (error) {
        setStatus(error.message, true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
