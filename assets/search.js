
(() => {
  const indexUrl = (() => {
    const script = document.currentScript || document.querySelector('script[src*="search"]');
    return new URL("search-index.json", script ? script.src : `${location.origin}/assets/search.js`).toString();
  })();
  let indexPromise;
  const loadIndex = () => {
    if (!indexPromise) {
      indexPromise = fetch(indexUrl).then((response) => response.json()).catch(() => []);
    }
    return indexPromise;
  };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const renderResults = (records, query, resultBox) => {
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
      .slice(0, 80);
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
  const setupSearchPage = () => {
    const input = document.querySelector("[data-search-page-input]");
    const resultBox = document.querySelector("[data-search-results]");
    if (!input || !resultBox) return;
    const params = new URLSearchParams(location.search);
    const initial = params.get("q") || "";
    input.value = initial;
    loadIndex().then((records) => renderResults(records, initial, resultBox));
    input.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set("q", input.value.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
      loadIndex().then((records) => renderResults(records, input.value, resultBox));
    });
  };
  const setupReaderTypography = () => {
    const root = document.querySelector(".content");
    if (root && root.dataset.dialogueWrapped !== "1") {
      root.dataset.dialogueWrapped = "1";
      const walker = document.createTreeWalker(root, 4, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest(".en, .en-inline, .en-label, .zh-dialogue, script, style")) return 2;
          return /“[^”]+”/.test(node.nodeValue) ? 1 : 3;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const frag = document.createDocumentFragment();
        const parts = node.nodeValue.split(/(“[^”]+”)/g);
        for (const part of parts) {
          if (!part) continue;
          if (/^“[^”]+”$/.test(part)) {
            const span = document.createElement("span");
            span.className = "zh-dialogue";
            span.textContent = part;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
        }
        node.parentNode.replaceChild(frag, node);
      }
    }
  };
  const setupReaderSettings = () => {
    const font = document.querySelector("[data-setting-font]");
    const leading = document.querySelector("[data-setting-leading]");
    const night = document.querySelector("[data-setting-night]");
    const reset = document.querySelector("[data-setting-reset]");
    const key = "rt-reader-settings-v3";
    const defaults = { font: 100, leading: 192, night: false };
    const read = () => {
      try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; }
      catch { return { ...defaults }; }
    };
    const apply = (settings) => {
      document.documentElement.style.setProperty("--reader-scale", (settings.font / 100).toFixed(2));
      document.documentElement.style.setProperty("--reader-leading", (settings.leading / 100).toFixed(2));
      document.documentElement.classList.toggle("night-mode", Boolean(settings.night));
      if (font) font.value = String(settings.font);
      if (leading) leading.value = String(settings.leading);
      if (night) night.checked = Boolean(settings.night);
      localStorage.setItem(key, JSON.stringify(settings));
    };
    let current = read();
    apply(current);
    font?.addEventListener("input", () => { current = { ...current, font: Number(font.value) }; apply(current); });
    leading?.addEventListener("input", () => { current = { ...current, leading: Number(leading.value) }; apply(current); });
    night?.addEventListener("change", () => { current = { ...current, night: night.checked }; apply(current); });
    reset?.addEventListener("click", () => { current = { ...defaults }; apply(current); });
  };
  setupSearchPage();
  setupReaderTypography();
  setupReaderSettings();
})();
