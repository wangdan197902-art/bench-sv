/* ============================================================
   search.js — lunr.js frontend logic for AI Benchmark Hub
   Loaded by layouts/partials/search-index.html on the search page.
   Fetches /<lang>/index.json, builds a lunr inverted index, and
   renders live results as the user types.
   ============================================================ */
(function () {
  "use strict";

  if (typeof window.lunr === "undefined") {
    console.error("[search] lunr.js not loaded; aborting.");
    return;
  }

  // ----- i18n strings (zh / fallback to en) -----
  var lang = (document.documentElement.lang || "en").slice(0, 2);
  var i18n = {
    zh: {
      loading: "正在加载搜索索引…",
      loaded: "索引已加载，共 {n} 个页面。",
      loadFailed: "索引加载失败：",
      empty: "请输入关键词进行搜索。",
      noResults: "未找到相关结果。",
      resultsCount: "找到 {n} 条结果：",
      searchError: "搜索出错："
    },
    en: {
      loading: "Loading search index…",
      loaded: "Index loaded. {n} pages.",
      loadFailed: "Failed to load index: ",
      empty: "Type to search.",
      noResults: "No results found.",
      resultsCount: "{n} results found:",
      searchError: "Search error: "
    }
  };
  var t = i18n[lang] || i18n.en;

  // ----- DOM refs -----
  var input = document.getElementById("search-input");
  var statusEl = document.getElementById("search-status");
  var resultsEl = document.getElementById("search-results");
  if (!input || !statusEl || !resultsEl) {
    return;
  }

  // ----- State -----
  var lunrIndex = null;
  var documents = [];
  var indexUrl = "/" + lang + "/index.json";

  function fmt(str, n) {
    return str.replace("{n}", String(n));
  }

  function escapeHtml(text) {
    if (!text) return "";
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function makeSnippet(text, maxLen) {
    if (!text) return "";
    text = text.replace(/\s+/g, " ").trim();
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  }

  // ----- Index loading -----
  function loadIndex() {
    statusEl.textContent = t.loading;
    fetch(indexUrl, { credentials: "same-origin" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        documents = data || [];
        lunrIndex = window.lunr(function () {
          this.field("title", { boost: 10 });
          this.field("keywords", { boost: 5 });
          this.field("summary", { boost: 3 });
          this.field("content");
          this.ref("url");
          documents.forEach(function (doc) {
            this.add(doc);
          }, this);
        });
        statusEl.textContent = fmt(t.loaded, documents.length);
      })
      .catch(function (err) {
        statusEl.textContent = t.loadFailed + err.message;
      });
  }

  // ----- Search & render -----
  function search(query) {
    if (!lunrIndex) return;
    query = (query || "").trim();
    if (!query) {
      resultsEl.innerHTML = "";
      statusEl.textContent = t.empty;
      return;
    }
    var results;
    try {
      results = lunrIndex.search(query);
    } catch (err) {
      resultsEl.innerHTML = "<p class=\"search-error\">" + escapeHtml(t.searchError + err.message) + "</p>";
      return;
    }
    if (results.length === 0) {
      resultsEl.innerHTML = "<p class=\"search-empty\">" + escapeHtml(t.noResults) + "</p>";
      statusEl.textContent = fmt(t.resultsCount, 0);
      return;
    }
    statusEl.textContent = fmt(t.resultsCount, results.length);

    var html = "<ul class=\"search-results-list\">";
    results.slice(0, 30).forEach(function (r) {
      var doc = null;
      for (var i = 0; i < documents.length; i++) {
        if (documents[i].url === r.ref) { doc = documents[i]; break; }
      }
      if (!doc) return;
      var snippet = makeSnippet(doc.summary || doc.content || "", 160);
      html += "<li class=\"search-result-item\">";
      html += "<a href=\"" + escapeHtml(doc.url) + "\" class=\"search-result-title\">" + escapeHtml(doc.title) + "</a>";
      if (snippet) {
        html += "<p class=\"search-result-snippet\">" + escapeHtml(snippet) + "</p>";
      }
      html += "<span class=\"search-result-url\">" + escapeHtml(doc.url) + "</span>";
      html += "</li>";
    });
    html += "</ul>";
    resultsEl.innerHTML = html;
  }

  // ----- Debounced input handler -----
  var debounceTimer = null;
  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      search(input.value);
    }, 180);
  });

  // ----- Initial load -----
  loadIndex();
})();
