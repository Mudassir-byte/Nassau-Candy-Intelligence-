(() => {
  "use strict";

  const STORAGE_KEY = "nassau-candy-intelligence-v1";
  const DQ_ASOF = new Date(2026, 8, 29);

  const PRODUCT_FACTORY = {
    "CHO-NUT-13000": "Lot's O' Nuts",
    "CHO-FUD-51000": "Lot's O' Nuts",
    "CHO-SCR-58000": "Lot's O' Nuts",
    "CHO-MIL-31000": "Wicked Choccy's",
    "CHO-TRI-54000": "Wicked Choccy's",
    "SUG-LAF-25000": "Sugar Shack",
    "SUG-SWE-91000": "Sugar Shack",
    "SUG-NER-92000": "Sugar Shack",
    "SUG-FUN-75000": "Sugar Shack",
    "OTH-FIZ-56000": "Sugar Shack",
    "SUG-EVE-47000": "Secret Factory",
    "OTH-LIC-15000": "Secret Factory",
    "OTH-GUM-21000": "Secret Factory",
    "SUG-HAI-55000": "The Other Factory",
    "OTH-KAZ-38000": "The Other Factory"
  };

  const FACTORY_COORDS = {
    "Lot's O' Nuts": { lat: 32.881893, lon: -111.768036 },
    "Wicked Choccy's": { lat: 32.076176, lon: -81.088371 },
    "Sugar Shack": { lat: 48.11914, lon: -96.18115 },
    "Secret Factory": { lat: 41.446333, lon: -90.565487 },
    "The Other Factory": { lat: 35.1175, lon: -89.971107 }
  };

  const STATE_COORDS = {
    Alabama: [32.8, -86.8], Alaska: [64.2, -149.5], Arizona: [34.3, -111.7],
    Arkansas: [34.8, -92.4], California: [37.2, -119.4], Colorado: [39.0, -105.5],
    Connecticut: [41.6, -72.7], Delaware: [39.0, -75.5], "District of Columbia": [38.9, -77.0],
    Florida: [28.6, -82.4], Georgia: [32.7, -83.4], Hawaii: [20.8, -157.8],
    Idaho: [44.3, -114.6], Illinois: [40.0, -89.2], Indiana: [39.9, -86.3],
    Iowa: [42.0, -93.6], Kansas: [38.5, -98.4], Kentucky: [37.7, -84.7],
    Louisiana: [31.2, -92.0], Maine: [45.3, -69.0], Maryland: [39.0, -76.8],
    Massachusetts: [42.3, -71.8], Michigan: [44.7, -85.5], Minnesota: [46.3, -94.3],
    Mississippi: [32.7, -89.7], Missouri: [38.5, -92.5], Montana: [47.0, -109.6],
    Nebraska: [41.5, -99.8], Nevada: [39.3, -116.6], "New Hampshire": [43.7, -71.6],
    "New Jersey": [40.1, -74.7], "New Mexico": [34.4, -106.1], "New York": [42.9, -75.5],
    "North Carolina": [35.5, -79.4], "North Dakota": [47.4, -100.5], Ohio: [40.3, -82.8],
    Oklahoma: [35.6, -97.5], Oregon: [43.9, -120.6], Pennsylvania: [40.9, -77.8],
    "Rhode Island": [41.7, -71.6], "South Carolina": [33.9, -80.9], "South Dakota": [44.4, -100.2],
    Tennessee: [35.9, -86.4], Texas: [31.5, -99.3], Utah: [39.3, -111.7],
    Vermont: [44.1, -72.7], Virginia: [37.5, -78.9], Washington: [47.4, -120.6],
    "West Virginia": [38.6, -80.6], Wisconsin: [44.6, -89.9], Wyoming: [42.8, -107.6],
    Ontario: [51.2, -85.0], Quebec: [53.0, -70.0], Alberta: [54.5, -115.0],
    "British Columbia": [53.7, -125.0], "Nova Scotia": [45.0, -63.0]
  };

  const COLORS = ["#7c5cff", "#00d4ff", "#ffb547", "#39d98a", "#ff6b9d", "#5a8cff"];
  const DEFAULT_STATE = {
    start: "",
    end: "",
    regions: [],
    states: [],
    cities: [],
    divisions: [],
    products: [],
    shipModes: [],
    threshold: 30,
    heatmapMetric: "margin",
    tab: "overview"
  };

  let records = [];
  let charts = {};
  let state = loadState();

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", boot);

  function boot() {
    if (!window.Papa || !window.echarts) {
      showToast("Required visualization libraries could not be loaded.");
      setLoading(false);
      return;
    }

    bindStaticEvents();
    setLoading(true);
    fetchCsv();
  }

  function bindStaticEvents() {
    $("openFiltersButton").addEventListener("click", openFilters);
    $("closeFiltersButton").addEventListener("click", closeFilters);
    $("filterBackdrop").addEventListener("click", closeFilters);
    $("loadCsvButton").addEventListener("click", () => $("filePicker").click());
    $("fallbackLoadButton").addEventListener("click", () => $("filePicker").click());
    $("filePicker").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) parseFile(file);
    });

    $("applyFiltersButton").addEventListener("click", () => {
      readControlsIntoState();
      renderDashboard();
      closeFilters();
    });

    $("resetFiltersButton").addEventListener("click", () => {
      state = {
        ...DEFAULT_STATE,
        start: state.start,
        end: state.end,
        heatmapMetric: state.heatmapMetric,
        tab: state.tab
      };
      readControlsIntoState(true);
      renderDashboard();
      showToast("Filters reset");
    });

    ["dateStart", "dateEnd", "thresholdRange"].forEach((id) => {
      $(id).addEventListener(id === "thresholdRange" ? "input" : "change", () => {
        readControlsIntoState();
        renderDashboard();
      });
    });

    ["regionChips", "divisionChips", "modeChips"].forEach((id) => {
      $(id).addEventListener("click", (event) => {
        const button = event.target.closest("button[data-value]");
        if (!button) return;
        const key = button.dataset.key;
        const value = button.dataset.value;
        toggleArrayValue(state[key], value);
        button.classList.toggle("active");
        button.setAttribute("aria-pressed", button.classList.contains("active"));
        saveState();
        renderDashboard();
      });
    });

    ["stateSelect", "citySelect", "productSelect"].forEach((id) => {
      $(id).addEventListener("change", () => {
        readControlsIntoState();
        renderDashboard();
      });
    });

    document.querySelectorAll("[data-scroll-to]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = $(button.dataset.scrollTo);
        if (!target) return;
        if (button.dataset.scrollTo === "tab-fulfillment") activateTab("fulfillment");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.tab));
    });

    document.querySelectorAll("#heatmapMetricToggle button").forEach((button) => {
      button.addEventListener("click", () => {
        state.heatmapMetric = button.dataset.heatmap;
        document.querySelectorAll("#heatmapMetricToggle button").forEach((b) => {
          b.classList.toggle("active", b === button);
        });
        saveState();
        renderDashboard();
      });
    });

    $("tableSearch").addEventListener("input", renderOrderTable);
    $("exportOrdersButton").addEventListener("click", exportFilteredOrders);
    window.addEventListener("resize", debounce(resizeCharts, 120));
  }

  function loadState() {
    try {
      return { ...DEFAULT_STATE, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function fetchCsv() {
    if (window.location.protocol === "file:") {
      if (typeof window.NASSAU_CANDY_CSV === "string") {
       parseText(window.NASSAU_CANDY_CSV);
        return;
     }

      setLoading(false);
      $("csvFallback").classList.remove("hidden");
      showToast("The embedded dataset is missing. Run embed-dataset.ps1 or choose a CSV manually.");
      return;
    }

    fetch("./data/", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text().then((html) => ({ html, directoryUrl: response.url }));
      })
      .then(({ html, directoryUrl }) => {
        const directory = new URL(directoryUrl);
        const listing = new DOMParser().parseFromString(html, "text/html");
        const csvUrls = Array.from(listing.querySelectorAll("a[href]"), (link) =>
          new URL(link.getAttribute("href"), directory)
        ).filter((url) => {
          const filename = url.pathname.slice(directory.pathname.length);
          return url.origin === directory.origin &&
            url.pathname.startsWith(directory.pathname) &&
            !filename.includes("/") &&
            /\.csv$/i.test(filename);
        });

        if (csvUrls.length !== 1) {
          throw new Error(csvUrls.length ? "Multiple CSV files found in data folder" : "No CSV file found in data folder");
        }

        return fetch(csvUrls[0], { cache: "no-store" });
      })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(parseText)
      .catch((error) => {
        console.error("Dashboard load failed:", error);
        setLoading(false);
        $("csvFallback").classList.remove("hidden");
        showToast(`Dashboard load failed: ${error.message || "Unknown error"}`);
      });
  }

  function parseFile(file) {
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => initialize(result.data),
      error: () => {
        setLoading(false);
        showToast("Could not parse the selected CSV.");
      }
    });
  }

  function parseText(text) {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => initialize(result.data)
    });
  }

  function initialize(rawRows) {
    records = cleanRows(rawRows);

    if (!records.length) {
      setLoading(false);
      $("csvFallback").classList.remove("hidden");
      showToast("The CSV loaded, but no valid rows were found.");
      return;
    }

    const minDate = min(records.map((d) => d.orderDate));
    const maxDate = max(records.map((d) => d.orderDate));

    $("dateStart").min = toInputDate(minDate);
    $("dateStart").max = toInputDate(maxDate);
    $("dateEnd").min = toInputDate(minDate);
    $("dateEnd").max = toInputDate(maxDate);

    if (!state.start) state.start = toInputDate(minDate);
    if (!state.end) state.end = toInputDate(maxDate);

    populateFilterOptions();
    syncControls();
    activateTab(state.tab || "overview", false);

    $("dashboardRoot").classList.remove("hidden");
    $("csvFallback").classList.add("hidden");
    setLoading(false);
    renderDashboard();

    requestAnimationFrame(() => {
      $("dashboardRoot").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cleanRows(rows) {
    return rows.map((row, index) => {
      const orderDate = parseDateDMY(row["Order Date"]);
      const shipDate = parseDateDMY(row["Ship Date"]);
      const productId = String(row["Product ID"] || "").trim();
      const product = normalizeProductName(row["Product Name"]);

      return {
        rowId: toNumber(row["Row ID"]) || index + 1,
        orderId: String(row["Order ID"] || "").trim(),
        orderDate,
        shipDate,
        orderDateText: toInputDate(orderDate),
        shipDateText: toInputDate(shipDate),
        month: toMonthKey(orderDate),
        shipMode: String(row["Ship Mode"] || "Unknown").trim(),
        customerId: String(row["Customer ID"] || "Unknown").trim(),
        country: String(row["Country/Region"] || "Unknown").trim(),
        city: String(row["City"] || "Unknown").trim(),
        state: String(row["State/Province"] || "Unknown").trim(),
        postalCode: String(row["Postal Code"] || "").trim(),
        division: String(row["Division"] || "Unknown").trim(),
        region: String(row["Region"] || "Unknown").trim(),
        productId,
        product,
        sales: toNumber(row.Sales),
        units: toNumber(row.Units),
        profit: toNumber(row["Gross Profit"]),
        cost: toNumber(row.Cost),
        leadTime: orderDate && shipDate ? daysBetween(orderDate, shipDate) : null,
        factory: PRODUCT_FACTORY[productId] || "Unmapped",
        cityKey: `${String(row["City"] || "Unknown").trim()}, ${String(row["State/Province"] || "Unknown").trim()}`
      };
    }).filter((row) => row.orderId && row.orderDate && Number.isFinite(row.sales));
  }

  function normalizeProductName(name) {
    return String(name || "Unknown")
      .replace(/-\s*Scrumdiddlyumptious/i, "— Scrumdiddlyumptious")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseDateDMY(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

    if (match) {
      let year = Number(match[3]);
      if (year < 100) year += 2000;
      return new Date(year, Number(match[2]) - 1, Number(match[1]));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function daysBetween(start, end) {
    return Math.round((end - start) / 86400000);
  }

  function toMonthKey(date) {
    if (!date) return "Unknown";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function toInputDate(date) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function populateFilterOptions() {
    renderChips("regionChips", unique(records.map((d) => d.region)), "regions");
    renderChips("divisionChips", unique(records.map((d) => d.division)), "divisions");
    renderChips("modeChips", unique(records.map((d) => d.shipMode)), "shipModes");

    populateSelect(
      $("stateSelect"),
      unique(records.map((d) => d.state)),
      (value) => value
    );

    populateSelect(
      $("citySelect"),
      unique(records.map((d) => d.cityKey)),
      (value) => value
    );

    populateSelect(
      $("productSelect"),
      unique(records.map((d) => d.product)),
      (value) => value
    );
  }

  function renderChips(id, values, key) {
    $(id).innerHTML = values.map((value) => {
      const active = state[key].includes(value) ? "active" : "";
      return `<button type="button" class="chip ${active}" data-key="${key}" data-value="${escapeHtml(value)}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(value)}</button>`;
    }).join("");
  }

  function populateSelect(select, values, labeler) {
    select.innerHTML = values.map((value) => {
      return `<option value="${escapeHtml(value)}">${escapeHtml(labeler(value))}</option>`;
    }).join("");
  }

  function syncControls() {
    $("dateStart").value = state.start;
    $("dateEnd").value = state.end;
    $("thresholdRange").value = state.threshold;
    $("thresholdLabel").textContent = `${state.threshold} days`;

    setSelectedValues($("stateSelect"), state.states);
    setSelectedValues($("citySelect"), state.cities);
    setSelectedValues($("productSelect"), state.products);

    document.querySelectorAll("#heatmapMetricToggle button").forEach((button) => {
      button.classList.toggle("active", button.dataset.heatmap === state.heatmapMetric);
    });
  }

  function readControlsIntoState(skipDates = false) {
    if (!skipDates) {
      state.start = $("dateStart").value;
      state.end = $("dateEnd").value;
      state.threshold = Number($("thresholdRange").value || 30);
    }

    state.states = getSelectedValues($("stateSelect"));
    state.cities = getSelectedValues($("citySelect"));
    state.products = getSelectedValues($("productSelect"));
    saveState();
  }

  function getSelectedValues(select) {
    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  function setSelectedValues(select, values) {
    Array.from(select.options).forEach((option) => {
      option.selected = values.includes(option.value);
    });
  }

  function toggleArrayValue(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) array.splice(index, 1);
    else array.push(value);
    saveState();
  }

  function filteredRows() {
    const start = state.start ? new Date(`${state.start}T00:00:00`) : null;
    const end = state.end ? new Date(`${state.end}T23:59:59`) : null;

    return records.filter((row) => {
      if (start && row.orderDate < start) return false;
      if (end && row.orderDate > end) return false;
      if (state.regions.length && !state.regions.includes(row.region)) return false;
      if (state.states.length && !state.states.includes(row.state)) return false;
      if (state.cities.length && !state.cities.includes(row.cityKey)) return false;
      if (state.divisions.length && !state.divisions.includes(row.division)) return false;
      if (state.products.length && !state.products.includes(row.product)) return false;
      if (state.shipModes.length && !state.shipModes.includes(row.shipMode)) return false;
      return true;
    });
  }

  function renderDashboard() {
    if (!records.length) return;

    const rows = filteredRows();
    const metrics = summarize(rows);
    const aggregates = buildAggregates(rows);
    const filterTotal = countActiveFilters();

    $("filterCount").textContent = filterTotal;
    $("scopeBadge").textContent = `${formatNumber(metrics.rows)} rows · ${formatDateShort(state.start)}–${formatDateShort(state.end)}`;
    $("thresholdLabel").textContent = `${state.threshold} days`;

    renderHero(metrics);
    renderKpis(metrics);
    renderHealth(rows, metrics);
    renderInsights(metrics, aggregates);
    renderRecommendations(metrics, aggregates);
    if (state.tab === "overview") renderOverviewCharts(metrics, aggregates);
    else if (state.tab === "customers") renderCustomerCharts(metrics, aggregates);
    else if (state.tab === "fulfillment") renderFulfillmentCharts(metrics, aggregates);
    else if (state.tab === "explorer") renderExplorer(metrics, aggregates);

    saveState();
  }

  function buildAggregates(rows) {
    const monthly = aggregate(rows, (d) => d.month);
    const yearly = aggregate(rows, (d) => String(d.orderDate.getFullYear()));
    const regions = aggregate(rows, (d) => d.region);
    const states = aggregate(rows, (d) => `${d.country}|${d.state}`);
    const divisions = aggregate(rows, (d) => d.division);
    const products = aggregate(rows, (d) => d.product);
    const modes = aggregate(rows, (d) => d.shipMode);
    const customers = aggregate(rows, (d) => d.customerId);
    const routes = aggregate(rows, (d) => `${d.factory}|${d.region}|${d.state}`);

    routes.forEach((route) => {
      const [factory, region, destination] = route.key.split("|");
      route.factory = factory;
      route.region = region;
      route.destination = destination;
      route.label = `${factory} → ${destination}`;
      route.avgLead = average(route.leadTimes);
      route.leadStd = standardDeviation(route.leadTimes);
      route.delayRate = safeDivide(route.leadTimes.filter((lead) => lead > state.threshold).length, route.leadTimes.length);
    });

    customers.forEach((customer) => {
      customer.location = customer.rows[0]?.cityKey || "Unknown";
      customer.aov = safeDivide(customer.sales, customer.orders);
      customer.margin = safeDivide(customer.profit, customer.sales);
    });

    products.forEach((product) => {
      product.margin = safeDivide(product.profit, product.sales);
      product.asp = safeDivide(product.sales, product.units);
    });

    monthly.forEach((item) => item.margin = safeDivide(item.profit, item.sales));
    yearly.forEach((item) => item.margin = safeDivide(item.profit, item.sales));

    return { monthly, yearly, regions, states, divisions, products, modes, customers, routes };
  }

  function aggregate(rows, keyFn) {
    const map = new Map();

    rows.forEach((row) => {
      const key = keyFn(row);
      if (!map.has(key)) {
        map.set(key, {
          key,
          rows: [],
          sales: 0,
          profit: 0,
          cost: 0,
          units: 0,
          leadTimes: [],
          orderSet: new Set(),
          customerSet: new Set()
        });
      }

      const item = map.get(key);
      item.rows.push(row);
      item.sales += row.sales;
      item.profit += row.profit;
      item.cost += row.cost;
      item.units += row.units;
      if (Number.isFinite(row.leadTime)) item.leadTimes.push(row.leadTime);
      item.orderSet.add(row.orderId);
      item.customerSet.add(row.customerId);
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      rows: item.rows,
      orders: item.orderSet.size,
      customers: item.customerSet.size,
      avgLead: average(item.leadTimes),
      delayRate: safeDivide(item.leadTimes.filter((lead) => lead > state.threshold).length, item.leadTimes.length),
      margin: safeDivide(item.profit, item.sales)
    }));
  }

  function summarize(rows) {
    const orders = aggregate(rows, (d) => d.orderId);
    const sales = sum(rows, "sales");
    const profit = sum(rows, "profit");
    const cost = sum(rows, "cost");
    const units = sum(rows, "units");
    const leadTimes = rows.map((d) => d.leadTime).filter(Number.isFinite);

    return {
      rows: rows.length,
      sales,
      profit,
      cost,
      units,
      margin: safeDivide(profit, sales),
      asp: safeDivide(sales, units),
      orders: orders.length,
      customers: new Set(rows.map((d) => d.customerId)).size,
      aov: safeDivide(sales, orders.length),
      avgLead: average(leadTimes),
      medianLead: median(leadTimes),
      minLead: Math.min(...leadTimes),
      maxLead: Math.max(...leadTimes),
      delayed: leadTimes.filter((lead) => lead > state.threshold).length,
      delayRate: safeDivide(leadTimes.filter((lead) => lead > state.threshold).length, leadTimes.length),
      futureShipments: rows.filter((d) => d.shipDate && d.shipDate > DQ_ASOF).length,
      negativeLead: rows.filter((d) => Number.isFinite(d.leadTime) && d.leadTime < 0).length,
      zeroLead: rows.filter((d) => d.leadTime === 0).length,
      missingFactory: rows.filter((d) => d.factory === "Unmapped").length,
      orderObjects: orders
    };
  }

  function renderHero(metrics) {
    $("heroStats").innerHTML = `
      <div>
        <span>Filtered sales</span>
        <strong>${formatCurrency(metrics.sales)}</strong>
      </div>
      <div>
        <span>Gross profit</span>
        <strong>${formatCurrency(metrics.profit)}</strong>
      </div>
      <div>
        <span>Orders</span>
        <strong>${formatNumber(metrics.orders)}</strong>
      </div>
    `;
  }

  function renderKpis(metrics) {
    const cards = [
      { label: "Total sales", value: metrics.sales, formatter: formatCurrency, note: `${formatNumber(metrics.rows)} order lines in scope` },
      { label: "Gross profit", value: metrics.profit, formatter: formatCurrency, note: `${formatPercent(metrics.margin)} gross margin` },
      { label: "Orders", value: metrics.orders, formatter: formatNumber, note: `${formatCurrency(metrics.aov)} average order value` },
      { label: "Customers", value: metrics.customers, formatter: formatNumber, note: "Unique customer identifiers" },
      { label: "Units sold", value: metrics.units, formatter: formatNumber, note: `${formatCurrency(metrics.asp)} sales per unit` },
      { label: "Avg recorded lead", value: metrics.avgLead || 0, formatter: (v) => `${formatNumber(v, 0)} days`, noteClass: "warn", note: `${formatPercent(metrics.delayRate)} exceed ${state.threshold} days` }
    ];

    $("kpiGrid").innerHTML = cards.map((card, index) => `
      <article class="kpi-card" style="animation-delay:${index * 45}ms">
        <span>${card.label}</span>
        <strong class="kpi-value" data-value="${card.value}">${card.formatter(card.value)}</strong>
        <small class="kpi-note ${card.noteClass || ""}">${card.note}</small>
      </article>
    `).join("");
  }

  function renderHealth(rows, metrics) {
    $("dataHealthRibbon").innerHTML = `
      <strong>Shipping data anomaly:</strong>
      <span>
        ${formatPercent(metrics.delayRate)} of filtered records exceed ${state.threshold} recorded days.
        Median lead is ${formatNumber(metrics.medianLead || 0, 0)} days, and
        ${formatPercent(safeDivide(metrics.futureShipments, rows.length))} ship dates occur after ${formatDateShort(toInputDate(DQ_ASOF))}.
        Treat fulfillment timing as a data-governance finding, not verified operational latency.
      </span>
    `;
  }

  function renderInsights(metrics, aggregates) {
    const topRegion = maxBy(aggregates.regions, "sales");
    const topProduct = maxBy(aggregates.products, "sales");
    const topState = maxBy(aggregates.states, "sales");
    const bestMargin = maxBy(aggregates.products.filter((d) => d.sales >= 500), "margin");
    const repeatCustomers = aggregates.customers.filter((d) => d.orders > 1);
    const standard = aggregates.modes.find((d) => d.key === "Standard Class");

    const items = [
      {
        icon: "01",
        title: `Top-selling region: ${topRegion.key}`,
        text: `${formatCurrency(topRegion.sales)} in sales, representing ${formatPercent(safeDivide(topRegion.sales, metrics.sales))} of the filtered market.`
      },
      {
        icon: "02",
        title: `Best-selling product: ${topProduct.key}`,
        text: `${formatCurrency(topProduct.sales)} in sales across ${formatNumber(topProduct.units)} units.`
      },
      {
        icon: "03",
        title: `Most profitable core product: ${bestMargin.key}`,
        text: `${formatPercent(bestMargin.margin)} gross margin on ${formatCurrency(bestMargin.sales)} of sales.`
      },
      {
        icon: "04",
        title: `Largest state market: ${topState.key.split("|")[1]}`,
        text: `${formatCurrency(topState.sales)} in sales and ${formatNumber(topState.orders)} orders.`
      },
      {
        icon: "05",
        title: `${formatNumber(repeatCustomers.length)} repeat-purchase customers`,
        text: `Repeat customers contribute ${formatPercent(safeDivide(sum(repeatCustomers, "sales"), metrics.sales))} of current sales.`
      },
      {
        icon: "06",
        title: `Standard Class is the fulfillment backbone`,
        text: `${standard ? formatPercent(safeDivide(standard.sales, metrics.sales)) : "—"} of sales, making ship-mode reliability a strategic lever once timestamps are remediated.`
      }
    ];

    $("insightsList").innerHTML = items.map((item) => `
      <div class="insight-item">
        <span class="insight-icon">${item.icon}</span>
        <p><strong>${item.title}</strong>${item.text}</p>
      </div>
    `).join("");
  }

  function renderRecommendations(metrics, aggregates) {
    const kazookles = aggregates.products.find((d) => d.key === "Kazookles");
    const pacific = aggregates.regions.find((d) => d.key === "Pacific");
    const repeatCustomers = aggregates.customers.filter((d) => d.orders > 1);

    const recommendations = [
      {
        title: "Prioritize route timestamp remediation",
        text: `All filtered shipments exceed ${state.threshold} days. Validate ship-date extraction, timezone handling, and source-system year mapping before using route rankings for carrier decisions.`
      },
      {
        title: `Protect momentum in ${pacific.key}`,
        text: `${pacific.key} contributes ${formatPercent(safeDivide(pacific.sales, metrics.sales))} of sales. Use it as the first test market for inventory balancing and regional service improvements.`
      },
      {
        title: "Concentrate portfolio attention on top chocolate lines",
        text: "The five Wonka Bar variants dominate sales and profit. Maintain availability first, then use the lower-volume Sugar and Other lines for targeted experiments."
      },
      {
        title: kazookles ? "Reprice or re-source Kazookles" : "Review low-margin outliers",
        text: kazookles
          ? `Kazookles produces ${formatPercent(kazookles.margin)} margin on ${formatCurrency(kazookles.sales)} in sales. Review cost, pricing, bundle strategy, or supplier terms.`
          : "Continue monitoring products with materially lower margin than the portfolio average."
      },
      {
        title: "Grow repeat-purchase cohorts",
        text: `${formatNumber(repeatCustomers.length)} customers have more than one order. Introduce reorder prompts, multi-order bundles, and account-level retention offers.`
      }
    ];

    $("recommendationList").innerHTML = recommendations.map((item) => `
      <div class="recommendation-item">
        <span class="insight-icon">→</span>
        <p><strong>${item.title}</strong>${item.text}</p>
      </div>
    `).join("");
  }

  function renderOverviewCharts(metrics, aggregates) {
    renderTrendChart(aggregates.monthly);
    renderDivisionChart(aggregates.divisions);
    renderRegionChart(aggregates.regions);
    renderStateChart(aggregates.states);
  }

  function renderTrendChart(monthly) {
    const data = monthly.sort((a, b) => a.key.localeCompare(b.key));

    setChart("trendChart", {
      color: COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        valueFormatter: (value) => formatCurrency(value)
      },
      legend: { textStyle: { color: "#b7c3d8" }, top: 0 },
      grid: { left: 60, right: 60, top: 55, bottom: 45 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.key),
        axisLabel: { color: "#94a3b8" },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      yAxis: [
        {
          type: "value",
          axisLabel: { color: "#94a3b8", formatter: compactCurrency },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
        },
        {
          type: "value",
          axisLabel: { color: "#94a3b8", formatter: compactCurrency },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Sales",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: data.map((d) => round(d.sales, 2)),
          lineStyle: { width: 4 },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0,212,255,.34)" },
                { offset: 1, color: "rgba(0,212,255,.01)" }
              ]
            }
          }
        },
        {
          name: "Gross profit",
          type: "bar",
          yAxisIndex: 1,
          barWidth: "42%",
          itemStyle: {
            borderRadius: [7, 7, 0, 0],
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "#7c5cff" },
                { offset: 1, color: "rgba(124,92,255,.28)" }
              ]
            }
          },
          data: data.map((d) => round(d.profit, 2))
        }
      ]
    });
  }

  function renderDivisionChart(divisions) {
    const chart = setChart("divisionChart", {
      color: COLORS,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => `${escapeHtml(params.name)}<br>${formatCurrency(params.value)} · ${formatPercent(params.percent / 100)}`
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#b7c3d8" },
        icon: "circle"
      },
      series: [{
        name: "Division",
        type: "pie",
        radius: ["52%", "76%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: "#0b1020",
          borderWidth: 4,
          borderRadius: 10
        },
        label: {
          color: "#dbe5f5",
          formatter: "{b}\n{d}%"
        },
        data: divisions.sort((a, b) => b.sales - a.sales).map((d) => ({
          name: d.key,
          value: round(d.sales, 2)
        }))
      }]
    });

    bindChartClick(chart, (params) => {
      state.divisions = [params.name];
      renderChips("divisionChips", unique(records.map((d) => d.division)), "divisions");
      renderDashboard();
      showToast(`Filtered to ${params.name}`);
    });
  }

  function renderRegionChart(regions) {
    const data = regions.sort((a, b) => b.sales - a.sales);
    const chart = setChart("regionChart", {
      color: COLORS,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const region = data[params[0].dataIndex];
          return `${escapeHtml(region.key)}<br>Sales: ${formatCurrency(region.sales)}<br>Profit: ${formatCurrency(region.profit)}<br>Orders: ${formatNumber(region.orders)}<br>Margin: ${formatPercent(region.margin)}`;
        }
      },
      grid: { left: 70, right: 25, top: 20, bottom: 40 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.key),
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", formatter: compactCurrency },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
      },
      series: [{
        type: "bar",
        barWidth: "48%",
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#00d4ff" },
              { offset: 1, color: "rgba(0,212,255,.25)" }
            ]
          }
        },
        data: data.map((d) => round(d.sales, 2))
      }]
    });

    bindChartClick(chart, (params) => {
      state.regions = [params.name];
      renderChips("regionChips", unique(records.map((d) => d.region)), "regions");
      renderDashboard();
      showToast(`Filtered to ${params.name}`);
    });
  }

  function renderStateChart(states) {
    const data = states
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .reverse();

    const chart = setChart("stateChart", {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const stateItem = data[params[0].dataIndex];
          return `${escapeHtml(stateItem.key.split("|")[1])}<br>Sales: ${formatCurrency(stateItem.sales)}<br>Profit: ${formatCurrency(stateItem.profit)}<br>Orders: ${formatNumber(stateItem.orders)}`;
        }
      },
      grid: { left: 115, right: 35, top: 10, bottom: 30 },
      xAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", formatter: compactCurrency },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
      },
      yAxis: {
        type: "category",
        data: data.map((d) => d.key.split("|")[1]),
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      series: [{
        type: "bar",
        barWidth: "55%",
        itemStyle: {
          borderRadius: [0, 9, 9, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: "rgba(255,181,71,.35)" },
              { offset: 1, color: "#ffb547" }
            ]
          }
        },
        data: data.map((d) => round(d.sales, 2))
      }]
    });

    bindChartClick(chart, (params) => {
      const destination = params.name;
      state.states = [destination];
      syncControls();
      renderDashboard();
      showToast(`Filtered to ${destination}`);
    });
  }

  function renderCustomerCharts(metrics, aggregates) {
    renderProductChart(aggregates.products);
    renderHeatmapChart(aggregates.products, aggregates.regions);
    renderAovChart(metrics.orderObjects);
    renderCustomerSegments(aggregates.customers);
    renderTopCustomers(aggregates.customers);
  }

  function renderProductChart(products) {
    const data = products.sort((a, b) => b.sales - a.sales).slice(0, 12).reverse();

    const chart = setChart("productChart", {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const item = data[params[0].dataIndex];
          return `${escapeHtml(item.key)}<br>Sales: ${formatCurrency(item.sales)}<br>Profit: ${formatCurrency(item.profit)}<br>Units: ${formatNumber(item.units)}<br>Margin: ${formatPercent(item.margin)}`;
        }
      },
      grid: { left: 215, right: 35, top: 10, bottom: 30 },
      xAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", formatter: compactCurrency },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
      },
      yAxis: {
        type: "category",
        data: data.map((d) => truncate(d.key, 28)),
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      series: [{
        type: "bar",
        barWidth: "54%",
        showBackground: true,
        backgroundStyle: { color: "rgba(255,255,255,.035)", borderRadius: 9 },
        itemStyle: {
          borderRadius: [0, 9, 9, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: "rgba(124,92,255,.35)" },
              { offset: 1, color: "#7c5cff" }
            ]
          }
        },
        data: data.map((d) => round(d.sales, 2))
      }]
    });

    bindChartClick(chart, (params) => {
      const item = data[params.dataIndex];
      state.products = [item.key];
      syncControls();
      renderDashboard();
      showToast(`Filtered to ${item.key}`);
    });
  }

  function renderHeatmapChart(products, regions) {
    const topProducts = products.sort((a, b) => b.sales - a.sales).slice(0, 10).map((d) => d.key);
    const regionNames = regions.sort((a, b) => a.key.localeCompare(b.key)).map((d) => d.key);
    const metric = state.heatmapMetric || "margin";

    const grouped = aggregate(records.filter((d) =>
      topProducts.includes(d.product) && regionNames.includes(d.region)
    ), (d) => `${d.product}|${d.region}`);

    const lookup = new Map(grouped.map((d) => [d.key, d]));
    const data = [];

    topProducts.forEach((product, y) => {
      regionNames.forEach((region, x) => {
        const item = lookup.get(`${product}|${region}`);
        const value = !item
          ? null
          : metric === "margin"
            ? round(item.margin * 100, 1)
            : round(metric === "profit" ? item.profit : item.sales, 2);
        data.push([x, y, value]);
      });
    });

    const values = data.map((d) => d[2]).filter(Number.isFinite);
    const formatter = metric === "margin"
      ? (value) => `${formatNumber(value, 1)}%`
      : formatCurrency;

    const chart = setChart("heatmapChart", {
      tooltip: {
        position: "top",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const [x, y, value] = params.data;
          const product = topProducts[y];
          const region = regionNames[x];
          const item = lookup.get(`${product}|${region}`);
          if (!item) return `${product}<br>${region}<br>No records`;
          return `${escapeHtml(product)}<br>${escapeHtml(region)}<br>${metricLabel(metric)}: ${formatter(value)}<br>Sales: ${formatCurrency(item.sales)}<br>Profit: ${formatCurrency(item.profit)}`;
        }
      },
      grid: { left: 225, right: 40, top: 20, bottom: 90 },
      xAxis: {
        type: "category",
        data: regionNames,
        splitArea: { show: true },
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { show: false }
      },
      yAxis: {
        type: "category",
        data: topProducts.map((d) => truncate(d, 29)),
        splitArea: { show: true },
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { show: false }
      },
      visualMap: {
        min: metric === "margin" ? 0 : Math.min(...values),
        max: metric === "margin" ? 85 : Math.max(...values),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 15,
        textStyle: { color: "#b7c3d8" },
        inRange: {
          color: metric === "margin"
            ? ["#3b2a78", "#7c5cff", "#00d4ff", "#39d98a"]
            : ["#172554", "#5a8cff", "#00d4ff", "#39d98a"]
        },
        formatter: (value) => metric === "margin" ? `${value}%` : compactCurrency(value)
      },
      series: [{
        name: metricLabel(metric),
        type: "heatmap",
        data,
        label: {
          show: true,
          color: "#fff",
          fontWeight: 800,
          formatter: (params) => Number.isFinite(params.data[2]) ? formatter(params.data[2]) : "—"
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 18,
            shadowColor: "rgba(0,0,0,.45)"
          }
        },
        itemStyle: {
          borderColor: "#0b1020",
          borderWidth: 4,
          borderRadius: 8
        }
      }]
    });

    bindChartClick(chart, (params) => {
      const [x, y] = params.data;
      state.regions = [regionNames[x]];
      state.products = [topProducts[y]];
      renderChips("regionChips", unique(records.map((d) => d.region)), "regions");
      syncControls();
      renderDashboard();
      showToast(`Filtered to ${topProducts[y]} · ${regionNames[x]}`);
    });
  }

  function renderAovChart(orders) {
    const bins = [0, 5, 10, 15, 20, 30, 40, 50, Infinity];
    const labels = ["<$5", "$5–10", "$10–15", "$15–20", "$20–30", "$30–40", "$40–50", "$50+"];
    const counts = new Array(labels.length).fill(0);

    orders.forEach((order) => {
      const index = bins.findIndex((bin, i) => order.sales >= bin && order.sales < bins[i + 1]);
      if (index >= 0) counts[index] += 1;
    });

    setChart("aovChart", {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => `${params[0].name}<br>${formatNumber(params[0].value)} orders`
      },
      grid: { left: 55, right: 20, top: 20, bottom: 42 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
      },
      series: [{
        type: "bar",
        barWidth: "52%",
        itemStyle: {
          borderRadius: [9, 9, 0, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#39d98a" },
              { offset: 1, color: "rgba(57,217,138,.25)" }
            ]
          }
        },
        data: counts
      }]
    });
  }

  function renderCustomerSegments(customers) {
    const segments = [
      { key: "One order", test: (orders) => orders === 1 },
      { key: "2 orders", test: (orders) => orders === 2 },
      { key: "3–4 orders", test: (orders) => orders >= 3 && orders <= 4 },
      { key: "5–9 orders", test: (orders) => orders >= 5 && orders <= 9 },
      { key: "10+ orders", test: (orders) => orders >= 10 }
    ].map((segment) => {
      const rows = customers.filter((d) => segment.test(d.orders));
      return {
        key: segment.key,
        customers: rows.length,
        orders: sum(rows, "orders"),
        sales: sum(rows, "sales"),
        profit: sum(rows, "profit")
      };
    });

    setChart("customerSegmentChart", {
      color: COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const segment = segments[params[0].dataIndex];
          return `${segment.key}<br>Customers: ${formatNumber(segment.customers)}<br>Orders: ${formatNumber(segment.orders)}<br>Sales: ${formatCurrency(segment.sales)}<br>Profit: ${formatCurrency(segment.profit)}`;
        }
      },
      legend: { top: 0, textStyle: { color: "#b7c3d8" } },
      grid: { left: 65, right: 65, top: 50, bottom: 40 },
      xAxis: {
        type: "category",
        data: segments.map((d) => d.key),
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      yAxis: [
        {
          type: "value",
          name: "Sales",
          axisLabel: { color: "#94a3b8", formatter: compactCurrency },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
        },
        {
          type: "value",
          name: "Customers",
          axisLabel: { color: "#94a3b8" },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Sales",
          type: "bar",
          barWidth: "38%",
          itemStyle: {
            borderRadius: [9, 9, 0, 0],
            color: "#5a8cff"
          },
          data: segments.map((d) => round(d.sales, 2))
        },
        {
          name: "Customers",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 4 },
          data: segments.map((d) => d.customers)
        }
      ]
    });
  }

  function renderTopCustomers(customers) {
    const data = customers.sort((a, b) => b.sales - a.sales).slice(0, 10);
    $("topCustomersBody").innerHTML = data.map((customer) => `
      <tr>
        <td><strong>Customer ${escapeHtml(customer.key)}</strong><br><small>${escapeHtml(customer.location)}</small></td>
        <td>${formatNumber(customer.orders)}</td>
        <td>${formatCurrency(customer.sales)}</td>
        <td>${formatPercent(customer.margin)}</td>
      </tr>
    `).join("");
  }

  function renderFulfillmentCharts(metrics, aggregates) {
    renderShipModeChart(aggregates.modes, metrics);
    renderRouteChart(aggregates.routes);
    renderNetworkChart(aggregates.routes);
    renderRouteTables(aggregates.routes);
  }

  function renderShipModeChart(modes, metrics) {
    const data = modes.sort((a, b) => b.sales - a.sales);

    const chart = setChart("shipModeChart", {
      color: COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const item = data[params[0].dataIndex];
          return `${escapeHtml(item.key)}<br>Sales: ${formatCurrency(item.sales)}<br>Profit: ${formatCurrency(item.profit)}<br>Sales share: ${formatPercent(safeDivide(item.sales, metrics.sales))}<br>Avg recorded lead: ${formatNumber(item.avgLead || 0, 0)} days`;
        }
      },
      legend: { top: 0, textStyle: { color: "#b7c3d8" } },
      grid: { left: 65, right: 65, top: 55, bottom: 50 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.key),
        axisLabel: { color: "#cbd5e1", fontWeight: 700, interval: 0 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      yAxis: [
        {
          type: "value",
          axisLabel: { color: "#94a3b8", formatter: compactCurrency },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
        },
        {
          type: "value",
          name: "Days",
          axisLabel: { color: "#94a3b8" },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Sales",
          type: "bar",
          barWidth: "28%",
          itemStyle: { color: "#00d4ff", borderRadius: [8, 8, 0, 0] },
          data: data.map((d) => round(d.sales, 2))
        },
        {
          name: "Gross profit",
          type: "bar",
          barWidth: "28%",
          itemStyle: { color: "#7c5cff", borderRadius: [8, 8, 0, 0] },
          data: data.map((d) => round(d.profit, 2))
        },
        {
          name: "Avg recorded lead",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 4, color: "#ffb547" },
          itemStyle: { color: "#ffb547" },
          data: data.map((d) => round(d.avgLead || 0, 1))
        }
      ]
    });

    bindChartClick(chart, (params) => {
      if (!params.name) return;
      state.shipModes = [params.name];
      renderChips("modeChips", unique(records.map((d) => d.shipMode)), "shipModes");
      renderDashboard();
      showToast(`Filtered to ${params.name}`);
    });
  }

  function renderRouteChart(routes) {
    const eligible = routes.filter((d) => d.orders >= 10);
    const fastest = eligible.sort((a, b) => a.avgLead - b.avgLead).slice(0, 8);
    const slowest = eligible.sort((a, b) => b.avgLead - a.avgLead).slice(0, 8);
    const data = [...fastest, ...slowest].sort((a, b) => a.avgLead - b.avgLead);

    const chart = setChart("routeChart", {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const route = data[params[0].dataIndex];
          return `${escapeHtml(route.label)}<br>Orders: ${formatNumber(route.orders)}<br>Sales: ${formatCurrency(route.sales)}<br>Avg recorded lead: ${formatNumber(route.avgLead, 1)} days<br>Lead variability: ${formatNumber(route.leadStd || 0, 1)} days<br>Threshold breach: ${formatPercent(route.delayRate)}`;
        }
      },
      grid: { left: 235, right: 55, top: 10, bottom: 35 },
      xAxis: {
        type: "value",
        name: "Days",
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.06)" } }
      },
      yAxis: {
        type: "category",
        data: data.map((d) => truncate(d.label, 34)),
        axisLabel: { color: "#cbd5e1", fontWeight: 700 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } }
      },
      series: [{
        type: "bar",
        barWidth: "52%",
        itemStyle: {
          borderRadius: [0, 9, 9, 0],
          color: (params) => {
            const route = data[params.dataIndex];
            return route.avgLead <= average(data.map((d) => d.avgLead))
              ? "#39d98a"
              : "#ff6b7a";
          }
        },
        data: data.map((d) => round(d.avgLead, 1))
      }]
    });

    bindChartClick(chart, (params) => {
      const route = data[params.dataIndex];
      state.states = [route.destination];
      syncControls();
      renderDashboard();
      showToast(`Filtered to ${route.destination}`);
    });
  }

  function renderNetworkChart(routes) {
    const stateAgg = new Map();

    routes.forEach((route) => {
      if (!stateAgg.has(route.destination)) {
        stateAgg.set(route.destination, {
          key: route.destination,
          region: route.region,
          sales: 0,
          profit: 0,
          orders: 0
        });
      }
      const item = stateAgg.get(route.destination);
      item.sales += route.sales;
      item.profit += route.profit;
      item.orders += route.orders;
    });

    const stateNodes = Array.from(stateAgg.values())
      .filter((d) => STATE_COORDS[d.key])
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 38);

    const routeLines = routes
      .filter((route) => STATE_COORDS[route.destination] && FACTORY_COORDS[route.factory])
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 85)
      .map((route) => {
        const factory = FACTORY_COORDS[route.factory];
        const destination = STATE_COORDS[route.destination];
        return {
          coords: [[factory.lon, factory.lat], [destination[1], destination[0]]],
          route
        };
      });

    const chart = setChart("networkChart", {
      animationDuration: 1200,
      tooltip: {
        backgroundColor: "rgba(10,15,29,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#fff" },
        formatter: (params) => {
          if (params.seriesName === "Factories") {
            const factory = params.data.factory;
            const factoryRoutes = routes.filter((d) => d.factory === factory);
            return `<strong>${escapeHtml(factory)}</strong><br>Orders: ${formatNumber(sum(factoryRoutes, "orders"))}<br>Sales: ${formatCurrency(sum(factoryRoutes, "sales"))}`;
          }
          if (params.seriesName === "Customer states") {
            const node = params.data.node;
            return `<strong>${escapeHtml(node.key)}</strong><br>${escapeHtml(node.region)}<br>Orders: ${formatNumber(node.orders)}<br>Sales: ${formatCurrency(node.sales)}<br>Profit: ${formatCurrency(node.profit)}`;
          }
          const route = params.data.route;
          return `<strong>${escapeHtml(route.label)}</strong><br>Orders: ${formatNumber(route.orders)}<br>Sales: ${formatCurrency(route.sales)}<br>Profit: ${formatCurrency(route.profit)}<br>Avg recorded lead: ${formatNumber(route.avgLead, 1)} days`;
        }
      },
      grid: { left: 35, right: 35, top: 35, bottom: 35 },
      xAxis: {
        type: "value",
        min: -135,
        max: -55,
        show: false
      },
      yAxis: {
        type: "value",
        min: 22,
        max: 72,
        show: false
      },
      series: [
        {
          name: "Routes",
          type: "lines",
          coordinateSystem: "cartesian2d",
          zlevel: 1,
          effect: {
            show: true,
            period: 5,
            trailLength: 0.35,
            symbol: "arrow",
            symbolSize: 5,
            color: "#00d4ff"
          },
          lineStyle: {
            width: 1.4,
            opacity: 0.34,
            curveness: 0.18,
            color: "rgba(0,212,255,.55)"
          },
          emphasis: {
            lineStyle: { width: 3, opacity: 0.9 }
          },
          data: routeLines
        },
        {
          name: "Factories",
          type: "scatter",
          coordinateSystem: "cartesian2d",
          zlevel: 3,
          symbolSize: 19,
          itemStyle: {
            color: "#ffb547",
            borderColor: "#fff3d6",
            borderWidth: 2,
            shadowBlur: 16,
            shadowColor: "rgba(255,181,71,.6)"
          },
          label: {
            show: true,
            position: "top",
            color: "#fff",
            fontWeight: 800,
            formatter: (params) => params.data.factory
          },
          data: Object.entries(FACTORY_COORDS).map(([factory, coords]) => ({
            name: factory,
            factory,
            value: [coords.lon, coords.lat]
          }))
        },
        {
          name: "Customer states",
          type: "scatter",
          coordinateSystem: "cartesian2d",
          zlevel: 2,
          symbolSize: (value, params) => Math.max(8, Math.sqrt(params.data.node.orders) * 1.35),
          itemStyle: {
            color: {
              type: "radial", x: 0.5, y: 0.5, r: 0.5,
              colorStops: [
                { offset: 0, color: "rgba(124,92,255,.95)" },
                { offset: 1, color: "rgba(0,212,255,.32)" }
              ]
            },
            borderColor: "rgba(255,255,255,.82)",
            borderWidth: 1.2
          },
          label: {
            show: true,
            position: "right",
            color: "#dbe5f5",
            fontSize: 10,
            fontWeight: 700,
            formatter: (params) => params.data.node.key
          },
          data: stateNodes.map((node) => {
            const coords = STATE_COORDS[node.key];
            return {
              name: node.key,
              node,
              value: [coords[1], coords[0]]
            };
          })
        }
      ]
    });

    bindChartClick(chart, (params) => {
      if (params.seriesName !== "Customer states" || !params.data.node) return;
      state.states = [params.data.node.key];
      syncControls();
      renderDashboard();
      showToast(`Filtered to ${params.data.node.key}`);
    });
  }

  function renderRouteTables(routes) {
    const eligible = routes.filter((d) => d.orders >= 10);
    const fastest = eligible.sort((a, b) => a.avgLead - b.avgLead).slice(0, 8);
    const slowest = eligible.sort((a, b) => b.avgLead - a.avgLead).slice(0, 8);

    const row = (route) => `
      <tr>
        <td><strong>${escapeHtml(route.factory)}</strong></td>
        <td>${escapeHtml(route.destination)}<br><small>${escapeHtml(route.region)}</small></td>
        <td>${formatNumber(route.orders)}</td>
        <td>${formatNumber(route.avgLead, 1)} days</td>
      </tr>
    `;

    $("fastRouteBody").innerHTML = fastest.map(row).join("");
    $("slowRouteBody").innerHTML = slowest.map(row).join("");
  }

  function renderExplorer(metrics, aggregates) {
    renderQualityPanel(metrics);
    renderOrderTable();
    renderProductTable(aggregates.products);
  }

  function renderQualityPanel(metrics) {
    const total = Math.max(metrics.rows, 1);
    const items = [
      ["Rows in scope", formatNumber(metrics.rows)],
      ["Missing factory mapping", formatNumber(metrics.missingFactory)],
      ["Negative lead times", formatNumber(metrics.negativeLead)],
      ["Zero-day lead times", formatNumber(metrics.zeroLead)],
      [`Lead times > ${state.threshold} days`, `${formatNumber(metrics.delayed)} (${formatPercent(metrics.delayRate)})`],
      ["Ship dates after 2026-09-29", `${formatNumber(metrics.futureShipments)} (${formatPercent(safeDivide(metrics.futureShipments, total))})`],
      ["Lead-time range", `${formatNumber(metrics.minLead || 0, 0)}–${formatNumber(metrics.maxLead || 0, 0)} days`],
      ["Median lead time", `${formatNumber(metrics.medianLead || 0, 0)} days`]
    ];

    $("qualityPanel").innerHTML = items.map(([label, value]) => `
      <div class="quality-item">
        <p><strong>${label}</strong><span>Calculated from the active filtered dataset.</span></p>
        <strong>${value}</strong>
      </div>
    `).join("");
  }

  function renderOrderTable() {
    const rows = currentOrderRows()
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 150);

    $("ordersBody").innerHTML = rows.map((order) => `
      <tr>
        <td>${formatDateShort(order.rows[0].orderDateText)}</td>
        <td><strong>${escapeHtml(order.key)}</strong><br><small>${formatNumber(order.rows.length)} line${order.rows.length === 1 ? "" : "s"}</small></td>
        <td>Customer ${escapeHtml(order.rows[0].customerId)}</td>
        <td>${escapeHtml(order.rows[0].cityKey)}</td>
        <td>${escapeHtml(order.rows[0].shipMode)}</td>
        <td>${formatCurrency(order.sales)}</td>
        <td>${formatCurrency(order.profit)}</td>
        <td>${formatNumber(order.avgLead || 0, 0)} days</td>
      </tr>
    `).join("");
  }

  function renderProductTable(products) {
    const rows = products.sort((a, b) => b.sales - a.sales);

    $("productTableBody").innerHTML = rows.map((product) => {
      const factory = product.rows[0]?.factory || "Unknown";
      const division = product.rows[0]?.division || "Unknown";
      return `
        <tr>
          <td><strong>${escapeHtml(product.key)}</strong></td>
          <td>${escapeHtml(division)}</td>
          <td>${escapeHtml(factory)}</td>
          <td>${formatNumber(product.orders)}</td>
          <td>${formatNumber(product.units)}</td>
          <td>${formatCurrency(product.sales)}</td>
          <td>${formatCurrency(product.profit)}</td>
          <td>${formatPercent(product.margin)}</td>
        </tr>
      `;
    }).join("");
  }

  function currentOrderRows() {
    const search = ($("tableSearch").value || "").trim().toLowerCase();
    let orders = summarize(filteredRows()).orderObjects;

    if (!search) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.key,
        order.rows[0].customerId,
        order.rows[0].cityKey,
        order.rows[0].shipMode,
        ...order.rows.map((row) => row.product)
      ].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }

  function exportFilteredOrders() {
    const orders = currentOrderRows();
    const header = ["Order ID", "Order Date", "Customer ID", "Country", "State", "City", "Region", "Ship Mode", "Lines", "Sales", "Gross Profit", "Units", "Recorded Lead Days"];
    const lines = orders.map((order) => {
      const first = order.rows[0];
      return [
        order.key,
        first.orderDateText,
        first.customerId,
        first.country,
        first.state,
        first.city,
        first.region,
        first.shipMode,
        order.rows.length,
        round(order.sales, 2),
        round(order.profit, 2),
        order.units,
        round(order.avgLead || 0, 0)
      ].map(csvEscape).join(",");
    });

    const csv = [header.map(csvEscape).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nassau-candy-filtered-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${formatNumber(orders.length)} orders`);
  }

  function setChart(id, option) {
    const element = $(id);
    if (!element) return null;
    if (!charts[id]) charts[id] = echarts.init(element, null, { renderer: "canvas" });
    charts[id].setOption(option, true);
    return charts[id];
  }

  function bindChartClick(chart, handler) {
    if (!chart || chart.__nassauClickBound) return;
    chart.on("click", handler);
    chart.__nassauClickBound = true;
  }

  function activateTab(tab, persist = true) {
    state.tab = tab || "overview";
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === state.tab);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${state.tab}`);
    });
    if (persist) saveState();
    requestAnimationFrame(() => {
      resizeCharts();
      if (records.length) renderDashboard();
    });
  }

  function resizeCharts() {
    Object.values(charts).forEach((chart) => {
      const element = chart.getDom();
      if (element.clientWidth && element.clientHeight) chart.resize();
    });
  }

  function openFilters() {
    $("filterPanel").classList.add("open");
    $("filterBackdrop").classList.add("active");
  }

  function closeFilters() {
    $("filterPanel").classList.remove("open");
    $("filterBackdrop").classList.remove("active");
  }

  function countActiveFilters() {
    return [
      state.regions,
      state.states,
      state.cities,
      state.divisions,
      state.products,
      state.shipModes
    ].reduce((total, values) => total + values.length, 0);
  }

  function setLoading(isLoading) {
    $("loader").classList.toggle("done", !isLoading);
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function metricLabel(metric) {
    return metric === "margin" ? "Gross margin" : metric === "profit" ? "Gross profit" : "Sales";
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  }

  function average(values) {
    const clean = values.filter(Number.isFinite);
    return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
  }

  function standardDeviation(values) {
    const clean = values.filter(Number.isFinite);
    if (clean.length < 2) return 0;
    const mean = average(clean);
    return Math.sqrt(clean.reduce((total, value) => total + ((value - mean) ** 2), 0) / (clean.length - 1));
  }

  function median(values) {
    const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!clean.length) return 0;
    const middle = Math.floor(clean.length / 2);
    return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
  }

  function min(values) {
    return new Date(Math.min(...values.map((value) => value.getTime())));
  }

  function max(values) {
    return new Date(Math.max(...values.map((value) => value.getTime())));
  }

  function maxBy(rows, key) {
    return rows.reduce((best, row) => row[key] > (best?.[key] ?? -Infinity) ? row : best, rows[0]);
  }

  function safeDivide(numerator, denominator) {
    return denominator ? numerator / denominator : 0;
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2
    }).format(value || 0);
  }

  function compactCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value || 0);
  }

  function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(value || 0);
  }

  function formatPercent(value) {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1
    }).format(value || 0);
  }

  function formatDateShort(value) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function truncate(value, length) {
    const text = String(value);
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function debounce(callback, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), delay);
    };
  }
})();