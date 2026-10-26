(function () {
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  root.classList.add("ready");

  const scroll = { y: window.scrollY, last: window.scrollY, velocity: 0, dir: 1 };
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let lenis = null;

  setupSplitText();
  setupReveal();
  setupCounters();
  setupTyping();
  setupTheme();
  setupNav();
  setupMobileMenu();
  setupAnchors();
  setupGlow();
  setupMagnetic();
  setupCopy();

  const marquees = setupMarquees();
  const hero = setupHero();
  const stack = setupProjectStack();
  const timeline = setupTimeline();

  runLoader().then(() => {
    root.classList.add("intro");
    setupSmoothScroll();
  });

  requestAnimationFrame(loop);

  /* ---------------------------------------------------------
     Açılış ekranı
     --------------------------------------------------------- */
  function runLoader() {
    if (!root.classList.contains("is-loading")) return Promise.resolve();

    const num = $("#loaderNum");
    const line = $("#loaderLine");
    const minTime = 1300;
    const start = performance.now();
    let loaded = document.readyState === "complete";
    window.addEventListener("load", () => { loaded = true; }, { once: true });

    return new Promise((resolve) => {
      let value = 0;
      const tick = (now) => {
        const elapsed = now - start;
        const target = loaded || elapsed > 3500 ? 100 : Math.min(90, (elapsed / minTime) * 90);
        value = lerp(value, elapsed > minTime ? target : Math.min(target, (elapsed / minTime) * 100), 0.12);
        if (target === 100 && elapsed > minTime && value > 99.4) value = 100;
        num.textContent = Math.round(value);
        line.style.transform = "scaleX(" + value / 100 + ")";

        if (value >= 100) {
          try { sessionStorage.setItem("intro-seen", "1"); } catch (e) {}
          setTimeout(() => {
            root.classList.add("loader-exit");
            setTimeout(resolve, 350);
            setTimeout(() => root.classList.remove("is-loading", "loader-exit"), 1200);
          }, 180);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------------------------------------------------------
     Akıcı kaydırma (Lenis, CDN'den; yüklenemezse doğal kaydırma)
     --------------------------------------------------------- */
  function setupSmoothScroll() {
    if (reduceMotion || !finePointer) return;
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js";
    script.async = true;
    script.onload = () => {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: true });
    };
    document.head.appendChild(script);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------
     Tek animasyon döngüsü
     --------------------------------------------------------- */
  function loop(now) {
    scroll.y = window.scrollY;
    const delta = scroll.y - scroll.last;
    scroll.last = scroll.y;
    scroll.velocity = lerp(scroll.velocity, delta, 0.2);
    if (Math.abs(delta) > 0.5) scroll.dir = delta > 0 ? 1 : -1;

    marquees.update(now);
    hero.update();
    stack.update();
    timeline.update();
    updateProgress();
    updateNavVisibility(delta);
    updateTopo();

    requestAnimationFrame(loop);
  }

  function updateProgress() {
    const max = root.scrollHeight - window.innerHeight;
    $("#progress").style.setProperty("--p", max > 0 ? scroll.y / max : 0);
  }

  function updateTopo() {
    if (!window.Topo) return;
    window.Topo.setScroll(scroll.y);
  }

  /* ---------------------------------------------------------
     Hero: küre paralaksı, arka plan tepe noktası
     --------------------------------------------------------- */
  function setupHero() {
    const section = $(".hero");
    const stage = $(".hero-stage");
    const orb = $(".hero-orb");
    const orbit = $("#orbit");
    const contact = $("#iletisim");
    let mx = 0;
    let my = 0;

    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }, { passive: true });
    }

    return {
      update() {
        const vh = window.innerHeight;
        const heroRect = section.getBoundingClientRect();
        const heroVisible = clamp(heroRect.bottom / heroRect.height, 0, 1);

        if (!reduceMotion && heroRect.bottom > 0) {
          const tx = finePointer ? (pointer.x / window.innerWidth - 0.5) * 18 : 0;
          const ty = finePointer ? (pointer.y / vh - 0.5) * 8 : 0;
          mx = lerp(mx, tx, 0.06);
          my = lerp(my, ty, 0.06);
          stage.style.setProperty("--px", mx.toFixed(2) + "px");
          stage.style.setProperty("--py", (Math.max(0, -heroRect.top) * 0.28 + my).toFixed(2) + "px");
        }

        if (!window.Topo) return;

        const contactRect = contact.getBoundingClientRect();
        const contactVisible = clamp((vh - contactRect.top) / vh, 0, 1);

        if (contactVisible > 0.25 && heroVisible < 0.1) {
          const r = orbit.getBoundingClientRect();
          window.Topo.setPeak(r.left + r.width / 2, r.top + r.height / 2, contactVisible * 0.9);
        } else {
          const r = orb.getBoundingClientRect();
          window.Topo.setPeak(r.left + r.width / 2, r.top + r.height / 2, heroVisible * 0.7);
        }
        window.Topo.setAmp(0.42 + 0.58 * Math.max(heroVisible, contactVisible * 0.85));
      },
    };
  }

  /* ---------------------------------------------------------
     Kayan şeritler ve isim (kaydırma yönüne ve hızına tepki verir)
     --------------------------------------------------------- */
  function setupMarquees() {
    const groups = [];

    $$("[data-marquee]").forEach((track) => {
      groups.push({ els: [track], dir: Number(track.dataset.marquee) || -1, speed: Number(track.dataset.speed) || 60, x: 0 });
    });

    function fill(group) {
      const first = group.els[0];
      const units = Array.from(first.children);
      group.unitCount = units.length;
      // Ölçü: tek takımın genişliği
      group.unit = first.scrollWidth;
      if (!group.unit) return;
      const copies = Math.ceil((window.innerWidth * 2) / group.unit) + 1;
      group.els.forEach((el) => {
        const html = units.map((u) => u.outerHTML).join("");
        el.innerHTML = html.repeat(copies);
      });
      if (reduceMotion) {
        group.x = -group.unit * 0.25;
        group.els.forEach((el) => { el.style.transform = "translate3d(" + group.x + "px,0,0)"; });
      }
    }

    function refill() {
      groups.forEach((group) => {
        const first = group.els[0];
        const units = Array.from(first.children).slice(0, group.unitCount || first.children.length);
        group.els.forEach((el) => { el.innerHTML = units.map((u) => u.outerHTML).join(""); });
        fill(group);
      });
    }

    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(refill);
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refill, 200);
    });

    let last = performance.now();

    return {
      update(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (reduceMotion) return;
        const boost = Math.min(Math.abs(scroll.velocity) * 0.9, 40);
        groups.forEach((group) => {
          if (!group.unit) return;
          group.x += group.dir * scroll.dir * (group.speed * dt + boost);
          if (group.x <= -group.unit) group.x += group.unit;
          if (group.x > 0) group.x -= group.unit;
          const t = "translate3d(" + group.x.toFixed(2) + "px,0,0)";
          group.els.forEach((el) => { el.style.transform = t; });
        });
      },
    };
  }

  /* ---------------------------------------------------------
     Metin animasyonları
     --------------------------------------------------------- */
  function wrapWords(el, wordClass, innerClass) {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            const word = document.createElement("span");
            word.className = wordClass;
            if (innerClass) {
              const inner = document.createElement("span");
              inner.className = innerClass;
              inner.style.setProperty("--wi", index);
              inner.textContent = part;
              word.appendChild(inner);
            } else {
              word.textContent = part;
            }
            index++;
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  function setupSplitText() {
    if (reduceMotion) return;
    $$("[data-split]").forEach((el) => {
      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      wrapWords(el, "w", "wi");
      $$(".w", el).forEach((w) => w.setAttribute("aria-hidden", "true"));
    });
  }

  function setupReveal() {
    const items = $$("[data-reveal], [data-split]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }

    // Aynı ızgaradaki kartlara sıralı gecikme
    $$("[data-reveal]").forEach((el) => {
      if (el.style.getPropertyValue("--d")) return;
      const siblings = Array.from(el.parentElement.children).filter((c) => c.hasAttribute("data-reveal"));
      if (siblings.length > 1) el.style.setProperty("--d", siblings.indexOf(el) % 4);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });

    items.forEach((el) => observer.observe(el));
  }

  function setupCounters() {
    const items = $$("[data-count]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        if (reduceMotion) return;
        const start = performance.now();
        const duration = 1600;
        const tick = (now) => {
          const t = clamp((now - start) / duration, 0, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = "0";
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    items.forEach((el) => observer.observe(el));
  }

  function setupTyping() {
    const target = $("#typed");
    const roles = ["Yazılım geliştirici", "Python ile veri otomasyonu", "Veri mühendisliği yolunda", "42 İstanbul öğrencisi"];
    if (!target || reduceMotion) return;

    let roleIndex = 0;
    let charCount = roles[0].length;
    let deleting = true;

    function step() {
      const role = roles[roleIndex];
      target.textContent = role.slice(0, charCount);

      if (!deleting && charCount < role.length) {
        charCount++;
        setTimeout(step, 65);
      } else if (!deleting) {
        deleting = true;
        setTimeout(step, 2200);
      } else if (charCount > 0) {
        charCount--;
        setTimeout(step, 30);
      } else {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        setTimeout(step, 350);
      }
    }

    setTimeout(step, 3200);
  }

  function setupTheme() {
    const button = $("#themeBtn");
    const meta = $('meta[name="theme-color"]');

    const sync = () => {
      const dark = root.getAttribute("data-theme") !== "light";
      button.setAttribute("aria-label", dark ? "Açık temaya geç" : "Koyu temaya geç");
      if (meta) meta.setAttribute("content", dark ? "#071114" : "#f3efe6");
    };
    sync();

    const apply = (theme) => {
      root.setAttribute("data-theme", theme);
      sync();
      if (window.Topo) window.Topo.refreshColors();
    };

    button.addEventListener("click", (e) => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      try { localStorage.setItem("theme", next); } catch (err) {}

      if (!document.startViewTransition || reduceMotion) {
        apply(next);
        return;
      }

      const box = button.getBoundingClientRect();
      const x = e.clientX || box.left + box.width / 2;
      const y = e.clientY || box.top + box.height / 2;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(() => apply(next));
      transition.ready.then(() => {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
          { duration: 750, easing: "cubic-bezier(.76,0,.24,1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
    });

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
      let saved = null;
      try { saved = localStorage.getItem("theme"); } catch (err) {}
      if (!saved) apply(e.matches ? "light" : "dark");
    });
  }

  /* ---------------------------------------------------------
     Navigasyon
     --------------------------------------------------------- */
  function setupNav() {
    const links = $$(".nav-links a");
    const indicator = $(".nav-indicator");
    let active = null;

    const moveTo = (link) => {
      if (!link) {
        indicator.classList.remove("is-on");
        return;
      }
      indicator.style.width = link.offsetWidth + "px";
      indicator.style.transform = "translateX(" + link.offsetLeft + "px)";
      indicator.classList.add("is-on");
    };

    links.forEach((link) => {
      link.addEventListener("mouseenter", () => moveTo(link));
    });
    $(".nav-links").addEventListener("mouseleave", () => moveTo(active));

    const sections = links.map((link) => $(link.getAttribute("href"))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        active = links.find((link) => link.getAttribute("href") === "#" + entry.target.id) || null;
        if (active) active.setAttribute("aria-current", "true");
        moveTo(active);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));

    const heroObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        links.forEach((link) => link.removeAttribute("aria-current"));
        active = null;
        moveTo(null);
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    heroObserver.observe($(".hero"));
  }

  function updateNavVisibility(delta) {
    const nav = $("#nav");
    if (root.classList.contains("menu-open")) {
      nav.classList.remove("is-hidden");
      return;
    }
    if (scroll.y < 160 || delta < -4) nav.classList.remove("is-hidden");
    else if (delta > 6) nav.classList.add("is-hidden");
  }

  function setupMobileMenu() {
    const button = $("#menuBtn");
    const menu = $("#menu");

    const toggle = (open) => {
      root.classList.toggle("menu-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
      if (lenis) open ? lenis.stop() : lenis.start();
    };

    button.addEventListener("click", () => toggle(!root.classList.contains("menu-open")));
    $$("a", menu).forEach((link) => link.addEventListener("click", () => toggle(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("menu-open")) {
        toggle(false);
        button.focus();
      }
    });
  }

  function setupAnchors() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      const target = id === "#top" ? $(".hero") : id.length > 1 ? $(id) : null;
      if (!target) return;
      e.preventDefault();
      // Menü kapanırken kaydırmayı bir an beklet
      const delay = root.classList.contains("menu-open") ? 400 : 0;
      setTimeout(() => {
        scrollToTarget(target);
        if (id !== "#top") {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      }, delay);
    });
  }

  /* ---------------------------------------------------------
     Projeler: üst üste binen kartlar
     --------------------------------------------------------- */
  function setupProjectStack() {
    const cards = $$(".project");
    const query = window.matchMedia("(min-width: 1024px) and (min-height: 760px)");

    return {
      update() {
        if (!query.matches || reduceMotion) {
          cards.forEach((card) => {
            card.style.removeProperty("--s");
            card.style.removeProperty("--dim");
          });
          return;
        }
        const vh = window.innerHeight;
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          const stickTop = parseFloat(getComputedStyle(card).top) || 0;
          const nextTop = next.getBoundingClientRect().top;
          const p = clamp(1 - (nextTop - stickTop) / (vh - stickTop), 0, 1);
          card.style.setProperty("--s", (1 - p * 0.06).toFixed(4));
          card.style.setProperty("--dim", (p * 0.55).toFixed(3));
        });
      },
    };
  }

  function setupTimeline() {
    const wrap = $(".timeline");
    const fill = $(".timeline-fill");
    return {
      update() {
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = clamp((vh * 0.7 - rect.top) / rect.height, 0, 1);
        fill.style.setProperty("--tp", reduceMotion ? 1 : p.toFixed(3));
      },
    };
  }

  /* ---------------------------------------------------------
     Kart parlaması, mıknatıslı butonlar, özel imleç
     --------------------------------------------------------- */
  function setupGlow() {
    if (!finePointer) return;
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest("[data-glow]");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - rect.left + "px");
      card.style.setProperty("--my", e.clientY - rect.top + "px");
    }, { passive: true });
  }

  function setupMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$("[data-magnetic]").forEach((el) => {
      const strength = Number(el.dataset.magnetic) || 0.35;
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = "translate(" + x * strength + "px," + y * strength + "px)";
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  function setupCopy() {
    $$("[data-copy]").forEach((button) => {
      const label = $("[data-copy-label]", button);
      button.addEventListener("click", async () => {
        const text = button.dataset.copy;
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch (e) {
          const field = document.createElement("textarea");
          field.value = text;
          field.style.position = "fixed";
          field.style.opacity = "0";
          document.body.appendChild(field);
          field.select();
          try { ok = document.execCommand("copy"); } catch (err) {}
          field.remove();
        }
        if (!ok) return;
        button.classList.add("is-done");
        label.textContent = "Kopyalandı";
        setTimeout(() => {
          button.classList.remove("is-done");
          label.textContent = "Kopyala";
        }, 2200);
      });
    });
  }
})();
