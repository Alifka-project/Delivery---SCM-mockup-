import { feed, shipments } from "./data.js";

const book = {
  total: 2174,
  delivered: 1715,
  deliveredToday: 21,
  nextShipment: 0,
  futureShipment: 4,
  pending: 373,
  cancelled: 80,
  success: 78.9,
  delta: 6.1,
  accepted: 1284,
  rescheduled: 96,
  custCancelled: 54,
  withPod: 1490,
  overdue: 46,
  unassigned: 19,
  awaiting: 112,
};

const customers = [
  ["Al Futtaim Retail", "Dubai Mall", 420, 368, 31, 21, 1840],
  ["Emaar Hospitality", "Downtown", 286, 241, 28, 17, 960],
  ["Majid Al Futtaim", "Festival City", 214, 188, 16, 10, 740],
  ["Jumeirah Group", "Jumeirah", 176, 151, 14, 11, 510],
  ["Nakheel Residences", "Palm Jumeirah", 142, 118, 18, 6, 390],
  ["Dubai Holding", "Business Bay", 118, 96, 15, 7, 280],
  ["Wasl Asset Mgmt", "Al Quoz", 94, 71, 16, 7, 220],
  ["Meraas", "City Walk", 81, 68, 9, 4, 160],
];

const areas = [
  ["Dubai Marina", 312, 268, 28, 16],
  ["Downtown", 286, 241, 31, 14],
  ["Jebel Ali / DIP", 248, 201, 34, 13],
  ["Deira", 196, 154, 29, 13],
  ["Palm Jumeirah", 164, 139, 18, 7],
  ["Silicon Oasis", 142, 118, 17, 7],
  ["Arabian Ranches", 118, 96, 15, 7],
  ["Motor City", 88, 64, 16, 8],
];

const skus = [
  ["Split AC 1.5T", "HVAC", 640],
  ["Refrigerator 600L", "Cold", 510],
  ["Washer 9kg", "Laundry", 430],
  ["LED TV 65\"", "AV", 360],
  ["Built-in oven", "Kitchen", 240],
  ["Dishwasher 14p", "Kitchen", 180],
];

const roster = [
  ["Karim Haddad", "DRV-14", "On route", "DXB 18420", 11, "96%"],
  ["Noor Elmasri", "DRV-07", "On route", "DXB 22014", 9, "94%"],
  ["Yusuf Rahman", "DRV-22", "On route", "DXB 19002", 8, "91%"],
  ["Leila Haddad", "DRV-03", "On route", "DXB 44118", 10, "97%"],
  ["Omar Qassim", "DRV-19", "At hub", "DXB 31880", 6, "89%"],
  ["Hana Ibrahim", "DRV-11", "On route", "DXB 10277", 7, "92%"],
  ["Sami Farouk", "DRV-28", "Assigned", "DXB 27501", 4, "88%"],
  ["Rana Khalil", "DRV-16", "Off duty", "DXB 36014", 0, "90%"],
];

const tabs = [
  ["overview", "Overview"],
  ["deliveries", "Deliveries"],
  ["trends", "Trends"],
  ["customers", "Top Customers"],
  ["by-area", "By Area"],
  ["by-product", "By Product"],
  ["drivers", "Drivers"],
];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function n(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function bars(rows, key, max) {
  return rows.map((row) => {
    const width = Math.max((row[key] / max) * 100, 4);
    return `<div class="bar-row">
      <div class="bar-meta"><span>${esc(row.name)}</span><b>${n(row[key])}</b></div>
      <div class="track"><i class="fill-gold" style="width:${width}%"></i></div>
    </div>`;
  }).join("");
}

function kpi(label, value, note, tone) {
  const raw = String(value).replace(/,/g, "");
  const count = /^-?\d+(\.\d+)?%?$/.test(raw) ? raw.replace("%", "") : "";
  const suffix = String(value).includes("%") ? "%" : "";
  const long = String(value).length > 14 ? " long" : "";
  return `<article class="kpi">
    <span>${esc(label)}</span>
    <strong class="${tone || ""}${long}"${count ? ` data-count="${count}" data-suffix="${suffix}"` : ""}>${esc(value)}</strong>
    <small>${esc(note)}</small>
  </article>`;
}

function deliveries() {
  const live = shipments.length;
  const pending = shipments.filter((s) => s.status === "pending").length;
  const onRoute = shipments.filter((s) => s.status === "in_progress").length;
  const noResponse = shipments.filter((s) => !s.assigned).length;
  const delay = shipments.filter((s) => s.status === "rescheduled").length;
  const done = shipments.filter((s) => s.status === "delivered").length;
  const rows = shipments.map((item) => `<tr>
    <td><div class="mono">${esc(item.id)}</div><div class="name">${esc(item.customer)}</div><div class="sub">${esc(item.address)}</div></td>
    <td><span class="status ${item.status}"><i></i>${esc(item.status === "in_progress" ? "Out for delivery" : item.status === "pending" ? (item.assigned ? "Assigned to route" : "Awaiting dispatch") : item.status)}</span></td>
    <td>${item.driver ? esc(item.driver) : "Awaiting dispatch"}</td>
    <td>${esc(item.district)}</td>
    <td>${esc(item.eta)}</td>
  </tr>`).join("");
  return `<div class="kpi-strip six">
    ${kpi("Total (live)", String(live), "Active register", "")}
    ${kpi("Pending orders", String(pending), "Not yet closed", "tone-amber")}
    ${kpi("No response", String(noResponse), "Customer not confirmed", "tone-gold")}
    ${kpi("On route", String(onRoute), "Out for delivery", "tone-gold")}
    ${kpi("Order delay", String(delay), "Rescheduled window", "tone-coral")}
    ${kpi("Delivered", String(done), "POD or closed", "tone-mint")}
  </div>
  <section class="panel table-panel">
    <div class="panel-head"><h2>Live deliveries</h2><span>Same register as shipment tracking</span></div>
    <div class="table-scroll"><table>
      <thead><tr><th>Shipment</th><th>Status</th><th>Driver</th><th>Area</th><th>ETA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function trends() {
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const demand = [140, 156, 132, 168, 174, 190, 210, 198, 220, 236, 228, 244];
  const max = Math.max(...demand);
  const cols = months.map((month, i) => `<div class="trend-col"><div class="trend-bars"><b style="height:${(demand[i] / max) * 100}%"></b></div><span>${month}</span></div>`).join("");
  return `<section class="panel">
    <div class="panel-head"><h2>Time period</h2><span>Last 12 months · monthly</span></div>
    <div class="chips">
      <button class="chip on" type="button">Last 12 months</button>
      <button class="chip" type="button">Last 30 days</button>
      <button class="chip" type="button">This month</button>
      <button class="chip" type="button">This year</button>
    </div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Delivery demand</h2><span>Orders created</span></div>
    <div class="trend">${cols}</div>
  </section>
  <div class="kpi-strip" style="margin-top:16px">
    ${kpi("Success rate", `${book.success}%`, "Target 95%", "tone-mint")}
    ${kpi("Open backlog", n(book.pending), "Inside the promise", "tone-amber")}
    ${kpi("Median lead time", "18h", "Created to delivered", "tone-gold")}
    ${kpi("P90 lead time", "41h", "Slowest tenth", "tone-coral")}
    ${kpi("Created", "244", "This month", "")}
    ${kpi("Delivered", "198", "This month", "tone-mint")}
    ${kpi("Cancelled", "14", "This month", "tone-coral")}
  </div>
  <section class="panel">
    <div class="panel-head"><h2>Status mix</h2><span>Delivered vs pending vs cancelled</span></div>
    ${bars([
      { name: "Delivered", count: book.delivered },
      { name: "Pending", count: book.pending },
      { name: "Cancelled", count: book.cancelled },
    ], "count", book.total)}
  </section>`;
}

function customerRows() {
  const orders = customers.reduce((sum, row) => sum + row[2], 0);
  return customers.map((row, index) => {
    const share = ((row[2] / orders) * 100).toFixed(1);
    const success = ((row[3] / row[2]) * 100).toFixed(1);
    const risk = Number(success) < 80 ? "High" : Number(success) < 88 ? "Medium" : "Low";
    return `<tr>
      <td>${index + 1}</td><td class="name">${esc(row[0])}</td><td>${n(row[2])}</td><td>${n(row[3])}</td>
      <td>${row[4]}</td><td>${row[5]}</td><td>${share}%</td><td>${success}%</td>
      <td><span class="status ${risk === "High" ? "cancelled" : risk === "Medium" ? "rescheduled" : "delivered"}"><i></i>${risk}</span></td>
      <td>${esc(row[1])}</td><td>${n(row[6])}</td>
    </tr>`;
  }).join("");
}

function customersPanel() {
  const orders = customers.reduce((sum, row) => sum + row[2], 0);
  const top1 = ((customers[0][2] / orders) * 100).toFixed(1);
  const top3 = ((customers.slice(0, 3).reduce((s, r) => s + r[2], 0) / orders) * 100).toFixed(1);
  return `<div class="kpi-strip six">
    ${kpi("Total customers", String(customers.length), "Accounts with orders", "")}
    ${kpi("Total orders", n(orders), "In the customer book", "")}
    ${kpi("Delivered", n(customers.reduce((s, r) => s + r[3], 0)), "Closed with POD", "tone-mint")}
    ${kpi("Top 1 share", `${top1}%`, "Concentration on #1 account", "tone-gold")}
    ${kpi("Top 3 share", `${top3}%`, "Top three accounts", "tone-gold")}
    ${kpi("Avg success rate", "86.4%", "Across listed accounts", "tone-mint")}
  </div>
  <section class="panel table-panel">
    <div class="panel-head"><h2>Customer detail</h2><span>Top ${customers.length}</span></div>
    <div class="table-scroll"><table>
      <thead><tr><th>#</th><th>Customer</th><th>Orders</th><th>Delivered</th><th>Pending</th><th>Cancelled</th><th>Share %</th><th>Success %</th><th>Risk</th><th>Primary area</th><th>Total qty</th></tr></thead>
      <tbody>${customerRows()}</tbody>
    </table></div>
  </section>`;
}

function areaPanel() {
  const total = areas.reduce((s, r) => s + r[1], 0);
  const shaped = areas.map((row) => ({ name: row[0], count: row[1], delivered: row[2], pending: row[3] }));
  const avg = (areas.reduce((s, r) => s + (r[2] / r[1]), 0) / areas.length * 100).toFixed(1);
  return `<div class="kpi-strip six">
    ${kpi("Active areas", String(areas.length), "Delivery zones", "")}
    ${kpi("Total deliveries", n(total), "Across zones", "")}
    ${kpi("Top region", areas[0][0], "Highest volume", "tone-gold")}
    ${kpi("Top area share", `${((areas[0][1] / total) * 100).toFixed(1)}%`, "Of zone volume", "tone-gold")}
    ${kpi("Avg area success", `${avg}%`, "Delivered ÷ area volume", "tone-mint")}
    ${kpi("Largest backlog", "Jebel Ali / DIP", `${areas[2][3]} pending`, "tone-amber")}
  </div>
  <section class="panel"><div class="panel-head"><h2>Deliveries by area</h2><span>UAE service area</span></div>${bars(shaped, "count", areas[0][1])}</section>`;
}

function productPanel() {
  const total = skus.reduce((s, r) => s + r[2], 0);
  const shaped = skus.map((row) => ({ name: row[0], count: row[2] }));
  return `<div class="kpi-strip six">
    ${kpi("SKUs tracked", String(skus.length), "Active catalogue", "")}
    ${kpi("Total qty", n(total), "Units on orders", "")}
    ${kpi("Best seller", skus[0][0], skus[0][1], "tone-gold")}
    ${kpi("Best seller qty", n(skus[0][2]), "Units", "tone-gold")}
    ${kpi("Top SKU share", `${((skus[0][2] / total) * 100).toFixed(1)}%`, "Of unit volume", "tone-amber")}
    ${kpi("Concentration", "Medium", "Top SKU under 30%", "tone-mint")}
  </div>
  <section class="panel"><div class="panel-head"><h2>Top items by quantity</h2><span>Cumulative share of units</span></div>${bars(shaped, "count", skus[0][2])}</section>`;
}

function driversPanel() {
  const onRoute = roster.filter((row) => row[2] === "On route").length;
  const rows = roster.map((row) => `<tr>
    <td class="name">${esc(row[0])}<div class="sub">${esc(row[1])}</div></td>
    <td><span class="status ${row[2] === "On route" ? "in_progress" : row[2] === "Off duty" ? "cancelled" : "pending"}"><i></i>${esc(row[2])}</span></td>
    <td class="mono">${esc(row[3])}</td><td>${row[4]}</td><td>${esc(row[5])}</td>
  </tr>`).join("");
  return `<div class="kpi-strip six">
    ${kpi("Total drivers", String(roster.length), "On the roster", "")}
    ${kpi("On route", String(onRoute), "Out for delivery", "tone-gold")}
    ${kpi("At hub", "1", "Waiting dispatch", "tone-amber")}
    ${kpi("Assigned", "1", "Route built, not departed", "")}
    ${kpi("Off duty", "1", "Not available", "tone-coral")}
    ${kpi("Stops today", String(roster.reduce((s, r) => s + r[4], 0)), "Assigned stops", "tone-mint")}
  </div>
  <section class="panel table-panel">
    <div class="panel-head"><h2>Driver roster</h2><span>Workload and outcome</span></div>
    <div class="table-scroll"><table>
      <thead><tr><th>Driver</th><th>Status</th><th>Vehicle</th><th>Stops today</th><th>Success</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>
  <section class="panel"><div class="panel-head"><h2>Latest tracking events</h2><span>Event log</span></div>
    <div class="ledger">${feed.map((item) => `<article><time>${esc(item.time)}</time><div><span class="tag ${item.tone}">${esc(item.tag)}</span><small>${esc(item.id)}</small><p>${esc(item.text)}</p></div></article>`).join("")}</div>
  </section>`;
}

const views = {
  deliveries,
  trends,
  customers: customersPanel,
  "by-area": areaPanel,
  "by-product": productPanel,
  drivers: driversPanel,
};

export function renderTower(tab, overviewHtml) {
  const nav = tabs.map(([id, label]) => `<button type="button" class="tower-tab ${tab === id ? "on" : ""}" data-tower="${id}">${label}</button>`).join("");
  const body = tab === "overview" && overviewHtml ? overviewHtml : (views[tab] || views.deliveries)();
  return `<div id="tower"><nav class="tower-tabs" aria-label="Dashboard sections">${nav}</nav><div id="tower-body">${body}</div></div>`;
}
