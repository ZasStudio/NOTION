/* ==========================================================================
   Gráficas en SVG (analíticas de página y vistas de base de datos)
   Paleta categórica validada para visión normal y daltonismo en ambos temas.
   ========================================================================== */
const Charts = (() => {
  // Slot 1 de la paleta categórica; una sola serie no necesita leyenda,
  // el eje ya identifica cada barra.
  const SERIES = { light: "#2a78d6", dark: "#3987e5" };
  const isDark = () => document.documentElement.dataset.theme === "dark";
  const series = () => (isDark() ? SERIES.dark : SERIES.light);

  const nice = (max) => {
    if (max <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / pow) * pow;
  };

  const fmt = (n) =>
    Math.abs(n) >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k" : String(Math.round(n * 100) / 100);

  /**
   * Gráfica de barras verticales.
   * data: [{label, value, sub}]
   */
  function bars(data, { height = 200, valueLabels = true, unit = "" } = {}) {
    const wrap = U.el("div", { class: "chart" });
    if (!data.length) {
      wrap.append(U.el("div", { class: "chart-empty", text: "Sin datos que mostrar" }));
      return wrap;
    }

    const padT = 18, padB = 34, padL = 38, padR = 10;
    const w = Math.max(420, data.length * 62 + padL + padR);
    const h = height;
    const plotH = h - padT - padB;
    const max = nice(Math.max(...data.map((d) => d.value), 1));
    const bw = Math.min(46, (w - padL - padR) / data.length - 10);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.setAttribute("class", "chart-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet");

    const ns = (tag, attrs, text) => {
      const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      if (text !== undefined) n.textContent = text;
      return n;
    };

    // Rejilla discreta y escala
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH * i) / 4;
      svg.append(ns("line", { x1: padL, x2: w - padR, y1: y, y2: y, class: "chart-grid" }));
      svg.append(
        ns("text", { x: padL - 8, y: y + 4, class: "chart-tick", "text-anchor": "end" },
          fmt(max - (max * i) / 4))
      );
    }

    const tip = U.el("div", { class: "chart-tip" });

    data.forEach((d, i) => {
      const bh = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotH);
      const x = padL + i * ((w - padL - padR) / data.length) + ((w - padL - padR) / data.length - bw) / 2;
      const y = padT + plotH - bh;

      // Extremo redondeado 4px anclado a la línea base
      const r = Math.min(4, bh);
      const path = ns("path", {
        d: `M${x},${y + bh} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${y + bh} Z`,
        fill: series(),
        class: "chart-bar",
      });
      path.addEventListener("mousemove", (e) => {
        tip.textContent = `${d.label}: ${fmt(d.value)}${unit}` + (d.sub ? ` · ${d.sub}` : "");
        tip.classList.add("is-on");
        const box = wrap.getBoundingClientRect();
        tip.style.left = e.clientX - box.left + "px";
        tip.style.top = e.clientY - box.top - 34 + "px";
      });
      path.addEventListener("mouseleave", () => tip.classList.remove("is-on"));
      svg.append(path);

      if (valueLabels && d.value > 0)
        svg.append(ns("text", { x: x + bw / 2, y: y - 6, class: "chart-value", "text-anchor": "middle" }, fmt(d.value)));

      svg.append(
        ns("text", { x: x + bw / 2, y: h - 12, class: "chart-tick", "text-anchor": "middle" },
          d.label.length > 9 ? d.label.slice(0, 8) + "…" : d.label)
      );
    });

    // Línea base
    svg.append(ns("line", { x1: padL, x2: w - padR, y1: padT + plotH, y2: padT + plotH, class: "chart-axis" }));

    wrap.append(U.el("div", { class: "chart-scroll" }, svg), tip);
    return wrap;
  }

  /** Tabla equivalente a la gráfica (accesibilidad y lectura exacta). */
  function table(data, { labelHead = "Categoría", valueHead = "Valor" } = {}) {
    return U.el(
      "table", { class: "chart-table" },
      U.el("thead", {}, U.el("tr", {},
        U.el("th", { text: labelHead }), U.el("th", { text: valueHead }))),
      U.el("tbody", {}, ...data.map((d) =>
        U.el("tr", {}, U.el("td", { text: d.label }), U.el("td", { text: fmt(d.value) }))))
    );
  }

  /** Tarjeta de cifra destacada. */
  const stat = (label, value, sub) =>
    U.el(
      "div", { class: "stat-tile" },
      U.el("div", { class: "stat-value", text: value }),
      U.el("div", { class: "stat-label", text: label }),
      sub ? U.el("div", { class: "stat-sub", text: sub }) : null
    );

  return { bars, table, stat, fmt };
})();
