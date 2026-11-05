(function () {
  const dashboard = document.getElementById("account-dashboard");
  const denied = document.getElementById("access-denied");
  const status = document.getElementById("dashboard-status");
  const list = document.getElementById("account-list");

  function setStatus(message, isError) {
    status.textContent = message;
    status.dataset.error = String(Boolean(isError));
  }

  async function request(url, options) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers)
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Request failed (HTTP ${response.status}).`);
    }
    return result;
  }

  function displayDate(value) {
    if (!value) return "Never";
    const date = new Date(value.replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function createButton(label, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", action);
    return button;
  }

  function renderAccounts(users) {
    list.replaceChildren();
    users.forEach(function (user) {
      const card = document.createElement("article");
      card.className = "account-card";

      const head = document.createElement("div");
      head.className = "account-card-head";
      const identity = document.createElement("div");
      const name = document.createElement("strong");
      name.className = "account-name";
      name.textContent = user.display_name;
      const username = document.createElement("p");
      username.className = "account-username";
      username.textContent = `Username: ${user.username}`;
      const lastSignIn = document.createElement("p");
      lastSignIn.className = "account-last-signin";
      lastSignIn.textContent = `Last sign-in: ${displayDate(user.last_sign_in_at)}`;
      identity.append(name, username, lastSignIn);

      const badge = document.createElement("span");
      badge.className = `account-status${user.locked ? " is-locked" : ""}`;
      badge.textContent = user.is_master ? "Master admin" : user.locked ? "Locked" : "Active";
      head.append(identity, badge);
      card.appendChild(head);

      if (!user.is_master) {
        const passwordWrap = document.createElement("div");
        passwordWrap.className = "account-password";
        const passwordId = `reset-${user.username}`;
        const passwordLabel = document.createElement("label");
        passwordLabel.htmlFor = passwordId;
        passwordLabel.textContent = "Set new password (12+ characters)";
        const password = document.createElement("input");
        password.id = passwordId;
        password.type = "password";
        password.minLength = 12;
        password.maxLength = 256;
        password.autocomplete = "new-password";
        passwordWrap.append(passwordLabel, password);
        card.appendChild(passwordWrap);

        const created = document.createElement("p");
        created.className = "account-last-signin";
        created.textContent = `Created: ${displayDate(user.created_at)}`;
        card.appendChild(created);

        const actions = document.createElement("div");
        actions.className = "account-actions";
        actions.appendChild(createButton("Update password", "", async function () {
          if (!password.reportValidity()) return;
          try {
            await request(`/api/admin-users/${encodeURIComponent(user.username)}/password`, {
              method: "POST",
              body: JSON.stringify({ password: password.value })
            });
            password.value = "";
            setStatus(`Password updated for ${user.username}.`, false);
          } catch (error) {
            setStatus(error.message, true);
          }
        }));
        actions.appendChild(createButton(user.locked ? "Unlock account" : "Lock account", "", async function () {
          try {
            await request(`/api/admin-users/${encodeURIComponent(user.username)}`, {
              method: "PATCH",
              body: JSON.stringify({ locked: !user.locked })
            });
            setStatus(`Account ${user.locked ? "unlocked" : "locked"}.`, false);
            await loadAccounts();
          } catch (error) {
            setStatus(error.message, true);
          }
        }));
        actions.appendChild(createButton("Delete account", "delete-account", async function () {
          if (!window.confirm(`Permanently delete the IT admin account "${user.username}"?`)) return;
          try {
            await request(`/api/admin-users/${encodeURIComponent(user.username)}`, {
              method: "DELETE"
            });
            setStatus(`Account ${user.username} deleted.`, false);
            await loadAccounts();
          } catch (error) {
            setStatus(error.message, true);
          }
        }));
        card.appendChild(actions);
      }
      list.appendChild(card);
    });
  }

  async function loadAccounts() {
    const result = await request("/api/admin-users", { method: "GET" });
    renderAccounts(result.users);
  }

  document.getElementById("create-account-form").addEventListener("submit", async function (event) {
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
      await loadAccounts();
      setStatus("IT admin account created.", false);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      const session = await request("/api/session", { method: "GET" });
      if (window.setAdminHeaderSession) window.setAdminHeaderSession(session);
      if (!session.authenticated || !session.isMaster) {
        denied.hidden = false;
        document.getElementById("access-message").textContent = session.authenticated
          ? "This page is only available to the master admin."
          : "Sign in with the master admin account to manage IT accounts.";
        return;
      }
      dashboard.hidden = false;
      await loadAccounts();
    } catch (error) {
      dashboard.hidden = true;
      denied.hidden = false;
      document.getElementById("access-message").textContent = error.message;
    }
  });
})();
