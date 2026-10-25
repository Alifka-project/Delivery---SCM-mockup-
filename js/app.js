import { feed, hourly, network, shipments, sparks, warehouse } from "./data.js";
import { renderTower } from "./tower.js";

const stage = document.querySelector("#stage");
const liveRegion = document.querySelector("#live-region");

const state = {
  view: "dashboard",
  auto: true,
  updated: new Date(),
  filter: "all",
  query: "",
  sortKey: "rank",
  sortDir: 1,
  selected: shipments.find((item) => item.status === "in_progress").id,
  tower: "overview",
};

const statusCopy = {
  delivered: "Delivered",
  in_progress: "Out for delivery",
  pending: "At origin",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

const rank = {
  in_progress: 0,
  pending: 1,
  rescheduled: 2,
  cancelled: 3,
  delivered: 4,
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function formatNum(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPct(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function dubaiTime(date, withDate = false) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    second: withDate ? undefined : "2-digit",
    hour12: false,
    day: withDate ? "2-digit" : undefined,
    month: withDate ? "short" : undefined,
  }).format(date);
}

function clockNow() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function spark(values, color) {
  const width = 86;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / (max - min || 1)) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function metric(item) {
  return `<article class="metric ${item.span || ""}">
    <header><span>${esc(item.label)}</span>${item.spark || ""}</header>
    <strong class="metric-value ${item.tone || ""}">${esc(item.value)}</strong>
    <p>${esc(item.note)}</p>
  </article>`;
}

function head(kicker, title, deck) {
  return `<header class="stage-head">
    <div>
      <p class="kicker">${esc(kicker)}</p>
      <h1>${esc(title)}</h1>
      <p class="deck">${esc(deck)}</p>
    </div>
    <div class="clock-block">
      <div class="live"><i></i> Dubai GST</div>
      <div class="clock js-clock">${clockNow()}</div>
    </div>
  </header>`;
}

function arc(cx, cy, radius, start, end) {
  const point = (angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function orbitChart() {
  const slices = [
    { label: "Delivered", value: network.delivered, color: "#1c7a68" },
    { label: "Pending", value: network.pending, color: "#0766a3" },
    { label: "Rescheduled", value: network.rescheduled, color: "#7a62c4" },
    { label: "Cancelled", value: network.cancelled, color: "#d45386" },
  ];
  const radii = [92, 74, 56, 38];
  const start = -Math.PI / 2;
  const rings = slices.map((slice, index) => {
    const pct = Math.min(slice.value / network.total, 0.999);
    const end = start + Math.PI * 2 * pct;
    return `<circle cx="110" cy="110" r="${radii[index]}" fill="none" stroke="rgba(7,102,163,0.12)" stroke-width="8"/>
      <path d="${arc(110, 110, radii[index], start, end)}" fill="none" stroke="${slice.color}" stroke-width="8" stroke-linecap="round"/>`;
  }).join("");
  const legend = slices.map((slice) => `<div><i style="background:${slice.color}"></i><span>${esc(slice.label)}</span><b>${formatNum(slice.value)} · ${formatPct(slice.value, network.total)}</b></div>`).join("");
  return `<div class="orbit-wrap">
    <svg class="orbit" viewBox="0 0 220 220" role="img" aria-label="Status distribution">
      ${rings}
      <text x="110" y="104" text-anchor="middle" fill="#06253c" font-family="SULOAI, sans-serif" font-size="28" font-weight="700">${formatPct(network.delivered, network.total)}</text>
      <text x="110" y="124" text-anchor="middle" fill="#447596" font-family="JetBrains Mono, ui-monospace, monospace" font-size="9" letter-spacing="1.5">DELIVERED</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

function smooth(points) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index === 0 ? index : index - 1];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function signalChart() {
  const width = 760;
  const height = 250;
  const left = 36;
  const right = 16;
  const top = 16;
  const chartBottom = 168;
  const max = Math.max(...hourly.delivered);
  const step = (width - left - right) / (hourly.delivered.length - 1);
  const points = hourly.delivered.map((value, index) => ({
    x: left + index * step,
    y: chartBottom - (value / max) * (chartBottom - top),
  }));
  const line = smooth(points);
  const area = `${line} L ${points.at(-1).x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;
  const grids = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = chartBottom - ratio * (chartBottom - top);
    const label = Math.round(max * ratio);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="rgba(7,102,163,0.12)"/>
      <text x="0" y="${y + 3}" fill="#447596" font-size="10" font-family="JetBrains Mono, ui-monospace, monospace">${label}</text>`;
  }).join("");
  const labels = hourly.labels.map((label, index) => `<text x="${points[index].x}" y="188" text-anchor="middle" fill="#447596" font-size="10" font-family="JetBrains Mono, ui-monospace, monospace">${label}</text>`).join("");
  const exceptionMax = Math.max(...hourly.cancelled, ...hourly.rescheduled, 1);
  const bars = hourly.labels.map((_, index) => {
    const x = points[index].x;
    const rescheduleHeight = (hourly.rescheduled[index] / exceptionMax) * 36;
    const cancelHeight = (hourly.cancelled[index] / exceptionMax) * 36;
    return `<rect x="${x - 7}" y="${236 - rescheduleHeight}" width="6" height="${rescheduleHeight}" rx="2" fill="#7a62c4"/>
      <rect x="${x + 1}" y="${236 - cancelHeight}" width="6" height="${cancelHeight}" rx="2" fill="#d45386"/>`;
  }).join("");
  const dots = points.map((point, index) => `<circle class="signal-dot" data-index="${index}" cx="${point.x}" cy="${point.y}" r="3.5" fill="#ffffff" stroke="#1c7a68" stroke-width="1.5"/>`).join("");
  return `<svg class="signal" viewBox="0 0 ${width} ${height}" role="img" aria-label="Shipments over the last 24 hours">
    ${grids}
    <path d="${area}" fill="rgba(28,122,104,0.16)"/>
    <path d="${line}" fill="none" stroke="#1c7a68" stroke-width="2"/>
    ${dots}
    ${labels}
    <text x="${left}" y="214" fill="#6650b0" font-size="10" font-family="JetBrains Mono, ui-monospace, monospace">RESCHEDULE</text>
    <text x="${left + 108}" y="214" fill="#b02e63" font-size="10" font-family="JetBrains Mono, ui-monospace, monospace">CANCEL</text>
    ${bars}
  </svg>`;
}

function statusBars() {
  const rows = [
    { label: "Delivered", value: network.delivered, fill: "fill-mint" },
    { label: "Pending", value: network.pending, fill: "fill-gold" },
    { label: "Rescheduled", value: network.rescheduled, fill: "fill-amber" },
    { label: "Cancelled", value: network.cancelled, fill: "fill-coral" },
  ];
  return rows.map((row) => `<div class="bar-row">
    <div class="bar-meta"><span>${row.label}</span><b>${formatNum(row.value)} · ${formatPct(row.value, network.total)}</b></div>
    <div class="track"><i class="${row.fill}" data-width="${Math.max((row.value / network.total) * 100, 2.4)}"></i></div>
  </div>`).join("");
}

function summaryMeters() {
  const items = [
    { label: "Delivered (24h)", value: network.recent.delivered, fill: "fill-mint" },
    { label: "Cancelled (24h)", value: network.recent.cancelled, fill: "fill-coral" },
    { label: "Rescheduled (24h)", value: network.recent.rescheduled, fill: "fill-amber" },
  ];
  const max = Math.max(...items.map((item) => item.value));
  return `<div class="summary">${items.map((item) => `<div>
    <div class="sum-meta"><span>${item.label}</span></div>
    <div class="sum-meta"><b class="${item.fill === "fill-coral" ? "tone-coral" : item.fill === "fill-amber" ? "tone-amber" : "tone-mint"}">${formatNum(item.value)}</b></div>
    <div class="sum-track"><i class="${item.fill}" data-width="${(item.value / max) * 100}"></i></div>
  </div>`).join("")}</div>`;
}

function ledger() {
  return feed.map((item) => `<article>
    <time>${esc(item.time)}</time>
    <div>
      <span class="tag ${item.tone}">${esc(item.tag)}</span><small>${esc(item.id)}</small>
      <p>${esc(item.text)}</p>
    </div>
  </article>`).join("");
}

function renderDashboard() {
  stage.innerHTML = `<section class="view">
    ${head("Control tower", "Network overview", "Shipment volume, customer response, and exception rate for the Jebel Ali origin hub.")}
    ${renderTower(state.tower)}
    <footer class="foot"><span>SULOai control tower · Jebel Ali origin hub</span><span>Dubai · GST</span></footer>
  </section>`;
  bindTower();
}

function bindTower() {
  stage.querySelectorAll("[data-tower]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tower = button.dataset.tower;
      const host = stage.querySelector("#tower");
      if (host) host.outerHTML = renderTower(state.tower);
      bindTower();
    });
  });
  stage.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tower = button.dataset.jump;
      const host = stage.querySelector("#tower");
      if (host) host.outerHTML = renderTower(state.tower);
      bindTower();
    });
  });
}

function bindSignal() {
  const svg = stage.querySelector(".signal");
  const tip = stage.querySelector("#chart-tip");
  if (!svg || !tip) return;
  const dots = [...svg.querySelectorAll(".signal-dot")];
  svg.addEventListener("mousemove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 760;
    let nearest = dots[0];
    let best = Infinity;
    dots.forEach((dot) => {
      const distance = Math.abs(Number(dot.getAttribute("cx")) - x);
      if (distance < best) {
        best = distance;
        nearest = dot;
      }
    });
    const index = Number(nearest.dataset.index);
    tip.hidden = false;
    tip.innerHTML = `<b>${hourly.labels[index]}:00 GST</b>Delivered ${hourly.delivered[index]}<br>Rescheduled ${hourly.rescheduled[index]}<br>Cancelled ${hourly.cancelled[index]}`;
    const host = svg.closest(".panel").getBoundingClientRect();
    const localX = (Number(nearest.getAttribute("cx")) / 760) * rect.width;
    const localY = (Number(nearest.getAttribute("cy")) / 250) * rect.height;
    tip.style.left = `${rect.left - host.left + localX}px`;
    tip.style.top = `${rect.top - host.top + localY}px`;
  });
  svg.addEventListener("mouseleave", () => {
    tip.hidden = true;
  });
}

function statusLabel(item) {
  if (item.status === "pending" && !item.assigned) return "Awaiting dispatch";
  if (item.status === "pending" && item.assigned) return "Assigned to route";
  return statusCopy[item.status] || item.status;
}

function serviceLabel(service) {
  if (service === "Priority") return "Express";
  return service;
}

function filteredShipments() {
  const query = state.query.trim().toLowerCase();
  let rows = shipments.filter((item) => {
    if (state.filter === "in_progress") return item.status === "in_progress";
    if (state.filter === "assigned") return item.assigned && item.status === "pending";
    if (state.filter === "unassigned") return !item.assigned;
    if (state.filter === "delivered") return item.status === "delivered";
    if (state.filter === "rescheduled") return item.status === "rescheduled";
    if (state.filter === "cancelled") return item.status === "cancelled";
    return true;
  });
  if (query) {
    rows = rows.filter((item) => [item.id, item.customer, item.address, item.driver, item.district, item.service]
      .join(" ")
      .toLowerCase()
      .includes(query));
  }
  const dir = state.sortDir;
  rows.sort((a, b) => {
    const key = state.sortKey;
    const av = key === "rank" ? rank[a.status] : key === "customer" ? a.customer : key === "status" ? statusLabel(a) : key === "driver" ? (a.driver || "Awaiting dispatch") : a.assignedAt || "";
    const bv = key === "rank" ? rank[b.status] : key === "customer" ? b.customer : key === "status" ? statusLabel(b) : key === "driver" ? (b.driver || "Awaiting dispatch") : b.assignedAt || "";
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return a.id.localeCompare(b.id);
  });
  return rows;
}

function chip(id, label) {
  const count = shipments.filter((item) => {
    if (id === "all") return true;
    if (id === "in_progress") return item.status === "in_progress";
    if (id === "assigned") return item.assigned && item.status === "pending";
    if (id === "unassigned") return !item.assigned;
    return item.status === id;
  }).length;
  return `<button class="chip ${state.filter === id ? "on" : ""}" type="button" data-filter="${id}">${label} ${count}</button>`;
}

function locationCell(item) {
  if (item.lat == null) return `<span class="sub">No GPS position</span>`;
  const stamp = item.status === "in_progress" ? clockNow() : dubaiTime(new Date(item.assignedAt || Date.now()));
  return `<span class="js-loc" data-id="${item.id}">${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}</span><div class="sub js-loc-time" data-id="${item.id}">${item.status === "in_progress" ? stamp : dubaiTime(new Date(item.assignedAt), true)}</div>`;
}

function tableRows(rows) {
  if (!rows.length) return `<tr><td colspan="6"><div class="empty">No shipments match this filter.</div></td></tr>`;
  return rows.map((item) => `<tr data-id="${item.id}" class="${item.id === state.selected ? "is-selected" : ""}" tabindex="0" role="button" aria-label="${esc(item.id)} ${esc(item.customer)}">
    <td><div class="mono">${esc(item.id)}</div><div class="name">${esc(item.customer)}</div><div class="sub">${esc(item.address)}</div></td>
    <td><span class="status ${item.status}"><i></i>${esc(statusLabel(item))}</span></td>
    <td>${item.driver ? `${esc(item.driver)}<div class="sub">${esc(item.driverId)} · ${esc(item.vehicle)}</div>` : `<span class="sub">Awaiting dispatch</span>`}</td>
    <td>${item.assignedAt ? dubaiTime(new Date(item.assignedAt), true) : `<span class="sub">N/A</span>`}</td>
    <td>${locationCell(item)}</td>
    <td>${esc(item.eta)}<div class="sub">${esc(serviceLabel(item.service))} · ${item.pieces} pkgs</div></td>
  </tr>`).join("");
}

function timeline(item) {
  const steps = item.status === "cancelled"
    ? [["Shipment created", "done"], ["Assigned to route", "done"], ["Delivery exception", "now"]]
    : item.status === "rescheduled"
      ? [["Shipment created", "done"], ["Assigned to route", "done"], ["Rescheduled", "now"]]
      : item.status === "delivered"
        ? [["Shipment created", "done"], ["Assigned to route", "done"], ["Out for delivery", "done"], ["Proof of delivery", "done"]]
        : item.status === "in_progress"
          ? [["Shipment created", "done"], ["Assigned to route", "done"], ["Out for delivery", "now"], ["Proof of delivery", ""]]
          : item.assigned
            ? [["Shipment created", "done"], ["Assigned to route", "now"], ["Out for delivery", ""], ["Proof of delivery", ""]]
            : [["Shipment created", "now"], ["Assigned to route", ""], ["Out for delivery", ""], ["Proof of delivery", ""]];
  return `<ol class="timeline">${steps.map(([label, tone]) => `<li class="${tone}">${label}</li>`).join("")}</ol>`;
}

function inspector(item) {
  if (!item) {
    return `<aside class="inspector"><p class="kicker">Shipment</p><h2>Select a shipment</h2><p class="deck">Choose a row in the shipment register to see dispatch, position, and proof of delivery.</p></aside>`;
  }
  return `<aside class="inspector">
    <p class="kicker">${esc(serviceLabel(item.service))} · ${esc(item.district)}</p>
    <h2>${esc(item.customer)}</h2>
    <div class="id-row"><code>${esc(item.id)}</code><button class="ghost" type="button" id="copy-id">Copy ID</button></div>
    <span class="status ${item.status}"><i></i>${esc(statusLabel(item))}</span>
    <dl class="facts">
      <div><dt>Ship-to</dt><dd>${esc(item.address)}</dd></div>
      <div><dt>Driver</dt><dd>${item.driver ? esc(item.driver) : "Awaiting dispatch"}</dd></div>
      <div><dt>Dispatched</dt><dd>${item.assignedAt ? dubaiTime(new Date(item.assignedAt), true) : "Not dispatched"}</dd></div>
      <div><dt>Delivery window</dt><dd>${esc(item.window)}</dd></div>
      <div><dt>Last position</dt><dd class="js-inspector-loc">${item.lat == null ? "No GPS position" : `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}</dd></div>
      <div><dt>Contact</dt><dd>${esc(item.contact)}</dd></div>
    </dl>
    <p class="note">${esc(item.note)}</p>
    ${timeline(item)}
  </aside>`;
}

let opsMap = null;
let opsLayer = null;
let mapToken = 0;
const routeCache = new Map();

function destroyMap() {
  if (opsMap) {
    opsMap.remove();
    opsMap = null;
    opsLayer = null;
  }
}

function pinColor(status) {
  if (status === "delivered") return "#1c7a68";
  if (status === "cancelled") return "#d45386";
  if (status === "rescheduled") return "#7a62c4";
  if (status === "pending") return "#1f8aab";
  return "#0766a3";
}

function markerIcon(item) {
  const selected = item.id === state.selected;
  const size = selected ? 18 : 14;
  const color = pinColor(item.status);
  return L.divIcon({
    className: "pin-marker",
    html: `<span style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 0 ${selected ? 6 : 0}px rgba(255,255,255,0.55)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function warehouseIcon() {
  return L.divIcon({
    className: "hub-marker",
    html: "<span></span>",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

async function roadLine(item) {
  if (routeCache.has(item.id)) return routeCache.get(item.id);
  const straight = [[warehouse.lat, warehouse.lng], [item.lat, item.lng]];
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${warehouse.lng},${warehouse.lat};${item.lng},${item.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const coords = data.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]);
    if (coords?.length) {
      routeCache.set(item.id, coords);
      return coords;
    }
  } catch {
    /* fall back to the straight line */
  }
  routeCache.set(item.id, straight);
  return straight;
}

function mapMarkup() {
  return `<div class="map-wrap"><div id="ops-map" class="ops-map" role="application" aria-label="Live network map of Dubai shipments"></div></div>`;
}

async function syncMap(rows, { fit = false } = {}) {
  if (!opsMap || !opsLayer || typeof L === "undefined") return;
  const token = ++mapToken;
  opsLayer.clearLayers();
  const visible = new Set(rows.map((row) => row.id));
  const bounds = [[warehouse.lat, warehouse.lng]];
  const routes = [];
  const pins = [];
  shipments.forEach((item) => {
    if (item.lat == null) return;
    const on = visible.has(item.id);
    pins.push({ item, on });
    if (on) bounds.push([item.lat, item.lng]);
    if (item.status === "in_progress" && on) routes.push(item);
  });
  if (fit && bounds.length) opsMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
  const lines = await Promise.all(routes.map((item) => roadLine(item)));
  if (token !== mapToken || !opsLayer) return;
  routes.forEach((item, index) => {
    const selected = item.id === state.selected;
    L.polyline(lines[index], {
      color: selected ? "#8ed1c4" : "#9fd4e8",
      weight: selected ? 8 : 7,
      opacity: 0.55,
    }).addTo(opsLayer);
    L.polyline(lines[index], {
      color: selected ? "#0e8f78" : "#0766a3",
      weight: selected ? 4 : 3.2,
      opacity: 1,
      className: "route-flow",
    }).addTo(opsLayer);
  });
  L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon(), zIndexOffset: 300 })
    .bindPopup("<strong>Jebel Ali origin hub</strong><br>Dispatch gate<br>25.0053, 55.0760")
    .addTo(opsLayer);
  pins.forEach(({ item, on }) => {
    const marker = L.marker([item.lat, item.lng], {
      icon: markerIcon(item),
      opacity: on ? 1 : 0.35,
      zIndexOffset: item.id === state.selected ? 600 : 400,
    });
    marker.bindPopup(`<strong>${esc(item.customer)}</strong><br>${esc(item.address)}<br>${esc(statusLabel(item))} · ${esc(item.id)}`);
    marker.on("click", () => selectShipment(item.id));
    marker.addTo(opsLayer);
  });
}

function initMap(rows) {
  const host = document.getElementById("ops-map");
  if (!host || typeof L === "undefined") return;
  opsMap = L.map(host, { scrollWheelZoom: true, maxZoom: 16 }).setView([25.15, 55.25], 11);
  const tiles = { attribution: "Tiles &copy; Esri", maxZoom: 16 };
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", tiles).addTo(opsMap);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, pane: "shadowPane" }).addTo(opsMap);
  opsLayer = L.layerGroup().addTo(opsMap);
  syncMap(rows, { fit: true });
  requestAnimationFrame(() => opsMap?.invalidateSize());
}

function renderRail() {
  const host = document.querySelector("#rail-live");
  if (!host) return;
  const moving = shipments.filter((item) => item.status === "in_progress");
  host.innerHTML = `<div class="rail-label">Out for delivery</div>${moving.map((item) => `<a class="run ${item.id === state.selected && state.view === "tracking" ? "is-on" : ""}" href="#tracking" data-open="${esc(item.id)}">
      <i></i>
      <span><b>${esc(item.customer)}</b><small>${esc(item.district)}</small></span>
    </a>`).join("")}`;
}

function renderTracking() {
  const rows = filteredShipments();
  if (rows.length && !rows.some((item) => item.id === state.selected)) state.selected = rows[0].id;
  const selected = shipments.find((item) => item.id === state.selected);
  stage.innerHTML = `<section class="view">
    ${head("Shipment visibility", "Live tracking", "Dispatch status, last known position, and shipments out for delivery from the Jebel Ali origin hub.")}
    <section class="plate cols-4" id="plate">
      ${metric({ label: "Total shipments", value: formatNum(network.total), note: "Network total", tone: "" })}
      ${metric({ label: "Dispatched", value: formatNum(network.assigned), note: "Driver assigned", tone: "tone-gold" })}
      ${metric({ label: "Out for delivery", value: formatNum(network.inProgress), note: "Of dispatched shipments", tone: "tone-amber" })}
      ${metric({ label: "Delivered", value: formatNum(network.delivered), note: "Proof of delivery on file", tone: "tone-mint" })}
    </section>
    <div class="toolbar">
      <div class="chips">
        ${chip("all", "All")}
        ${chip("in_progress", "Out for delivery")}
        ${chip("assigned", "Assigned to route")}
        ${chip("unassigned", "Awaiting dispatch")}
        ${chip("delivered", "Delivered")}
        ${chip("rescheduled", "Rescheduled")}
        ${chip("cancelled", "Cancelled")}
      </div>
      <input class="search" id="search" type="search" placeholder="Tracking no., ship-to, or driver" value="${esc(state.query)}" aria-label="Search shipments">
    </div>
    <div class="track-layout">
      <section class="panel map-card">
        <div class="panel-head"><h2>Live network map</h2><span>${rows.length} shipments</span></div>
        ${mapMarkup()}
      </section>
      <div id="inspector">${inspector(selected)}</div>
    </div>
    <section class="panel table-panel">
      <div class="panel-head"><h2>Shipment register</h2><span>${rows.length} shipments</span></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th data-sort="customer">Shipment</th>
              <th data-sort="status">Status</th>
              <th data-sort="driver">Driver</th>
              <th data-sort="assignedAt">Dispatched</th>
              <th>Last position</th>
              <th>ETA</th>
            </tr>
          </thead>
          <tbody id="rows">${tableRows(rows)}</tbody>
        </table>
      </div>
    </section>
    <footer class="foot"><span>Origin hub Jebel Ali · driving routes to stops out for delivery</span><span>25.0053, 55.0760</span></footer>
  </section>`;
  bindTracking();
}

function selectShipment(id) {
  state.selected = id;
  const rows = filteredShipments();
  const selected = shipments.find((item) => item.id === id);
  const body = stage.querySelector("#rows");
  const inspectorHost = stage.querySelector("#inspector");
  if (body) body.innerHTML = tableRows(rows);
  if (inspectorHost) inspectorHost.innerHTML = inspector(selected);
  syncMap(rows, { fit: false });
  bindCopy();
  bindRows();
}

function bindRows() {
  stage.querySelectorAll("tbody tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => selectShipment(row.dataset.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectShipment(row.dataset.id);
      }
    });
  });
}

function bindCopy() {
  const button = stage.querySelector("#copy-id");
  if (!button) return;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.selected);
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy ID"; }, 1200);
    } catch {
      button.textContent = state.selected;
    }
  });
}

function bindTracking() {
  stage.querySelectorAll(".chip").forEach((chipButton) => {
    chipButton.addEventListener("click", () => {
      state.filter = chipButton.dataset.filter;
      render();
    });
  });
  const search = stage.querySelector("#search");
  if (search) {
    search.addEventListener("input", () => {
      state.query = search.value;
      const rows = filteredShipments();
      const body = stage.querySelector("#rows");
      const count = stage.querySelector(".table-panel .panel-head span");
      const mapCount = stage.querySelector(".map-card .panel-head span");
      if (body) body.innerHTML = tableRows(rows);
      if (count) count.textContent = `${rows.length} shipments`;
      if (mapCount) mapCount.textContent = `${rows.length} shipments`;
      syncMap(rows, { fit: true });
      bindRows();
      if (rows.length && !rows.some((row) => row.id === state.selected)) selectShipment(rows[0].id);
    });
  }
  stage.querySelectorAll("th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      if (state.sortKey === key) state.sortDir *= -1;
      else {
        state.sortKey = key;
        state.sortDir = 1;
      }
      const body = stage.querySelector("#rows");
      if (body) body.innerHTML = tableRows(filteredShipments());
      bindRows();
    });
  });
  bindRows();
  bindCopy();
}

function render() {
  destroyMap();
  document.title = state.view === "tracking" ? "Shipment tracking · SULOai" : "Control tower · SULOai";
  if (state.view === "tracking") renderTracking();
  else renderDashboard();
  renderRail();
  placeGlider();
  if (state.view === "tracking") initMap(filteredShipments());
}

function placeGlider() {
  const glider = document.querySelector(".glider");
  const active = document.querySelector(`.rail-link[data-view="${state.view}"]`);
  document.querySelectorAll(".rail-link").forEach((link) => {
    const on = link.dataset.view === state.view;
    link.classList.toggle("active", on);
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (!glider || !active) return;
  glider.style.height = `${active.offsetHeight}px`;
  glider.style.transform = `translateY(${active.offsetTop}px)`;
}

function viewFromHash() {
  return location.hash === "#tracking" ? "tracking" : "dashboard";
}

function liveTick() {
  document.querySelectorAll(".js-clock").forEach((node) => {
    node.textContent = clockNow();
  });
  if (state.view !== "tracking") return;
  const now = clockNow();
  stage.querySelectorAll(".js-loc-time").forEach((node) => {
    const item = shipments.find((shipment) => shipment.id === node.dataset.id);
    if (item?.status === "in_progress") node.textContent = now;
  });
}

function boot() {
  if (!location.hash) history.replaceState(null, "", "#dashboard");
  state.view = viewFromHash();
  document.querySelector("#rail-live")?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-open]");
    if (!link) return;
    state.selected = link.dataset.open;
    state.filter = "all";
    state.query = "";
    if (location.hash === "#tracking") {
      event.preventDefault();
      render();
    }
  });
  render();
  window.addEventListener("hashchange", () => {
    state.view = viewFromHash();
    render();
  });
  window.addEventListener("resize", () => {
    placeGlider();
    opsMap?.invalidateSize();
  });
  window.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(event.target.tagName);
    if (typing) return;
    if (event.key === "1") location.hash = "#dashboard";
    if (event.key === "2") location.hash = "#tracking";
  });
  setInterval(liveTick, 1000);
  setInterval(() => {
    const shift = -((performance.now() / 14) % 280);
    document.querySelectorAll("path.route-flow").forEach((path) => {
      path.style.strokeDashoffset = `${shift}px`;
    });
  }, 40);
}

boot();
