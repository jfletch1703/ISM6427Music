// Velvet Keys — front end. All SunoAPI.org calls go through Netlify Functions under /api/*
// so the API key stays on the server.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#form");
  const goBtn = $("#go");
  const errEl = $("#error");
  const statusCard = $("#statusCard");
  const statusText = $("#statusText");
  const results = $("#results");
  const historyEl = $("#history");
  const tpl = $("#trackTpl");
  let mode = "simple";
  const FALLBACK_COVER = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#7a1f35'/><stop offset='1' stop-color='#c99a54'/></linearGradient></defs>" +
    "<rect width='120' height='120' fill='url(#g)'/><text x='60' y='76' font-size='44' text-anchor='middle' fill='#f5ebe0'>♪</text></svg>");

  const STATUS_LABELS = {
    PENDING: "Warming up the piano…",
    TEXT_SUCCESS: "Lyrics written — laying down the vocals…",
    FIRST_SUCCESS: "First take is ready! Finishing the second…",
    SUCCESS: "Done!",
  };

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok || data.error && !data.status) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- credits ----------
  async function loadCredits() {
    try {
      const { credits } = await api("/api/credits");
      $("#credits").textContent = `${credits} credits remaining`;
    } catch (e) {
      $("#credits").textContent = "Credits unavailable";
      $("#credits").title = e.message;
    }
  }

  // ---------- tabs ----------
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      mode = t.dataset.mode;
      document.querySelectorAll(".tab").forEach((x) => {
        x.classList.toggle("active", x === t);
        x.setAttribute("aria-selected", x === t);
      });
      document.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== mode));
    })
  );

  // ---------- history (localStorage) ----------
  const HKEY = "velvetkeys.history";
  const loadHist = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } };
  const saveHist = (h) => { try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 40))); } catch {} };
  function renderHistory() {
    const h = loadHist();
    historyEl.replaceChildren(...h.map(trackEl));
    $("#histEmpty").classList.toggle("hidden", h.length > 0);
  }
  function addToHistory(tracks) {
    const h = loadHist().filter((x) => !tracks.some((t) => t.id === x.id));
    saveHist([...tracks, ...h]);
    renderHistory();
  }
  $("#clearHist").addEventListener("click", () => {
    if (confirm("Clear your saved songs from this browser?")) { saveHist([]); renderHistory(); }
  });

  // ---------- track card ----------
  function fmt(sec) {
    if (!sec) return "";
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return ` · ${m}:${String(s).padStart(2, "0")}`;
  }
  function trackEl(t) {
    const el = tpl.content.firstElementChild.cloneNode(true);
    const img = $(".cover", el);
    img.src = t.imageUrl || FALLBACK_COVER;
    img.addEventListener("error", () => { if (img.src !== FALLBACK_COVER) img.src = FALLBACK_COVER; }, { once: true });
    $(".t-title", el).textContent = t.title || "Untitled";
    $(".t-tags", el).textContent = (t.tags || "").slice(0, 140) + fmt(t.duration);
    const audio = $("audio", el);
    audio.src = t.audioUrl || t.streamUrl || "";
    const dl = $(".dl", el);
    if (t.audioUrl) dl.href = t.audioUrl;
    else { dl.classList.add("disabled"); dl.textContent = "⬇ Download (finishing…)"; }
    const pre = $(".t-lyrics", el);
    const btn = $(".show-lyrics", el);
    if (t.lyrics) {
      pre.textContent = t.lyrics;
      btn.addEventListener("click", () => {
        pre.classList.toggle("hidden");
        btn.textContent = pre.classList.contains("hidden") ? "Lyrics" : "Hide lyrics";
      });
    } else btn.remove();
    return el;
  }

  // ---------- generate ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const payload = {
      vibe: form.vibe.value,
      description: mode === "simple" ? $("#description").value.trim() : "",
      title: mode === "custom" ? $("#title").value.trim() : "",
      lyrics: mode === "custom" ? $("#lyrics").value.trim() : "",
      vocalGender: $("#vocal").value,
      model: $("#model").value,
      extraStyle: $("#extraStyle").value.trim(),
      instrumental: $("#instrumental").checked,
    };
    if (!payload.instrumental && mode === "simple" && !payload.description) return (errEl.textContent = "Tell us what your song is about.");
    if (!payload.instrumental && mode === "custom" && !payload.lyrics) return (errEl.textContent = "Add your lyrics, or use the lyrics helper.");
    if (payload.instrumental && !payload.description && !payload.lyrics) payload.description = "Instrumental";

    goBtn.disabled = true;
    goBtn.textContent = "Composing…";
    statusCard.classList.remove("hidden");
    statusText.textContent = STATUS_LABELS.PENDING;
    results.replaceChildren();

    try {
      const { taskId } = await api("/api/generate", { method: "POST", body: JSON.stringify(payload) });
      if (!taskId) throw new Error("No task id returned.");
      await poll(taskId);
    } catch (err) {
      errEl.textContent = err.message;
      statusCard.classList.add("hidden");
    } finally {
      goBtn.disabled = false;
      goBtn.textContent = "Generate song";
      loadCredits();
    }
  });

  async function poll(taskId) {
    const started = Date.now();
    let shown = "";
    while (Date.now() - started < 8 * 60 * 1000) {
      await sleep(6000);
      let s;
      try { s = await api(`/api/status?taskId=${encodeURIComponent(taskId)}`); }
      catch (e) { statusText.textContent = "Still working… (" + e.message + ")"; continue; }

      if (s.failed) throw new Error(s.error || `Generation failed (${s.status}).`);
      statusText.textContent = STATUS_LABELS[s.status] || "Composing…";

      // Show streamable previews as soon as they appear.
      const key = s.tracks.map((t) => t.id + (t.audioUrl ? "1" : "0") + (t.streamUrl ? "1" : "0")).join();
      if (s.tracks.length && key !== shown) {
        shown = key;
        results.replaceChildren(...s.tracks.map(trackEl));
      }
      if (s.done) {
        statusCard.classList.add("hidden");
        results.replaceChildren(); // finished songs live in the library below
        addToHistory(s.tracks);
        historyEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    throw new Error("This is taking longer than usual. Check back in a minute — try again later.");
  }

  // ---------- lyrics helper ----------
  const dlg = $("#lyricsDlg");
  const out = $("#lyricsOut");
  $("#lyricsBtn").addEventListener("click", () => { out.replaceChildren(); dlg.showModal(); $("#lyricsIdea").focus(); });
  $("#lyricsGo").addEventListener("click", async () => {
    const idea = $("#lyricsIdea").value.trim();
    if (!idea) return ($("#lyricsIdea").focus());
    const btn = $("#lyricsGo");
    btn.disabled = true; btn.textContent = "Writing…";
    out.textContent = "Finding the words…";
    try {
      const { taskId } = await api("/api/lyrics", { method: "POST", body: JSON.stringify({ prompt: idea }) });
      const started = Date.now();
      let r;
      while (Date.now() - started < 3 * 60 * 1000) {
        await sleep(4000);
        r = await api(`/api/lyrics?taskId=${encodeURIComponent(taskId)}`);
        if (r.failed) throw new Error(r.error || "Lyrics generation failed.");
        if (r.done && r.lyrics.length) break;
      }
      if (!r || !r.lyrics.length) throw new Error("Lyrics took too long. Please try again.");
      out.replaceChildren(...r.lyrics.map((l, i) => {
        const wrap = document.createElement("div");
        const pre = document.createElement("pre");
        pre.textContent = l.text;
        const use = document.createElement("button");
        use.type = "button"; use.className = "link pick";
        use.textContent = `Use option ${i + 1}${l.title ? ` — “${l.title}”` : ""}`;
        use.addEventListener("click", () => {
          $("#lyrics").value = l.text;
          if (l.title && !$("#title").value) $("#title").value = l.title.slice(0, 80);
          dlg.close();
        });
        wrap.append(use, pre);
        return wrap;
      }));
    } catch (e) {
      out.textContent = e.message;
    } finally {
      btn.disabled = false; btn.textContent = "Write lyrics";
    }
  });

  renderHistory();
  loadCredits();
})();
