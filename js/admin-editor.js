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

  function adminServiceUnavailableMessage() {
    if (window.location.protocol === "file:") {
      return "Admin sign-in is unavailable in a local file copy. Open the hosted Cloudflare Pages site to use admin tools.";
    }
    if (window.location.hostname.endsWith("github.io")) {
      return "Admin sign-in is unavailable on GitHub Pages. This site must be deployed to Cloudflare Pages with its admin API configured.";
    }
    return "Admin sign-in service is unavailable. Confirm this site is deployed to Cloudflare Pages with the admin API configured. Public page content is still visible.";
  }

  function request(url, options) {
    return fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers)
      }
    }).catch(function (error) {
      if (error instanceof TypeError) {
        throw new Error(adminServiceUnavailableMessage());
      }
      throw error;
    }).then(async function (response) {
      const result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        const unavailableAtCurrentSite =
          window.location.protocol === "file:" ||
          window.location.hostname.endsWith("github.io");
        const responseError = typeof result.error === "string" &&
          result.error.trim()
          ? result.error
          : null;
        throw new Error(
          responseError ||
          (unavailableAtCurrentSite || response.status === 404
            ? adminServiceUnavailableMessage()
            : `The admin service returned HTTP ${response.status} for ${url}. Please try again; if it continues, contact the site administrator.`)
        );
      }

      return result;
    });
  }

  function buildPanel() {
    const panel = document.createElement("dialog");
    panel.className = "admin-panel";
    if (config.mode === "visual") {
      panel.classList.add("admin-panel-visual");
    }
    panel.id = "admin-panel";
    panel.setAttribute("aria-labelledby", "admin-panel-title");
    panel.innerHTML = `
      <div class="admin-panel-header">
        <h2 id="admin-panel-title">IT administrator</h2>
        <button type="button" data-action="close" aria-label="Close admin panel">Close</button>
      </div>
      <p class="admin-status" id="admin-status" role="status" aria-live="polite"></p>
      <form id="admin-login">
        <p class="admin-help">Sign in with your admin username and password to make changes.</p>
        <label for="admin-username">Admin username</label>
        <input id="admin-username" name="username" type="text" autocomplete="username" value="diana" required>
        <label for="admin-password">Admin password</label>
        <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
        <div class="admin-actions">
          <button class="admin-primary" type="submit">Sign in</button>
        </div>
      </form>
      <div id="admin-tools" hidden>
        <nav class="admin-dashboard-nav" aria-label="Admin dashboard">
          <button type="button" class="is-active" data-admin-view="editor">Edit this page</button>
          <button type="button" data-admin-view="accounts" id="admin-accounts-tab" hidden>Manage admin accounts</button>
          <button type="button" data-action="logout">Sign out</button>
        </nav>
        <section id="admin-editor-view" data-admin-panel-view>
        <p class="admin-help" id="admin-help"></p>
        <div id="admin-records"></div>
        <div class="admin-actions">
          <button type="button" data-action="add-record">Add entry</button>
          <button class="admin-primary" type="button" data-action="save">Save changes</button>
          <button type="button" data-action="reset">Restore published version</button>
        </div>
        </section>
        <section id="admin-accounts-view" class="admin-account-panel" data-admin-panel-view hidden>
          <h3>IT admin accounts</h3>
          <p class="admin-help">Only the master admin can create accounts or set their passwords. Passwords are never displayed after saving.</p>
          <form id="admin-create-account">
            <label for="new-admin-username">Username</label>
            <input id="new-admin-username" name="username" type="text" autocomplete="off" minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" required>
            <label for="new-admin-display-name">Display name</label>
            <input id="new-admin-display-name" name="displayName" type="text" maxlength="80" required>
            <label for="new-admin-password">Initial password (at least 12 characters)</label>
            <input id="new-admin-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="256" required>
            <div class="admin-actions">
              <button class="admin-primary" type="submit">Create IT admin</button>
            </div>
          </form>
          <div id="admin-users" aria-live="polite"></div>
        </section>
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

  function showEditor(authenticated, isMaster) {
    const login = document.getElementById("admin-login");
    const tools = document.getElementById("admin-tools");
    const openButton = document.getElementById("admin-open");
    const accountsTab = document.getElementById("admin-accounts-tab");
    const editorView = document.getElementById("admin-editor-view");
    const accountsView = document.getElementById("admin-accounts-view");
    login.hidden = authenticated;
    tools.hidden = !authenticated;
    accountsTab.hidden = !isMaster;
    editorView.hidden = false;
    accountsView.hidden = true;
    accountsTab.classList.remove("is-active");
    document.querySelector('[data-admin-view="editor"]').classList.add("is-active");
    openButton.textContent = authenticated ? "Admin tools" : "Admin sign in";
  }

  function renderAdminUsers(users) {
    const container = document.getElementById("admin-users");
    container.replaceChildren();

    if (users.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-help";
      empty.textContent = "No additional IT admin accounts have been created.";
      container.appendChild(empty);
      return;
    }

    users.forEach(function (user) {
      const card = document.createElement("section");
      card.className = "admin-user";

      const name = document.createElement("strong");
      name.textContent = user.display_name;
      const username = document.createElement("p");
      username.textContent = `Username: ${user.username}`;

      const label = document.createElement("label");
      const passwordId = `admin-password-${user.username}`;
      label.htmlFor = passwordId;
      label.textContent = "New password (at least 12 characters)";

      const password = document.createElement("input");
      password.id = passwordId;
      password.type = "password";
      password.autocomplete = "new-password";
      password.minLength = 12;
      password.maxLength = 256;
      password.required = true;

      const update = document.createElement("button");
      update.type = "button";
      update.textContent = "Update password";
      update.addEventListener("click", async function () {
        if (!password.reportValidity()) return;
        update.disabled = true;
        try {
          await request(`/api/admin-users/${encodeURIComponent(user.username)}/password`, {
            method: "POST",
            body: JSON.stringify({ password: password.value })
          });
          password.value = "";
          setStatus(`Password updated for ${user.username}.`, false);
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          update.disabled = false;
        }
      });

      card.append(name, username, label, password, update);
      container.appendChild(card);
    });
  }

  async function loadAdminUsers() {
    const result = await request("/api/admin-users", {
      method: "GET",
      headers: {}
    });
    renderAdminUsers(result.users);
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
        "On the Updates page, click text in Projects in Progress or IT Reminders & Resources to edit it. Save changes to publish. Your admin sign-in is shared across admin-enabled pages on this site.";
      return;
    }

    help.textContent =
      config.editorHelp ||
      "Update fields, use Move up or Move down to arrange entries, then save to publish.";
    renderRecords(config.getData());
  }

  function renderRecords(records) {
    const container = document.getElementById("admin-records");
    container.replaceChildren();

    records.forEach(function (record, index) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "admin-record";
      const legend = document.createElement("legend");
      legend.textContent = `${config.recordLabel || "Entry"} ${index + 1}`;
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
          const currentValue = record[field.key] == null
            ? ""
            : String(record[field.key]);
          if (!Array.from(input.options).some(function (option) {
            return option.value === currentValue;
          }) && currentValue) {
            const existingOption = document.createElement("option");
            existingOption.value = currentValue;
            existingOption.textContent = `${currentValue} (existing)`;
            input.appendChild(existingOption);
          }
          input.value = currentValue;
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

      const actions = document.createElement("div");
      actions.className = "admin-record-actions";

      const moveUpButton = document.createElement("button");
      moveUpButton.type = "button";
      moveUpButton.textContent = "Move up";
      moveUpButton.setAttribute("aria-label", `Move entry ${index + 1} up`);
      moveUpButton.disabled = index === 0;
      moveUpButton.addEventListener("click", function () {
        const updatedRecords = readRecords();
        [updatedRecords[index - 1], updatedRecords[index]] =
          [updatedRecords[index], updatedRecords[index - 1]];
        renderRecords(updatedRecords);
        container.querySelector(
          `.admin-record:nth-child(${index}) .admin-record-actions button:nth-child(2)`
        ).focus();
      });
      actions.appendChild(moveUpButton);

      const moveDownButton = document.createElement("button");
      moveDownButton.type = "button";
      moveDownButton.textContent = "Move down";
      moveDownButton.setAttribute("aria-label", `Move entry ${index + 1} down`);
      moveDownButton.disabled = index === records.length - 1;
      moveDownButton.addEventListener("click", function () {
        const updatedRecords = readRecords();
        [updatedRecords[index], updatedRecords[index + 1]] =
          [updatedRecords[index + 1], updatedRecords[index]];
        renderRecords(updatedRecords);
        container.querySelector(
          `.admin-record:nth-child(${index + 2}) .admin-record-actions button`
        ).focus();
      });
      actions.appendChild(moveDownButton);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove entry";
      removeButton.setAttribute("aria-label", `Remove entry ${index + 1}`);
      removeButton.addEventListener("click", function () {
        const updatedRecords = readRecords();
        updatedRecords.splice(index, 1);
        renderRecords(updatedRecords);
      });
      actions.appendChild(removeButton);
      fieldset.appendChild(actions);
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
    let isMaster = false;
    let lastSavedContent = JSON.parse(JSON.stringify(config.initialData));
    openButton.setAttribute("aria-controls", "admin-panel");
    openButton.setAttribute("aria-expanded", "false");

    function finishClosingPanel() {
      if (openButton.getAttribute("aria-expanded") !== "true") {
        return;
      }
      openButton.setAttribute("aria-expanded", "false");
      if (config.mode === "visual") {
        config.setEditing(false);
        applyContent(lastSavedContent);
      }
    }

    function showRequestedAdminView() {
      const view = window.location.hash === "#manage-user-access" && isMaster
        ? "accounts"
        : "editor";
      panel.querySelector(`[data-admin-view="${view}"]`).click();
    }

    openButton.addEventListener("click", function () {
      if (panel.open) {
        panel.close();
        finishClosingPanel();
      } else {
        panel.show();
        openButton.setAttribute("aria-expanded", "true");
        if (authenticated) {
          showRequestedAdminView();
          prepareEditor();
          if (config.mode === "visual") {
            config.setEditing(true);
          }
          panel.querySelector('[data-action="save"]').focus();
        } else {
          document.getElementById("admin-password").focus();
        }
      }
    });

    panel.addEventListener("cancel", finishClosingPanel);
    panel.addEventListener("close", finishClosingPanel);

    panel.querySelectorAll("[data-admin-view]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const view = button.dataset.adminView;
        if (view === "accounts" && !isMaster) return;

        panel.querySelectorAll("[data-admin-panel-view]").forEach(function (section) {
          section.hidden = section.id !== `admin-${view}-view`;
        });
        panel.querySelectorAll("[data-admin-view]").forEach(function (tab) {
          tab.classList.toggle("is-active", tab === button);
        });
        if (view === "accounts") {
          try {
            await loadAdminUsers();
          } catch (error) {
            setStatus(error.message, true);
          }
        }
      });
    });

    panel.querySelector('[data-action="close"]').addEventListener("click", function () {
      panel.close();
      finishClosingPanel();
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
      isMaster = Boolean(session.isMaster);
      showEditor(session.authenticated, isMaster);
      if (window.setMasterAdminNavVisible) {
        window.setMasterAdminNavVisible(isMaster);
      }
      if (session.authenticated) {
        prepareEditor();
      }
    } catch (error) {
      console.error("Could not check admin session:", error);
      setStatus(error.message || adminServiceUnavailableMessage(), true);
    }

    document.getElementById("admin-login").addEventListener("submit", async function (event) {
      event.preventDefault();
      const usernameInput = document.getElementById("admin-username");
      const passwordInput = document.getElementById("admin-password");
      try {
        const result = await request("/api/login", {
          method: "POST",
          body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
          })
        });
        passwordInput.value = "";
        authenticated = true;
        isMaster = Boolean(result.isMaster);
        showEditor(true, isMaster);
        if (window.setMasterAdminNavVisible) {
          window.setMasterAdminNavVisible(isMaster);
        }
        prepareEditor();
        if (config.mode === "visual") {
          config.setEditing(true);
        }
        if (window.location.hash === "#manage-user-access" && !isMaster) {
          setStatus("Only the master admin can manage IT accounts.", true);
        } else {
          showRequestedAdminView();
          setStatus("Signed in. Changes are not published until you save.", false);
        }
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    document.getElementById("admin-create-account").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        await request("/api/admin-users", {
          method: "POST",
          body: JSON.stringify({
            username: form.elements.username.value,
            displayName: form.elements.displayName.value,
            password: form.elements.password.value
          })
        });
        form.reset();
        await loadAdminUsers();
        setStatus("IT admin account created.", false);
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        submit.disabled = false;
      }
    });

    panel.querySelector('[data-action="save"]').addEventListener("click", async function () {
      let content;
      try {
        if (config.mode === "visual") {
          content = sanitizeAdminHtml(config.getData());
        } else {
          content = readRecords();
          if (typeof config.prepareSaveData === "function") {
            content = config.prepareSaveData(content);
          }
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
        if (config.mode === "visual") {
          config.setEditing(false);
        }
        applyContent(lastSavedContent);
        authenticated = false;
        isMaster = false;
        showEditor(false, false);
        if (window.setMasterAdminNavVisible) {
          window.setMasterAdminNavVisible(false);
        }
        setStatus("Signed out.", false);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    if (window.location.hash === "#admin-login" ||
        window.location.hash === "#manage-user-access") {
      openButton.click();
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
