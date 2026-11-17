const appearanceStorageKey = "biwc-appearance";

function getSavedAppearance() {
  try {
    return window.localStorage.getItem(appearanceStorageKey);
  } catch (error) {
    console.warn("Unable to read the saved appearance preference.", error);
    return null;
  }
}

function saveAppearance(appearance) {
  try {
    window.localStorage.setItem(appearanceStorageKey, appearance);
  } catch (error) {
    console.warn("Unable to save the appearance preference.", error);
  }
}

const savedAppearance = getSavedAppearance();
if (savedAppearance === "dark" || savedAppearance === "light") {
  document.documentElement.dataset.theme = savedAppearance;
}

const adminConfig = window.BIWC_SUPABASE_CONFIG || {};
const adminSessionKey = "biwc-admin-session";
const submissionViews = {
  contact: {
    label: "Contact messages",
    path: "/rest/v1/contact_submissions?select=id,name,email,subject,message,submitted_at&order=submitted_at.desc&limit=100"
  },
  prayer: {
    label: "Prayer requests",
    path: "/rest/v1/prayer_requests?select=id,name,email,prayer_request,submitted_at&order=submitted_at.desc&limit=100"
  },
  newsletter: {
    label: "Newsletter subscriptions",
    path: "/rest/v1/newsletter_subscriptions?select=id,email,submitted_at&order=submitted_at.desc&limit=100"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.querySelector(".theme-toggle");
  const loginPanel = document.querySelector("#admin-login-panel");
  const dashboardPanel = document.querySelector("#admin-dashboard");
  const loginForm = document.querySelector("#admin-login-form");
  const loginButton = document.querySelector("#admin-login-button");
  const loginStatus = document.querySelector("#login-status");
  const dashboardStatus = document.querySelector("#dashboard-status");
  const submissionList = document.querySelector("#submission-list");
  const refreshButton = document.querySelector("#refresh-submissions");
  const signOutButton = document.querySelector("#admin-sign-out");
  const viewButtons = document.querySelectorAll(".admin-tab");
  const publicKey = String(adminConfig.anonKey || "");
  let projectUrl = "";
  let currentView = "contact";
  let submissions = {};
  let refreshInProgress = null;

  function updateThemeToggle() {
    if (!themeToggle) return;
    const isDark = document.documentElement.dataset.theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    const label = `Switch to ${nextTheme} mode`;
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  updateThemeToggle();
  themeToggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    saveAppearance(nextTheme);
    updateThemeToggle();
  });

  function showLogin() {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    submissions = {};
    submissionList.replaceChildren();
    dashboardStatus.textContent = "";
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
  }

  function clearSession() {
    window.sessionStorage.removeItem(adminSessionKey);
  }

  function saveSession(session) {
    window.sessionStorage.setItem(adminSessionKey, JSON.stringify(session));
  }

  function readSession() {
    const saved = window.sessionStorage.getItem(adminSessionKey);
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Unable to read the saved admin session.", error);
      clearSession();
      return null;
    }
  }

  function createSession(response) {
    if (!response.access_token || !response.refresh_token || !response.expires_in) {
      throw new Error("Supabase did not return a complete admin session.");
    }

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + Number(response.expires_in) * 1000
    };
  }

  async function requestJson(path, options) {
    const requestOptions = options || {};
    const headers = { apikey: publicKey };
    if (requestOptions.accessToken) {
      headers.Authorization = `Bearer ${requestOptions.accessToken}`;
    }
    if (requestOptions.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${projectUrl}${path}`, {
      method: requestOptions.method || "GET",
      headers,
      body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body)
    });

    if (!response.ok) {
      const error = new Error(`Supabase request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async function refreshSession(session) {
    if (refreshInProgress) return refreshInProgress;

    refreshInProgress = (async () => {
      const response = await requestJson("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refreshToken }
      });
      const updatedSession = createSession(response);
      saveSession(updatedSession);
      return updatedSession;
    })();

    try {
      return await refreshInProgress;
    } finally {
      refreshInProgress = null;
    }
  }

  async function getValidSession() {
    const session = readSession();
    if (!session || !session.accessToken || !session.refreshToken) {
      throw new Error("Sign in to continue.");
    }

    if (Number(session.expiresAt) > Date.now() + 30000) return session;
    return refreshSession(session);
  }

  async function authenticatedRequest(path, options) {
    let session = await getValidSession();
    const requestOptions = Object.assign({}, options || {}, { accessToken: session.accessToken });

    try {
      return await requestJson(path, requestOptions);
    } catch (error) {
      if (error.status !== 401) throw error;
      session = await refreshSession(session);
      requestOptions.accessToken = session.accessToken;
      return requestJson(path, requestOptions);
    }
  }

  function addRecordField(fields, label, value, wide) {
    const wrapper = document.createElement("div");
    wrapper.className = wide ? "admin-record-field admin-record-field-wide" : "admin-record-field";

    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value === null || value === undefined || value === "" ? "—" : String(value);

    wrapper.append(term, description);
    fields.append(wrapper);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { label: "Date unavailable", datetime: "" };
    return { label: date.toLocaleString(), datetime: date.toISOString() };
  }

  function makeRecord(view, row) {
    const article = document.createElement("article");
    article.className = "admin-record";

    const header = document.createElement("header");
    header.className = "admin-record-header";
    const title = document.createElement("h2");
    title.textContent = view === "contact" ? (row.subject || "Contact message") : submissionViews[view].label;
    const time = document.createElement("time");
    const date = formatDate(row.submitted_at);
    time.textContent = date.label;
    if (date.datetime) time.dateTime = date.datetime;
    header.append(title, time);

    const fields = document.createElement("dl");
    fields.className = "admin-record-fields";

    if (view === "contact") {
      addRecordField(fields, "Name", row.name);
      addRecordField(fields, "Email", row.email);
      addRecordField(fields, "Message", row.message, true);
    } else if (view === "prayer") {
      addRecordField(fields, "Name", row.name || "Anonymous");
      addRecordField(fields, "Email", row.email);
      addRecordField(fields, "Prayer request", row.prayer_request, true);
    } else {
      addRecordField(fields, "Email", row.email);
    }

    article.append(header, fields);
    return article;
  }

  function renderSubmissions() {
    submissionList.replaceChildren();
    const rows = submissions[currentView] || [];

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = `No ${submissionViews[currentView].label.toLowerCase()} found.`;
      submissionList.append(empty);
      return;
    }

    rows.forEach((row) => submissionList.append(makeRecord(currentView, row)));
  }

  async function loadSubmissions() {
    refreshButton.disabled = true;
    dashboardStatus.textContent = "Loading submissions...";

    try {
      const isAdmin = await authenticatedRequest("/rest/v1/rpc/is_biwc_admin", {
        method: "POST",
        body: {}
      });

      if (isAdmin !== true) {
        clearSession();
        showLogin();
        loginStatus.textContent = "This account is not authorized to access the BIWC dashboard.";
        return;
      }

      const entries = Object.entries(submissionViews);
      const results = await Promise.all(entries.map(([, view]) => authenticatedRequest(view.path)));
      submissions = Object.fromEntries(entries.map(([key], index) => [key, results[index]]));

      viewButtons.forEach((button) => {
        const view = button.dataset.view;
        const count = (submissions[view] || []).length;
        button.textContent = `${submissionViews[view].label} (${count})`;
      });

      dashboardStatus.textContent = "Showing up to the 100 most recent submissions in each category.";
      renderSubmissions();
    } catch (error) {
      console.error("Unable to load BIWC submissions.", error);
      dashboardStatus.textContent = "Could not load submissions. Please try again.";
    } finally {
      refreshButton.disabled = false;
    }
  }

  if (!adminConfig.url || !publicKey) {
    loginButton.disabled = true;
    loginStatus.textContent = "Sign-in is currently unavailable. Please contact the site administrator.";
    return;
  }

  try {
    const url = new URL(String(adminConfig.url));
    if (url.protocol !== "https:") throw new Error("The Supabase URL must use HTTPS.");
    projectUrl = url.href.replace(/\/+$/, "");
  } catch (error) {
    console.error("Invalid Supabase project URL.", error);
    loginButton.disabled = true;
    loginStatus.textContent = "Sign-in is currently unavailable. Please contact the site administrator.";
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    loginButton.disabled = true;
    loginStatus.textContent = "Signing in...";

    try {
      const formData = new FormData(loginForm);
      const response = await requestJson("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password")
        }
      });
      saveSession(createSession(response));
      loginForm.reset();
      showDashboard();
      await loadSubmissions();
    } catch (error) {
      console.error("BIWC admin sign-in failed.", error);
      clearSession();
      showLogin();
      loginStatus.textContent = "Sign-in failed. Check your email and password, or contact the site administrator.";
    } finally {
      loginButton.disabled = false;
    }
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      viewButtons.forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
      renderSubmissions();
    });
  });

  refreshButton.addEventListener("click", loadSubmissions);

  signOutButton.addEventListener("click", async () => {
    const session = readSession();
    clearSession();
    submissions = {};
    showLogin();
    loginStatus.textContent = "Signed out.";

    if (!session || !session.accessToken) return;
    try {
      await requestJson("/auth/v1/logout?scope=local", {
        method: "POST",
        accessToken: session.accessToken
      });
    } catch (error) {
      console.error("Unable to revoke the Supabase session.", error);
      loginStatus.textContent = "Signed out on this device, but we could not complete sign-out everywhere.";
    }
  });

  if (readSession()) {
    showDashboard();
    loadSubmissions();
  } else {
    showLogin();
  }
});
