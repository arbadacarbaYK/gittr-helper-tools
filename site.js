(function () {
  const toast = document.getElementById("toast");

  function flash(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1600);
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const id = btn.getAttribute("data-copy");
      const block = id ? document.getElementById(id) : null;
      const text = block ? block.innerText : "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add("copied");
        btn.textContent = "Copied";
        flash("Snippet copied — go build something weird.");
        window.setTimeout(function () {
          btn.classList.remove("copied");
          btn.textContent = "Copy";
        }, 1400);
      } catch (_err) {
        flash("Clipboard blocked — select the snippet instead.");
      }
    });
  });

  const cards = Array.from(document.querySelectorAll(".card[data-tags]"));
  const filters = Array.from(document.querySelectorAll(".filter"));
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      const tag = btn.getAttribute("data-filter") || "all";
      cards.forEach(function (card) {
        const tags = (card.getAttribute("data-tags") || "").split(/\s+/);
        card.hidden = tag !== "all" && tags.indexOf(tag) === -1;
      });
    });
  });

  document.querySelectorAll(".kind[data-jump]").forEach(function (el) {
    el.addEventListener("click", function () {
      const target = document.querySelector(el.getAttribute("data-jump"));
      if (!target) return;
      if (target.hidden) {
        const all = document.querySelector('.filter[data-filter="all"]');
        if (all) all.click();
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    document.addEventListener(
      "pointermove",
      function (e) {
        document.documentElement.style.setProperty("--mx", e.clientX + "px");
        document.documentElement.style.setProperty("--my", e.clientY + "px");
      },
      { passive: true }
    );
  }
})();
