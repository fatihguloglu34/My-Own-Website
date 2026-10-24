(function () {
  const root = document.documentElement;
  const el = (id) => document.getElementById(id);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js");

  buildAnimatedName();
  startTypingRoles();
  buildSkillMarquee();
  setupScrollReveal();
  setupScrollProgress();
  setupPhotoTilt();
  setupCardGlow();
  setupExcelDemo();
  setupGridBackground();
  setupThemeToggle();

  function buildAnimatedName() {
    const nameEl = el("name");
    const words = ["Fatih", "Güloğlu"];
    let letterIndex = 0;

    words.forEach((word) => {
      const line = document.createElement("span");
      line.className = "w";
      line.setAttribute("aria-hidden", "true");

      word.split("").forEach((char) => {
        const letter = document.createElement("span");
        letter.className = "l";
        letter.style.setProperty("--i", letterIndex++);
        letter.textContent = char;
        line.appendChild(letter);
      });

      nameEl.appendChild(line);
    });
  }

  function startTypingRoles() {
    const roles = [
      "Yazılım geliştirici",
      "Python ile veri otomasyonu",
      "Veri mühendisliği yolunda",
    ];
    const target = el("typed");
    let roleIndex = 0;
    let charCount = 0;
    let deleting = false;

    function step() {
      const role = roles[roleIndex];

      if (reduceMotion) {
        target.textContent = role;
        return;
      }

      target.textContent = role.slice(0, charCount);

      if (!deleting && charCount < role.length) {
        charCount++;
        setTimeout(step, 70);
      } else if (!deleting) {
        deleting = true;
        setTimeout(step, 1500);
      } else if (charCount > 0) {
        charCount--;
        setTimeout(step, 35);
      } else {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        setTimeout(step, 300);
      }
    }

    step();
  }

  function buildSkillMarquee() {
    const skills = ["Python", "C", "JavaScript", "SQL", "PostgreSQL", "Git", "Linux", "HTML", "CSS", "Excel otomasyonu"];
    let html = "";

    for (let i = 0; i < 4; i++) {
      skills.forEach((skill) => {
        html += "<span>" + skill + "</span>";
      });
    }

    el("mq").innerHTML = html;
  }

  function setupScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".rv").forEach((section) => observer.observe(section));
  }

  function setupScrollProgress() {
    const bar = el("bar");

    window.addEventListener(
      "scroll",
      () => {
        const maxScroll = root.scrollHeight - window.innerHeight;
        const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
        bar.style.width = percent + "%";
      },
      { passive: true }
    );
  }

  function setupPhotoTilt() {
    if (reduceMotion) return;

    const holder = el("ph");
    const frame = el("fr");

    holder.addEventListener("pointermove", (e) => {
      const box = holder.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width - 0.5;
      const y = (e.clientY - box.top) / box.height - 0.5;
      frame.style.transform = "rotateY(" + x * 14 + "deg) rotateX(" + -y * 14 + "deg)";
    });

    holder.addEventListener("pointerleave", () => {
      frame.style.transform = "";
    });
  }

  function setupCardGlow() {
    document.querySelectorAll(".proj").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - box.left + "px");
        card.style.setProperty("--my", e.clientY - box.top + "px");
      });
    });
  }

  function setupExcelDemo() {
    const samples = [
      { km: "0+120", depth: "3.2", support: "A" },
      { km: "0+124", depth: "2.8", support: "B" },
      { km: "0+128", depth: "3.0", support: "A" },
      { km: "0+132", depth: "3.4", support: "C" },
    ];

    const rawBox = el("raw");
    const table = el("tbl");

    rawBox.innerHTML = samples
      .map((s) => "KM " + s.km + " | kazı " + s.depth + " m | destek " + s.support + "<br>")
      .join("");

    el("go").addEventListener("click", () => {
      table.innerHTML = "";

      const rows = [["KM", "Kazı (m)", "Destek"]].concat(
        samples.map((s) => [s.km, s.depth, s.support])
      );

      rows.forEach((cells, index) => {
        const row = document.createElement("div");
        row.innerHTML = cells.map((cell) => "<span>" + cell + "</span>").join("");
        table.appendChild(row);

        setTimeout(() => row.classList.add("in"), reduceMotion ? 0 : index * 350);
      });
    });
  }

  function setupGridBackground() {
    const canvas = el("grid");
    const ctx = canvas.getContext("2d");
    const CELL = 56;
    const litCells = new Map();
    let width;
    let height;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function draw() {
      const lineColor = getComputedStyle(root).getPropertyValue("--line");
      ctx.clearRect(0, 0, width, height);

      litCells.forEach((brightness, key) => {
        const [col, row] = key.split(",");
        ctx.fillStyle = "rgba(242,183,5," + brightness * 0.4 + ")";
        ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

        brightness -= 0.014;
        if (brightness <= 0) {
          litCells.delete(key);
        } else {
          litCells.set(key, brightness);
        }
      });

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += CELL) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += CELL) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      if (!reduceMotion) requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();

    if (!reduceMotion) {
      window.addEventListener("pointermove", (e) => {
        const key = Math.floor(e.clientX / CELL) + "," + Math.floor(e.clientY / CELL);
        litCells.set(key, 1);
      });
    }

    window.redrawGrid = draw;
  }

  function setupThemeToggle() {
    el("tg").addEventListener("click", () => {
      const chosen = root.getAttribute("data-theme");
      const isDark = chosen
        ? chosen === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;

      root.setAttribute("data-theme", isDark ? "light" : "dark");

      if (reduceMotion && window.redrawGrid) window.redrawGrid();
    });
  }
})();
