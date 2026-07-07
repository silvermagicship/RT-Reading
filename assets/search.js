
(() => {
  const panel = document.querySelector("[data-search-panel]");
  const resultBox = document.querySelector("[data-search-results]");
  const inputs = Array.from(document.querySelectorAll("[data-search-input]"));
  let indexPromise;

  const openPanel = () => {
    if (!panel) return;
    panel.hidden = false;
    const input = panel.querySelector("[data-search-input]");
    if (input) setTimeout(() => input.focus(), 20);
  };
  const closePanel = () => {
    if (panel) panel.hidden = true;
  };

  const indexUrl = (() => {
    const script = document.currentScript || document.querySelector('script[src$="search.js"]');
    return new URL("search-index.json", script ? script.src : `${location.origin}/assets/search.js`).toString();
  })();

  const loadIndex = () => {
    if (!indexPromise) {
      indexPromise = fetch(indexUrl).then((response) => response.json()).catch(() => []);
    }
    return indexPromise;
  };

  const renderResults = (records, query) => {
    if (!resultBox) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      resultBox.innerHTML = '<p class="muted">输入关键词后显示结果。</p>';
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const scored = records
      .map((record) => {
        const haystack = `${record.title} ${record.group} ${record.text}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (record.title.toLowerCase().includes(term)) score += 8;
          if (record.group.toLowerCase().includes(term)) score += 3;
          if (haystack.includes(term)) score += 1;
        }
        return { record, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
    if (!scored.length) {
      resultBox.innerHTML = '<p class="muted">没有找到匹配结果。</p>';
      return;
    }
    resultBox.innerHTML = scored.map(({ record }) => `
      <a class="search-result" href="${record.url}">
        <strong>${escapeHtml(record.title)}</strong>
        <span>${escapeHtml(record.group)}</span>
        <small>${escapeHtml(record.text)}</small>
      </a>
    `).join("");
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-search-open]");
    if (opener) {
      event.preventDefault();
      openPanel();
      const sourceInput = opener.closest("form")?.querySelector("[data-search-input]");
      if (sourceInput && sourceInput.value) {
        const panelInput = panel.querySelector("[data-search-input]");
        panelInput.value = sourceInput.value;
        loadIndex().then((records) => renderResults(records, panelInput.value));
      }
    }
    if (event.target.closest("[data-search-close]") || event.target === panel) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      loadIndex().then((records) => renderResults(records, input.value));
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        openPanel();
        const panelInput = panel.querySelector("[data-search-input]");
        panelInput.value = input.value;
        loadIndex().then((records) => renderResults(records, input.value));
      }
    });
  });
})();
