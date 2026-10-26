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
  setupAtmDemo(document.getElementById("atmDemo"));
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

  function setupAtmDemo(root) {
    if (!root) return;

    const out = root.querySelector("[data-out]");
    const formEl = root.querySelector("[data-form]");
    const input = root.querySelector("[data-input]");
    const keys = root.querySelector("[data-keys]");

    let hesap;
    let mode = "boot";
    let pending = 0;
    let started = false;

    function py(value) {
      if (typeof value === "string") return value;
      return Number.isInteger(value) ? value + ".0" : String(value);
    }

    function print(text, cls) {
      const line = document.createElement("span");
      if (cls) line.className = cls;
      line.textContent = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    function println(text, cls) {
      print((text || "") + "\n", cls);
    }

    function setKeys(list) {
      keys.innerHTML = "";
      list.forEach(([value, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = label ? "<b>" + value + "</b>" + label : value;
        button.addEventListener("click", () => submit(String(value)));
        keys.appendChild(button);
      });
    }

    function showMenu() {
      println("Merhaba, " + hesap.ad);
      println("1- Bakiye Sorgulama");
      println("2- Para Çekme");
      println("3- Para Yatırma");
      println("4- Çıkış Yap");
      print("Yapmak istediğiniz işlemi seçiniz: ", "acc");
      mode = "menu";
      input.setAttribute("inputmode", "numeric");
      setKeys([[1, "Bakiye"], [2, "Para çek"], [3, "Para yatır"], [4, "Çıkış"]]);
    }

    function askAmount(type) {
      print(type === "withdraw" ? "Çekmek istediğiniz miktarı giriniz: " : "Yatırmak istediğiniz miktarı giriniz: ", "acc");
      mode = type;
      setKeys(type === "withdraw"
        ? [["500"], ["5000"], ["22000"], ["30000"]]
        : [["1000"], ["3000"], ["10000"]]);
    }

    function boot() {
      out.innerHTML = "";
      hesap = { ad: "Fatih Güloğlu", bakiye: "20000", ekHesap: "3000", ekHesapLimiti: "5000" };
      setKeys([]);
      mode = "boot";
      const script = [
        ["$ python3 main.py\n", "dim"],
        ["Username: ", null],
        ["fatih\n", "usr"],
        ["Password: ", null],
        ["****\n", "usr"],
      ];
      let i = 0;
      const next = () => {
        if (i < script.length) {
          print(script[i][0], script[i][1]);
          i++;
          setTimeout(next, reduceMotion ? 0 : 260);
        } else {
          println();
          showMenu();
        }
      };
      next();
    }

    function bakiyeSorgulama() {
      println("Bakiye: " + py(hesap.bakiye) + " TL", "ok");
      println("Ek Bakiye: " + py(hesap.ekHesap) + " TL", "ok");
      println();
    }

    function paraCekme(miktar) {
      if (parseFloat(hesap.bakiye) >= miktar) {
        hesap.bakiye = parseFloat(hesap.bakiye) - miktar;
        println("Paranızı alabilirsiniz.", "ok");
        println();
        return true;
      }
      const toplam = parseFloat(hesap.bakiye) + parseFloat(hesap.ekHesap);
      if (toplam >= miktar) {
        pending = miktar;
        print("Ek hesap kullanılsın mı? (e/h): ", "acc");
        mode = "overdraft";
        input.setAttribute("inputmode", "text");
        setKeys([["e", " evet"], ["h", " hayır"]]);
        return false;
      }
      println("Yetersiz bakiye.", "err");
      println();
      return true;
    }

    function paraYatirma(miktar) {
      const limit = parseFloat(hesap.ekHesapLimiti);
      const mevcut = parseFloat(hesap.ekHesap);
      if (mevcut < limit) {
        const eksik = limit - mevcut;
        if (miktar >= eksik) {
          hesap.ekHesap = limit;
          hesap.bakiye = parseFloat(hesap.bakiye) + (miktar - eksik);
          println(py(eksik) + " TL ek hesaba yatırıldı, kalan " + py(miktar - eksik) + " TL ana bakiyeye eklendi.", "ok");
        } else {
          hesap.ekHesap = mevcut + miktar;
          println("Tüm para (" + py(miktar) + " TL) ek hesaba yatırıldı.", "ok");
        }
      } else {
        hesap.bakiye = parseFloat(hesap.bakiye) + miktar;
        println(py(miktar) + " TL ana bakiyeye yatırıldı.", "ok");
      }
      println("Güncel bakiye: " + py(hesap.bakiye) + " TL");
      println("Güncel ek hesap: " + py(hesap.ekHesap) + " TL");
      println();
    }

    function submit(raw) {
      const value = raw.trim();
      if (mode === "boot" || mode === "end") return;
      println(value, "usr");

      if (mode === "menu") {
        println();
        if (value === "1") bakiyeSorgulama();
        else if (value === "2") return askAmount("withdraw");
        else if (value === "3") return askAmount("deposit");
        else if (value === "4") {
          println("Çıkış yapılıyor...", "dim");
          println();
          println("[Program sonlandı]", "dim");
          mode = "end";
          setKeys([]);
          const again = document.createElement("button");
          again.type = "button";
          again.textContent = "↻ Yeniden başlat";
          again.addEventListener("click", boot);
          keys.appendChild(again);
          return;
        } else {
          println("Yanlış işlem seçtiniz. Tekrardan deneyiniz.", "err");
        }
        println();
        return showMenu();
      }

      if (mode === "withdraw" || mode === "deposit") {
        const miktar = parseFloat(value.replace(",", "."));
        if (!isFinite(miktar) || miktar <= 0 || miktar > 1e9) {
          println("Lütfen geçerli bir miktar giriniz.", "err");
          return askAmount(mode);
        }
        if (mode === "withdraw") {
          if (!paraCekme(miktar)) return;
        } else {
          paraYatirma(miktar);
        }
        println();
        return showMenu();
      }

      if (mode === "overdraft") {
        if (value === "e") {
          const kullanilacak = pending - parseFloat(hesap.bakiye);
          hesap.bakiye = "0";
          hesap.ekHesap = parseFloat(hesap.ekHesap) - kullanilacak;
          println("Paranızı alabilirsiniz.", "ok");
        } else {
          println("Üzgünüz, bakiyeniz yetersiz.", "err");
        }
        println();
        println();
        input.setAttribute("inputmode", "numeric");
        return showMenu();
      }
    }

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;
      submit(input.value);
      input.value = "";
    });

    out.addEventListener("click", () => input.focus({ preventScroll: true }));

    whenVisible(root, () => {
      if (!started) {
        started = true;
        boot();
      }
    });
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
