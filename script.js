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

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");
  const themeToggle = document.querySelector(".theme-toggle");
  const navigationLinks = document.querySelectorAll(".primary-nav a");
  const moreToggle = document.querySelector(".nav-more-toggle");
  const moreMenu = document.querySelector(".nav-more-menu");
  const moreLinks = moreMenu?.querySelectorAll("a") || [];
  const yearElement = document.querySelector("#current-year");
  const lightbox = document.querySelector(".lightbox");
  const lightboxImage = lightbox?.querySelector("img");
  const lightboxClose = lightbox?.querySelector(".lightbox-close");
  const heroSlides = document.querySelectorAll(".hero-slide");
  const heroSlideButtons = document.querySelectorAll(".hero-slide-button");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  if (heroSlides.length > 1) {
    let activeSlide = 0;
    let rotationTimer;
    let isPaused = reducedMotion;

    function showHeroSlide(index) {
      activeSlide = index;
      heroSlides.forEach((slide, slideIndex) => {
        slide.classList.toggle("is-active", slideIndex === activeSlide);
      });
      heroSlideButtons.forEach((button, buttonIndex) => {
        const isActive = buttonIndex === activeSlide;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function stopRotation() {
      window.clearInterval(rotationTimer);
      rotationTimer = undefined;
    }

    function startRotation() {
      stopRotation();
      if (isPaused) return;
      rotationTimer = window.setInterval(() => {
        showHeroSlide((activeSlide + 1) % heroSlides.length);
      }, 6000);
    }

    heroSlideButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const slideIndex = Number(button.dataset.heroSlide);
        if (Number.isInteger(slideIndex) && slideIndex >= 0 && slideIndex < heroSlides.length) {
          showHeroSlide(slideIndex);
          startRotation();
        }
      });
    });

    startRotation();
  }

  function closeMenu() {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  }

  function closeMoreMenu() {
    if (!moreToggle || !moreMenu) return;
    moreToggle.setAttribute("aria-expanded", "false");
    moreMenu.hidden = true;
  }

  moreToggle?.addEventListener("click", () => {
    if (!moreMenu) return;
    const isExpanded = moreToggle.getAttribute("aria-expanded") === "true";
    moreToggle.setAttribute("aria-expanded", String(!isExpanded));
    moreMenu.hidden = isExpanded;
  });

  menuToggle?.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
    navigation?.classList.toggle("is-open", !isExpanded);
    document.body.classList.toggle("menu-open", !isExpanded);
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 851px)").matches) closeMenu();
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMoreMenu();
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      closeMoreMenu();
      closeLightbox();
    }
  });

  document.addEventListener("click", (event) => {
    if (moreMenu && moreToggle && !moreMenu.contains(event.target) && !moreToggle.contains(event.target)) {
      closeMoreMenu();
    }
    if (!navigation || !menuToggle || !navigation.classList.contains("is-open")) return;
    if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });

  const sections = document.querySelectorAll("main section[id]");
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach((link) => {
          if (!link.classList.contains("nav-link")) return;
          const active = link.getAttribute("href") === `#${entry.target.id}`
            || (entry.target.id === "welcome" && link.getAttribute("href") === "#home");
          link.classList.toggle("active", active);
        });
        if (moreToggle) {
          moreToggle.classList.toggle("active", Array.from(moreLinks).some((link) => link.classList.contains("active")));
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      const fullImage = item.dataset.full;
      const image = item.querySelector("img");
      if (!lightbox || !lightboxImage || !fullImage) return;

      lightboxImage.src = fullImage;
      lightboxImage.alt = image?.alt || "Church gallery photograph";

      if (typeof lightbox.showModal === "function") {
        lightbox.showModal();
      } else {
        window.open(fullImage, "_blank", "noopener,noreferrer");
      }
    });
  });

  function closeLightbox() {
    if (lightbox?.open) lightbox.close();
  }

  lightboxClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox?.addEventListener("close", () => {
    lightboxImage?.removeAttribute("src");
  });

  const supabaseSettings = window.BIWC_SUPABASE_CONFIG || {};
  const hasSupabaseSettings = Boolean(supabaseSettings.url || supabaseSettings.anonKey);
  const supabaseReady = Boolean(supabaseSettings.url && supabaseSettings.anonKey);
  const submissionStates = new WeakMap();

  document.querySelectorAll("form[data-netlify='true']").forEach((form) => {
    const status = form.querySelector(".form-status");

    if (hasSupabaseSettings && !supabaseReady && status) {
      status.textContent = "Supabase is not fully configured. This form will use Netlify only.";
    }

    if (!supabaseReady) {
      form.addEventListener("submit", (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          form.reportValidity();
          return;
        }

        if (status) {
          status.textContent = "Submitting through Netlify...";
        }
      });
      return;
    }

    const supabaseUrl = String(supabaseSettings.url).replace(/\/+$/, "");
    const supabaseKey = String(supabaseSettings.anonKey);
    const tableByForm = {
      "contact-biwc": "contact_submissions",
      "prayer-request": "prayer_requests",
      newsletter: "newsletter_subscriptions"
    };
    const formName = form.getAttribute("name");
    const table = tableByForm[formName];

    if (!table) return;

    submissionStates.set(form, { netlifySubmitted: false, supabaseSubmitted: false, submitting: false });

    form.addEventListener("submit", async (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
        return;
      }

      event.preventDefault();
      const state = submissionStates.get(form);
      if (!state || state.submitting) return;
      state.submitting = true;

      const submitButton = form.querySelector("[type='submit']");
      if (submitButton) submitButton.disabled = true;

      if (status) {
        status.textContent = "Submitting to BIWC...";
      }

      try {
        const formData = new FormData(form);
        const isSpam = Boolean(formData.get("bot-field"));
        let supabaseFailed = false;
        let netlifyFailed = false;

        if (!state.supabaseSubmitted && !isSpam) {
          try {
            const payload = Object.fromEntries(formData.entries());
            delete payload["form-name"];
            delete payload["bot-field"];
            delete payload["privacy-consent"];

            if (formName === "prayer-request") {
              payload.privacy_consent = formData.get("privacy-consent") === "accepted";
            }

            const email = formData.get("email");
            if (email === "") payload.email = null;

            const projectUrl = new URL(supabaseUrl);
            if (projectUrl.protocol !== "https:") {
              throw new Error("Supabase submissions require an HTTPS project URL.");
            }

            const response = await fetch(`${projectUrl.href.replace(/\/+$/, "")}/rest/v1/${table}`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                "Content-Type": "application/json",
                Prefer: "return=minimal"
              },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              throw new Error(`Supabase submission failed with status ${response.status}.`);
            }
            state.supabaseSubmitted = true;
          } catch (error) {
            supabaseFailed = true;
            console.error("Unable to submit the form to Supabase.", error);
          }
        }

        if (!state.netlifySubmitted) {
          try {
            const action = new URL(form.getAttribute("action") || window.location.href, window.location.href);
            if (action.origin !== window.location.origin) {
              throw new Error("Netlify form action must use this website's origin.");
            }

            const response = await fetch(action.href, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(formData).toString()
            });
            if (!response.ok) {
              throw new Error(`Netlify form submission failed with status ${response.status}.`);
            }
            state.netlifySubmitted = true;
          } catch (error) {
            netlifyFailed = true;
            console.error("Unable to submit the form to Netlify.", error);
          }
        }

        if (supabaseFailed || netlifyFailed) {
          if (status) {
            const completed = [];
            const failed = [];
            if (state.netlifySubmitted) completed.push("Netlify received it");
            else if (netlifyFailed) failed.push("Netlify did not receive it");
            if (state.supabaseSubmitted) completed.push("Supabase saved it");
            else if (supabaseFailed) failed.push("Supabase did not save it");
            status.textContent = `${completed.join(" and ")}${completed.length ? ". " : ""}${failed.join(" and ")}. Please submit again to retry.`;
          }
          return;
        }

        window.location.assign(form.getAttribute("action") || "thank-you.html");
      } finally {
        state.submitting = false;
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
});
