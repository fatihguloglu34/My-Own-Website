(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function whenVisible(el, callback) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(el);
  }

  setupTunnelDemo(document.getElementById("tunnelDemo"));
  setupGiseDemo(document.getElementById("giseDemo"));
  setupPushSwapDemo(document.getElementById("psDemo"));
  setupDgsPreview(document.getElementById("dgsDemo"));

  function setupTunnelDemo(root) {
    if (!root) return;

    const E_MODULUS = {
      TS500: { C25: 30000000, C30: 32000000, C35: 33000000, C40: 34000000, C45: 36000000, C50: 37000000 },
      EUROCODE: { C25: 31000000, C30: 33000000, C35: 35000000, C40: 35000000, C45: 36000000, C50: 37000000 },
    };
    const COLS = ["A", "B", "C", "D", "E", "F"];
    const ROWS = 16;
    const defaults = [[40, 50], [45, 55], [40, 50], [45, 55]];

    const form = root.querySelector("form");
    const thickWrap = root.querySelector("[data-thick]");
    const countOut = root.querySelector("[data-count-out]");
    const grid = root.querySelector("[data-grid]");
    const sel = root.querySelector("[data-sel]");
    const fileName = root.querySelector("[data-file]");
    const cellName = root.querySelector("[data-cellname]");
    const cellValue = root.querySelector("[data-cellvalue]");
    const toast = root.querySelector("[data-toast]");
    const hint = root.querySelector("[data-hint]");
    const stepButtons = root.querySelectorAll("[data-step]");

    let count = 2;
    let values = defaults.map((pair) => pair.slice());
    let timers = [];

    function renderInputs() {
      thickWrap.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const row = document.createElement("div");
        row.className = "thick-row";
        row.innerHTML =
          "<span>" + (i + 1) + ".</span>" +
          '<input type="number" inputmode="numeric" min="1" max="999" value="' + values[i][0] + '" aria-label="' + (i + 1) + '. tünel kemer kalınlığı (cm)" data-i="' + i + '" data-k="0">' +
          '<input type="number" inputmode="numeric" min="1" max="999" value="' + values[i][1] + '" aria-label="' + (i + 1) + '. tünel invert kalınlığı (cm)" data-i="' + i + '" data-k="1">';
        thickWrap.appendChild(row);
      }
      countOut.textContent = count;
      stepButtons[0].disabled = count <= 1;
      stepButtons[1].disabled = count >= 4;
      fileName.textContent = "exact_replication" + count + ".xlsx";
    }

    thickWrap.addEventListener("input", (e) => {
      const input = e.target;
      if (!input.dataset.i) return;
      values[+input.dataset.i][+input.dataset.k] = input.value;
    });

    stepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        count = Math.min(4, Math.max(1, count + Number(button.dataset.step)));
        renderInputs();
        renderSheet([], false);
      });
    });

    function buildRows() {
      const reg = form.querySelector("input[name=reg]:checked").value;
      const cls = form.querySelector("select").value;
      const fck = parseInt(cls.replace(/\D/g, ""), 10);
      const e = E_MODULUS[reg][cls];

      const rows = [];
      rows.push([{ t: "MALZEME TANIMI", span: 6, c: "hdr" }]);
      rows.push(["YÖNETMELİK", "BETON SINIFI", "FCK", "Poisson", "TERMAL", "E"].map((t) => ({ t, c: "sub" })));
      rows.push([{ t: reg }, { t: cls }, { t: fck, c: "num" }, { t: "0.2", c: "num" }, { t: "0.00001", c: "num" }, { t: e, c: "num" }]);
      rows.push([]);
      rows.push([{ t: "KESİT KALINLIKLARI (cm)", span: 2, c: "hdr" }]);
      for (let i = 0; i < count; i++) {
        rows.push([{ t: i + 1 + ". Tünel Kemer", c: "sub" }, { t: values[i][0], c: "num" }]);
        rows.push([{ t: i + 1 + ". Tünel İnvert", c: "sub" }, { t: values[i][1], c: "num" }]);
      }
      rows.push([]);
      rows.push([{ t: "1. TÜNEL ZEMİN YÜKLERİ", span: 6, c: "hdr" }]);
      rows.push(["Φ'", "m", "b", "B", "f", "h"].map((t) => ({ t, c: "sub" })));
      rows.push([{ t: "" }, { t: "" }, { t: "" }, { t: "" }, { t: "", c: "ylw" }, { t: "", c: "ylw" }]);
      return rows;
    }

    function renderSheet(rows, animate) {
      timers.forEach(clearTimeout);
      timers = [];
      toast.classList.remove("is-on");
      sel.classList.remove("is-on");
      hint.classList.toggle("is-off", rows.length > 0);

      let html = '<span class="h"></span>' + COLS.map((c) => '<span class="h">' + c + "</span>").join("");
      const cells = [];

      for (let r = 0; r < ROWS; r++) {
        html += '<span class="h">' + (r + 1) + "</span>";
        const row = rows[r] || [];
        let col = 0;
        row.forEach((cell) => {
          const span = cell.span || 1;
          const id = COLS[col] + (r + 1);
          const style = span > 1 ? ' style="grid-column: span ' + span + '"' : "";
          html += '<span class="' + (cell.c || "") + '" data-cell="' + id + '"' + style + "></span>";
          if (cell.t !== "" || cell.c === "ylw") cells.push({ id, text: String(cell.t), r, col, span });
          col += span;
        });
        for (; col < COLS.length; col++) html += "<span></span>";
      }
      grid.innerHTML = html;

      if (!rows.length) {
        cellName.textContent = "A1";
        cellValue.textContent = "";
        return;
      }

      const step = animate && !reduceMotion ? 55 : 0;
      cells.forEach((cell, i) => {
        const write = () => {
          const el = grid.querySelector('[data-cell="' + cell.id + '"]');
          el.textContent = cell.text;
          if (step) {
            el.classList.add("new");
            moveSelection(el, cell);
          }
        };
        if (step) timers.push(setTimeout(write, i * step));
        else write();
      });

      timers.push(setTimeout(() => {
        sel.classList.remove("is-on");
        toast.innerHTML = '<b>✓</b> ' + fileName.textContent + " kaydedildi · " + cells.length + " hücre yazıldı";
        toast.classList.add("is-on");
      }, cells.length * step + 300));
    }

    function moveSelection(el, cell) {
      sel.style.width = el.offsetWidth + 1 + "px";
      sel.style.height = el.offsetHeight + 1 + "px";
      sel.style.transform = "translate(" + (el.offsetLeft - 1) + "px," + (el.offsetTop - 1) + "px)";
      sel.classList.add("is-on");
      cellName.textContent = cell.id;
      cellValue.textContent = cell.text;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      renderSheet(buildRows(), true);
    });

    form.addEventListener("change", (e) => {
      if (e.target.name === "reg" || e.target.name === "cls") renderSheet([], false);
    });

    renderInputs();
    renderSheet([], false);
  }

  function setupGiseDemo(root) {
    if (!root) return;

    const out = root.querySelector("[data-out]");
    const map = root.querySelector("[data-map]");
    const okEl = root.querySelector("[data-ok]");
    const conflictEl = root.querySelector("[data-conflict]");
    const buttons = root.querySelectorAll("[data-run]");
    const nodes = {};
    root.querySelectorAll("[data-node]").forEach((node) => { nodes[node.dataset.node] = node; });

    const ROWS = "ABCDEF";
    const COLS = 12;
    const seats = [];
    let running = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));
    const hex = (n) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");

    function say(...parts) {
      const row = document.createElement("div");
      parts.forEach((part) => {
        const span = document.createElement("span");
        if (Array.isArray(part)) {
          span.textContent = part[0];
          span.className = part[1];
        } else {
          span.textContent = part;
        }
        row.append(span);
      });
      out.append(row);
      out.scrollTop = out.scrollHeight;
    }

    function step(name, state) {
      nodes[name].className = state;
    }

    for (const row of ROWS) {
      for (let n = 1; n <= COLS; n++) {
        const el = document.createElement("i");
        el.dataset.id = `${row}-${n}`;
        seats.push(el);
        map.append(el);
      }
    }

    function resetMap() {
      seats.forEach((el) => { el.className = Math.random() < 0.3 ? "sold" : ""; });
      Object.keys(nodes).forEach((name) => step(name, ""));
      okEl.textContent = "0";
      conflictEl.textContent = "0";
      out.replaceChildren();
    }

    async function run(mode) {
      if (running) return;
      running = true;
      buttons.forEach((b) => { b.disabled = true; });
      resetMap();

      const free = seats.filter((el, i) => !el.classList.contains("sold") && i < COLS * 3);
      const seat = free[Math.floor(Math.random() * free.length)];
      const label = `VIP ${seat.dataset.id}`;
      const winner = 1 + Math.floor(Math.random() * 100);
      seat.classList.add("target");

      say(["$ ", "acc"], "make race");
      say(["100 kullanıcı", "usr"], ` aynı anda ${label} koltuğuna tıklıyor…`);
      await wait(700);

      step("api", "on");
      const winAt = Math.floor(Math.random() * 20);
      for (let i = 0; i < 100; i++) {
        if (i === winAt) {
          okEl.textContent = "1";
          seat.classList.add("mine");
        } else {
          conflictEl.textContent = String(i + (i > winAt ? 0 : 1));
          if (i < winAt) seat.classList.toggle("held");
        }
        if (i % 4 === 0) await wait(24);
      }
      seat.classList.remove("held");
      say(["POST /holds ×100", "usr"], ["  516 ms", "dim"]);
      say(["  201 ×1   ", "ok"], `kullanıcı #${winner} koltuğu 2 dk tuttu`);
      say(["  409 ×99  ", "err"], ["Lua script: hold:{etkinlik}:" + seat.dataset.id + " zaten dolu", "dim"]);
      await wait(900);

      say(["POST /orders ×20", "usr"], ["  Idempotency-Key: " + hex(8).toLowerCase() + "…", "dim"]);
      say(["  201 ×1 · 200 ×19  ", "ok"], ["çift tıklama tek sipariş oldu", "dim"]);
      step("api", "done");
      step("pg", "on");
      await wait(700);
      say(["BEGIN", "acc"], ["  UPDATE seats … WHERE status='available'", "dim"]);
      say(["      ", "dim"], ["INSERT orders, outbox(order.created)  ", "dim"], ["COMMIT", "acc"]);
      seat.className = "reserved";
      await wait(800);

      step("pg", "done");
      step("mq", "on");
      say(["relay", "usr"], "     → gise.events  order.created");
      await wait(800);
      step("mq", "done");
      step("pay", "on");

      if (mode === "fail") {
        await wait(700);
        step("pay", "err");
        say(["payments", "usr"], ["  ✗ banka işlemi onaylamadı", "err"], "  → payment.failed");
        await wait(800);
        seat.className = "freed";
        say(["telafi", "acc"], `    sipariş iptal, ${label} herkesin ekranında yeniden boş`);
        step("tix", "skip");
        step("mail", "on");
        await wait(700);
        say(["notify", "usr"], "    ✉ ödeme alınamadı e-postası gönderildi");
        step("mail", "done");
        say(["✓ Koltuk kaybolmadı, sipariş tutarlı kaldı", "ok"]);
      } else {
        await wait(700);
        say(["payments", "usr"], ["  ✗ sağlayıcı zaman aşımı", "err"], ["  → payments.retry (1 sn)", "dim"]);
        await wait(1100);
        say(["payments", "usr"], ["  ✓ onaylandı ", "ok"], ["PAY-" + hex(12), "dim"], ["  (inbox: tek sefer)", "dim"]);
        step("pay", "done");
        seat.className = "bought";
        step("tix", "on");
        await wait(800);
        say(["tickets", "usr"], ["   ✓ ", "ok"], `GS-${hex(8)}-${hex(12)}`);
        step("tix", "done");
        step("mail", "on");
        await wait(700);
        say(["notify", "usr"], "    ✉ bilet e-postayla gönderildi");
        step("mail", "done");
        say(["✓ Çift satış: 0 · Kayıp mesaj: 0", "ok"]);
      }

      running = false;
      buttons.forEach((b) => { b.disabled = false; });
    }

    buttons.forEach((button) => button.addEventListener("click", () => run(button.dataset.run)));
    resetMap();
    whenVisible(root, () => setTimeout(() => run("ok"), 400));
  }

  function setupPushSwapDemo(root) {
    if (!root) return;

    const stage = root.querySelector("[data-stage]");
    const colA = root.querySelector('[data-col="a"]');
    const colB = root.querySelector('[data-col="b"]');
    const runBtn = root.querySelector('[data-ps="run"]');
    const shuffleBtn = root.querySelector('[data-ps="shuffle"]');
    const nearlyBtn = root.querySelector('[data-ps="nearly"]');
    const stat = (name) => root.querySelector('[data-stat="' + name + '"]');
    const opLog = root.querySelector("[data-oplog]");

    const N = window.innerWidth < 760 ? 24 : 36;
    let a = [];
    let b = [];
    let bars = [];
    let running = false;
    let timer = 0;

    function disorder(arr) {
      let inv = 0;
      let pairs = 0;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          pairs++;
          if (arr[i] > arr[j]) inv++;
        }
      }
      return pairs ? inv / pairs : 0;
    }

    function chooseStrategy() {
      const picked = root.querySelector("input[name=ps-strategy]:checked").value;
      if (picked !== "adaptive") return picked;
      const d = disorder(a);
      if (d < 0.2) return "simple";
      if (d < 0.5) return "medium";
      return "complex";
    }

    const LABELS = { simple: "simple · O(n²)", medium: "medium · O(n√n)", complex: "complex · O(n log n)" };

    function createBars() {
      stage.querySelectorAll(".ps-bar").forEach((el) => el.remove());
      bars = [];
      for (let i = 0; i < N; i++) {
        const bar = document.createElement("span");
        bar.className = "ps-bar";
        const t = i / (N - 1);
        bar.style.background = "hsl(" + (178 - t * 132) + " 72% " + (46 + t * 6) + "%)";
        stage.appendChild(bar);
        bars.push(bar);
      }
    }

    function layout() {
      const stageBox = stage.getBoundingClientRect();
      const boxA = colA.getBoundingClientRect();
      const boxB = colB.getBoundingClientRect();
      const pad = 10;
      const rowH = (boxA.height - pad * 2) / N;
      const barH = Math.max(2, rowH - 2);

      const place = (stack, box) => {
        stack.forEach((value, depth) => {
          const bar = bars[value];
          const maxW = box.width - pad * 2;
          const w = maxW * (0.14 + 0.86 * (value + 1) / N);
          const x = box.left - stageBox.left + (box.width - w) / 2;
          const y = box.top - stageBox.top + pad + depth * rowH;
          bar.style.width = w + "px";
          bar.style.height = barH + "px";
          bar.style.transform = "translate(" + x + "px," + y + "px)";
        });
      };
      place(a, boxA);
      place(b, boxB);
    }

    function setInitial(arr) {
      stop();
      a = arr;
      b = [];
      layout();
      stat("disorder").textContent = disorder(a).toFixed(2);
      stat("strategy").textContent = LABELS[chooseStrategy()];
      stat("ops").textContent = "0";
      opLog.textContent = "";
    }

    function shuffled() {
      const arr = Array.from({ length: N }, (_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function nearlySorted() {
      const arr = Array.from({ length: N }, (_, i) => i);
      for (let k = 0; k < 4; k++) {
        const i = Math.floor(Math.random() * (N - 3));
        const j = i + 1 + Math.floor(Math.random() * 3);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function plan(strategy, start) {
      const A = start.slice();
      const B = [];
      const ops = [];
      const apply = (op) => {
        ops.push(op);
        if (op === "pb") B.unshift(A.shift());
        else if (op === "pa") A.unshift(B.shift());
        else if (op === "ra") A.push(A.shift());
        else if (op === "rb") B.push(B.shift());
        else if (op === "rra") A.unshift(A.pop());
        else if (op === "rrb") B.unshift(B.pop());
        else if (op === "sa") [A[0], A[1]] = [A[1], A[0]];
      };
      const toTop = (stack, value, rot, rrot) => {
        const pos = stack.indexOf(value);
        if (pos <= stack.length / 2) for (let i = 0; i < pos; i++) apply(rot);
        else for (let i = 0; i < stack.length - pos; i++) apply(rrot);
      };

      if (strategy === "simple") {
        while (A.length > 1) {
          const min = Math.min(...A);
          if (A[1] === min && A[0] === min + 1) apply("sa");
          toTop(A, min, "ra", "rra");
          if (isSorted(A)) break;
          apply("pb");
        }
        while (B.length) apply("pa");
      } else if (strategy === "medium") {
        const chunk = Math.max(2, Math.round(Math.sqrt(A.length)));
        let limit = chunk;
        let pushed = 0;
        const total = A.length;
        while (A.length) {
          if (A[0] < limit) {
            apply("pb");
            if (B[0] < limit - chunk / 2 && B.length > 1) apply("rb");
            pushed++;
            if (pushed === Math.min(limit, total)) limit += chunk;
          } else {
            apply("ra");
          }
        }
        while (B.length) {
          toTop(B, Math.max(...B), "rb", "rrb");
          apply("pa");
        }
      } else {
        const bits = Math.ceil(Math.log2(A.length));
        for (let bit = 0; bit < bits && !isSorted(A); bit++) {
          const size = A.length;
          for (let i = 0; i < size; i++) apply(((A[0] >> bit) & 1) === 0 ? "pb" : "ra");
          while (B.length) apply("pa");
        }
      }
      return ops;
    }

    function isSorted(arr) {
      for (let i = 1; i < arr.length; i++) if (arr[i - 1] > arr[i]) return false;
      return true;
    }

    function stop() {
      clearTimeout(timer);
      running = false;
      runBtn.querySelector("span").textContent = "Sırala";
      stage.style.setProperty("--ps-dur", "140ms");
    }

    function run() {
      if (running) return stop();
      if (isSorted(a) && !b.length) setInitial(shuffled());

      const strategy = chooseStrategy();
      const ops = plan(strategy, a);
      stat("strategy").textContent = LABELS[strategy];
      running = true;
      runBtn.querySelector("span").textContent = "Durdur";

      const counts = {};
      const interval = reduceMotion ? 0 : Math.max(12, Math.min(70, 9000 / ops.length));
      stage.style.setProperty("--ps-dur", Math.max(10, interval - 4) + "ms");
      let i = 0;
      const recent = [];

      const step = () => {
        if (!running) return;
        const batch = reduceMotion ? ops.length : 1;
        for (let k = 0; k < batch && i < ops.length; k++, i++) {
          const op = ops[i];
          if (op === "pb") b.unshift(a.shift());
          else if (op === "pa") a.unshift(b.shift());
          else if (op === "ra") a.push(a.shift());
          else if (op === "rb") b.push(b.shift());
          else if (op === "rra") a.unshift(a.pop());
          else if (op === "rrb") b.unshift(b.pop());
          else if (op === "sa") [a[0], a[1]] = [a[1], a[0]];
          counts[op] = (counts[op] || 0) + 1;
          recent.push(op);
        }
        while (recent.length > 18) recent.shift();
        layout();
        stat("ops").textContent = i;
        opLog.innerHTML = recent.map((op, idx) => idx === recent.length - 1 ? "<b>" + op + "</b>" : op).join(" ");

        if (i < ops.length) {
          timer = setTimeout(step, interval);
        } else {
          stop();
          stat("disorder").textContent = disorder(a).toFixed(2);
          opLog.innerHTML = Object.keys(counts).sort().map((op) => op + " <b>" + counts[op] + "</b>").join(" · ");
        }
      };
      step();
    }

    runBtn.addEventListener("click", run);
    shuffleBtn.addEventListener("click", () => setInitial(shuffled()));
    nearlyBtn.addEventListener("click", () => setInitial(nearlySorted()));
    root.addEventListener("change", (e) => {
      if (e.target.name === "ps-strategy" && !running) stat("strategy").textContent = LABELS[chooseStrategy()];
    });

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 120);
    });

    createBars();
    setInitial(shuffled());
    whenVisible(root, () => setTimeout(() => { if (!running) run(); }, 600));
  }

  function setupDgsPreview(root) {
    if (!root || reduceMotion) return;
    const view = root.querySelector(".browser-view");
    const page = root.querySelector("[data-dgs-page]");

    function measure() {
      root.style.setProperty("--dgs-shift", Math.min(0, view.clientHeight - page.scrollHeight) + "px");
    }

    measure();
    window.addEventListener("resize", measure);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => root.classList.toggle("is-playing", entry.isIntersecting));
    }, { threshold: 0.2 });
    observer.observe(root);
  }
})();
