const NS = "http://www.w3.org/2000/svg";

const COLORS = {
  "brazilian-private": "#176b4b",
  "international-private": "#2b8a58",
  "private-research": "#d7a928",
  "public-research": "#b85c3d",
  "state-owned": "#596a83",
};

const COPY = {
  en: {
    subtitle: "A living atlas of Brazil’s semiconductor and FPGA ecosystem",
    directory: "Directory",
    github: "View on GitHub",
    search: "Search organizations or locations",
    type: "Organization type",
    reset: "Reset filters",
    organizations: "Organizations",
    locations: "Location entries",
    clusters: "Clusters",
    results: "organizations shown",
    filters: "Filters",
    close: "Close",
    heatmap: "Heatmap",
    intensity: "Cluster intensity",
    low: "Low",
    high: "High",
    center: "Cluster center",
    clusterList: "Organizations in this cluster",
    empty: "No organizations match these filters.",
    source: "View source",
    sourceMore: "Additional source",
    activity: "Microelectronics / FPGA activity",
    presence: "Locations",
    approximate:
      "Broad regional clusters use representative coordinates. The organization grouping follows the source workbooks.",
    directoryTitle: "Organization directory",
    directoryIntro:
      "Search the complete dataset, compare organization types, and open the original sources.",
    name: "Organization",
    back: "Back to cluster",
    mapLoadError: "The roadmap data could not be loaded.",
  },
  pt: {
    subtitle: "Um atlas vivo do ecossistema brasileiro de semicondutores e FPGA",
    directory: "Diretório",
    github: "Ver no GitHub",
    search: "Buscar organizações ou localidades",
    type: "Tipo de organização",
    reset: "Limpar filtros",
    organizations: "Organizações",
    locations: "Registros geográficos",
    clusters: "Polos",
    results: "organizações exibidas",
    filters: "Filtros",
    close: "Fechar",
    heatmap: "Mapa de calor",
    intensity: "Intensidade do polo",
    low: "Baixa",
    high: "Alta",
    center: "Centro do polo",
    clusterList: "Organizações neste polo",
    empty: "Nenhuma organização corresponde aos filtros.",
    source: "Ver fonte",
    sourceMore: "Fonte adicional",
    activity: "Atuação em microeletrônica / FPGA",
    presence: "Localidades",
    approximate:
      "Polos regionais amplos usam coordenadas representativas. O agrupamento segue as planilhas de origem.",
    directoryTitle: "Diretório de organizações",
    directoryIntro:
      "Consulte o conjunto completo, compare os tipos de organização e abra as fontes originais.",
    name: "Organização",
    back: "Voltar ao polo",
    mapLoadError: "Não foi possível carregar os dados do mapa.",
  },
};

const state = {
  language: new URLSearchParams(location.search).get("lang") === "pt" ? "pt" : "en",
  query: "",
  categories: new Set(),
  selectedCluster: null,
  selectedCompany: null,
  heat: true,
  zoom: 1,
};

let roadmap;
let mapData;
let companyByName;
let companyById;
let clusterById;

const elements = {
  categoryList: document.querySelector("#category-list"),
  closeFilters: document.querySelector("#close-filters"),
  detail: document.querySelector("#detail-card"),
  directoryBody: document.querySelector("#directory-body"),
  directoryFraction: document.querySelector("#directory-fraction"),
  directorySearch: document.querySelector("#directory-search"),
  emptyDirectory: document.querySelector("#empty-directory"),
  emptyMap: document.querySelector("#empty-map"),
  filterPanel: document.querySelector("#filter-panel"),
  footerData: document.querySelector("#footer-data"),
  footerMap: document.querySelector("#footer-map"),
  github: document.querySelector("#github-link"),
  heatLayer: document.querySelector("#heat-layer"),
  heatToggle: document.querySelector("#heat-toggle"),
  mapSearch: document.querySelector("#map-search"),
  markerLayer: document.querySelector("#marker-layer"),
  mobileCount: document.querySelector("#mobile-count"),
  mobileFilters: document.querySelector("#mobile-filters"),
  resetFilters: document.querySelector("#reset-filters"),
  resultCount: document.querySelector("#result-count"),
  stateLayer: document.querySelector("#state-layer"),
  suggestions: document.querySelector("#suggestions"),
  zoomLayer: document.querySelector("#map-zoom-layer"),
};

function htmlElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function externalIcon() {
  const icon = svgElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
  icon.append(
    svgElement("path", {
      d: "M14 5h5v5M12 12l7-7M19 13v6H5V5h6",
    }),
  );
  return icon;
}

function translate() {
  const t = COPY[state.language];
  document.documentElement.lang = state.language === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("[data-copy]").forEach((element) => {
    element.textContent = t[element.dataset.copy] || "";
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.mapSearch.placeholder = t.search;
  elements.directorySearch.placeholder = t.search;
}

function project(longitude, latitude) {
  const bounds = mapData.bounds;
  return {
    x:
      ((longitude - bounds.minLongitude) /
        (bounds.maxLongitude - bounds.minLongitude)) *
      780,
    y:
      ((bounds.maxLatitude - latitude) /
        (bounds.maxLatitude - bounds.minLatitude)) *
      720,
  };
}

function renderStates() {
  const fragment = document.createDocumentFragment();
  mapData.states.forEach((item) => {
    const path = svgElement("path", { d: item.path, "data-state": item.code });
    const title = svgElement("title");
    title.textContent = item.name;
    path.append(title);
    fragment.append(path);
  });
  elements.stateLayer.replaceChildren(fragment);
}

function filteredCompanies() {
  const query = state.query.trim().toLocaleLowerCase(state.language);
  return roadmap.companies.filter((company) => {
    if (!state.categories.has(company.category)) return false;
    if (!query) return true;
    const locations = company.locations
      .map((id) => clusterById.get(id)?.label[state.language] || "")
      .join(" ");
    return [
      company.name,
      company.activity[state.language],
      company.organizationType[state.language],
      locations,
    ]
      .join(" ")
      .toLocaleLowerCase(state.language)
      .includes(query);
  });
}

function categoryCounts() {
  const counts = {};
  roadmap.companies.forEach((company) => {
    counts[company.category] = (counts[company.category] || 0) + 1;
  });
  return counts;
}

function renderCategories() {
  const counts = categoryCounts();
  const fragment = document.createDocumentFragment();
  Object.entries(roadmap.categoryLabels).forEach(([category, label]) => {
    const row = htmlElement("label");
    const input = htmlElement("input");
    input.type = "checkbox";
    input.checked = state.categories.has(category);
    input.dataset.category = category;
    const check = htmlElement("span", "custom-check", input.checked ? "✓" : "");
    const dot = htmlElement("span", "category-dot");
    dot.style.background = COLORS[category];
    const name = htmlElement("span", "category-name", label[state.language]);
    const count = htmlElement("span", "category-count", counts[category] || 0);
    row.append(input, check, dot, name, count);
    fragment.append(row);
  });
  elements.categoryList.replaceChildren(fragment);
}

function renderMap(companies) {
  const names = new Set(companies.map((company) => company.name));
  const heatFragment = document.createDocumentFragment();
  const markerFragment = document.createDocumentFragment();

  roadmap.clusters.forEach((cluster) => {
    const visibleCount = cluster.companies.filter((name) => names.has(name)).length;
    const point = project(cluster.longitude, cluster.latitude);
    if (visibleCount && state.heat) {
      heatFragment.append(
        svgElement("circle", {
          cx: point.x,
          cy: point.y,
          r: 28 + visibleCount * 4.8,
          opacity: 0.34 + Math.min(visibleCount / 15, 0.38),
        }),
      );
    }

    const group = svgElement("g", {
      class: `cluster-marker${cluster.id === state.selectedCluster ? " selected" : ""}${
        visibleCount ? "" : " dimmed"
      }`,
      transform: `translate(${point.x} ${point.y})`,
      role: "button",
      tabindex: "0",
      "data-cluster": cluster.id,
      "aria-label": `${cluster.label[state.language]}: ${visibleCount} ${COPY[
        state.language
      ].organizations}`,
    });
    group.append(
      svgElement("circle", { class: "marker-hit", r: 22 }),
      svgElement("circle", {
        class: "marker-outer",
        r: 11 + Math.min(visibleCount, 10) * 0.45,
      }),
      svgElement("circle", { class: "marker-core", r: 7 }),
    );
    const label = svgElement("text", { x: 17, y: -9 });
    label.textContent = cluster.label[state.language];
    const count = svgElement("text", { class: "marker-count", x: 17, y: 8 });
    count.textContent = `${visibleCount} ${COPY[state.language].organizations.toLocaleLowerCase(
      state.language,
    )}`;
    group.append(label, count);
    group.addEventListener("click", () => selectCluster(cluster.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCluster(cluster.id);
      }
    });
    markerFragment.append(group);
  });

  elements.heatLayer.replaceChildren(heatFragment);
  elements.markerLayer.replaceChildren(markerFragment);
}

function sourceLink(url, text) {
  const link = htmlElement("a", "source-link");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = text;
  link.append(externalIcon());
  return link;
}

function renderDetail(companies) {
  elements.detail.replaceChildren();
  const cluster = state.selectedCluster ? clusterById.get(state.selectedCluster) : null;
  if (!cluster) {
    elements.detail.hidden = true;
    return;
  }
  const visibleNames = new Set(companies.map((company) => company.name));
  const t = COPY[state.language];
  elements.detail.hidden = false;

  const close = htmlElement("button", "detail-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", t.close);
  close.addEventListener("click", clearSelection);

  const kicker = htmlElement(
    "p",
    "detail-kicker",
    `${cluster.state} · ${cluster.count} ${t.organizations}`,
  );
  const heading = htmlElement("h2", "", cluster.label[state.language]);
  elements.detail.append(close, kicker, heading);

  const company = state.selectedCompany ? companyById.get(state.selectedCompany) : null;
  if (company) {
    const wrapper = htmlElement("div", "company-detail");
    const back = htmlElement("button", "back-button", `← ${t.back}`);
    back.type = "button";
    back.addEventListener("click", () => {
      state.selectedCompany = null;
      renderDetail(filteredCompanies());
    });
    const category = htmlElement(
      "div",
      "company-category",
      roadmap.categoryLabels[company.category][state.language],
    );
    category.style.color = COLORS[company.category];
    const categoryDot = htmlElement("i");
    categoryDot.style.background = COLORS[company.category];
    category.prepend(categoryDot);
    const companyHeading = htmlElement("h3", "", company.name);
    const list = htmlElement("dl");
    const activity = htmlElement("div");
    activity.append(
      htmlElement("dt", "", t.activity),
      htmlElement("dd", "", company.activity[state.language]),
    );
    const type = htmlElement("div");
    type.append(
      htmlElement("dt", "", t.type),
      htmlElement("dd", "", company.organizationType[state.language]),
    );
    list.append(activity, type);
    const links = htmlElement("div", "source-links");
    company.sources.forEach((url, index) => {
      links.append(sourceLink(url, index ? t.sourceMore : t.source));
    });
    wrapper.append(back, category, companyHeading, list, links);
    elements.detail.append(wrapper);
    return;
  }

  const list = htmlElement("div", "cluster-list");
  list.append(htmlElement("p", "", t.clusterList));
  cluster.companies.forEach((name) => {
    const companyRow = companyByName.get(name);
    if (!companyRow) return;
    const button = htmlElement("button");
    button.type = "button";
    button.disabled = !visibleNames.has(name);
    button.addEventListener("click", () => {
      state.selectedCompany = companyRow.id;
      renderDetail(filteredCompanies());
    });
    const dot = htmlElement("i");
    dot.style.background = COLORS[companyRow.category];
    button.append(
      dot,
      htmlElement("strong", "", companyRow.name),
      htmlElement("small", "", companyRow.organizationType[state.language]),
    );
    list.append(button);
  });
  elements.detail.append(list);
}

function selectCluster(clusterId) {
  state.selectedCluster = clusterId;
  state.selectedCompany = null;
  renderAll();
}

function selectCompany(company, scrollToMap = false) {
  state.selectedCompany = company.id;
  state.selectedCluster = company.locations[0] || null;
  state.query = company.name;
  syncSearchInputs();
  elements.filterPanel.classList.remove("open");
  renderAll();
  if (scrollToMap) {
    document.querySelector("#map").scrollIntoView({ behavior: "smooth" });
  }
}

function clearSelection() {
  state.selectedCluster = null;
  state.selectedCompany = null;
  renderAll();
}

function renderSuggestions(companies) {
  const query = state.query.trim();
  if (!query || !companies.length) {
    elements.suggestions.hidden = true;
    elements.suggestions.replaceChildren();
    return;
  }
  const fragment = document.createDocumentFragment();
  companies.slice(0, 6).forEach((company) => {
    const button = htmlElement("button");
    button.type = "button";
    const locations = company.locations
      .map((id) => clusterById.get(id)?.label[state.language])
      .filter(Boolean)
      .join(", ");
    button.append(
      htmlElement("strong", "", company.name),
      htmlElement("span", "", locations),
    );
    button.addEventListener("click", () => selectCompany(company, true));
    fragment.append(button);
  });
  elements.suggestions.replaceChildren(fragment);
  elements.suggestions.hidden = false;
}

function renderDirectory(companies) {
  const fragment = document.createDocumentFragment();
  companies.forEach((company) => {
    const row = htmlElement("tr");
    const companyCell = htmlElement("td");
    const button = htmlElement("button", "company-button");
    button.type = "button";
    const dot = htmlElement("i");
    dot.style.background = COLORS[company.category];
    button.append(dot, htmlElement("strong", "", company.name));
    button.addEventListener("click", () => selectCompany(company, true));
    companyCell.append(button);

    const typeCell = htmlElement(
      "td",
      "",
      company.organizationType[state.language],
    );
    const locationCell = htmlElement("td");
    const pills = htmlElement("div", "location-pills");
    company.locations.forEach((id) => {
      const cluster = clusterById.get(id);
      if (!cluster) return;
      const pill = htmlElement("button", "", cluster.label[state.language]);
      pill.type = "button";
      pill.addEventListener("click", () => {
        state.selectedCluster = id;
        state.selectedCompany = company.id;
        renderAll();
        document.querySelector("#map").scrollIntoView({ behavior: "smooth" });
      });
      pills.append(pill);
    });
    locationCell.append(pills);

    const sourceCell = htmlElement("td");
    const link = htmlElement("a", "row-source");
    link.href = company.sources[0] || "#";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute(
      "aria-label",
      `${COPY[state.language].source}: ${company.name}`,
    );
    link.append(externalIcon());
    sourceCell.append(link);
    row.append(companyCell, typeCell, locationCell, sourceCell);
    fragment.append(row);
  });
  elements.directoryBody.replaceChildren(fragment);
  elements.emptyDirectory.hidden = companies.length > 0;
}

function syncSearchInputs() {
  elements.mapSearch.value = state.query;
  elements.directorySearch.value = state.query;
}

function renderAll() {
  if (!roadmap || !mapData) return;
  const companies = filteredCompanies();
  translate();
  renderCategories();
  renderMap(companies);
  renderDetail(companies);
  renderSuggestions(companies);
  renderDirectory(companies);
  syncSearchInputs();

  const t = COPY[state.language];
  elements.resultCount.textContent = `${companies.length} ${t.results}`;
  elements.mobileCount.textContent = companies.length;
  elements.directoryFraction.textContent = `${companies.length} / ${roadmap.metadata.organizations}`;
  elements.emptyMap.hidden = companies.length > 0;
  elements.resetFilters.disabled =
    !state.query &&
    state.categories.size === Object.keys(roadmap.categoryLabels).length;
}

function resetFilters() {
  state.query = "";
  state.categories = new Set(Object.keys(roadmap.categoryLabels));
  state.selectedCluster = null;
  state.selectedCompany = null;
  renderAll();
}

function updateQuery(value) {
  state.query = value;
  state.selectedCompany = null;
  renderAll();
}

function bindEvents() {
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.language;
      const url = new URL(location.href);
      if (state.language === "pt") url.searchParams.set("lang", "pt");
      else url.searchParams.delete("lang");
      history.replaceState({}, "", url);
      renderAll();
    });
  });
  elements.categoryList.addEventListener("change", (event) => {
    const category = event.target.dataset.category;
    if (!category) return;
    if (event.target.checked) state.categories.add(category);
    else state.categories.delete(category);
    state.selectedCompany = null;
    renderAll();
  });
  elements.mapSearch.addEventListener("input", (event) =>
    updateQuery(event.target.value),
  );
  elements.directorySearch.addEventListener("input", (event) =>
    updateQuery(event.target.value),
  );
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.mobileFilters.addEventListener("click", () =>
    elements.filterPanel.classList.add("open"),
  );
  elements.closeFilters.addEventListener("click", () =>
    elements.filterPanel.classList.remove("open"),
  );
  elements.heatToggle.addEventListener("click", () => {
    state.heat = !state.heat;
    elements.heatToggle.setAttribute("aria-pressed", String(state.heat));
    elements.heatToggle.querySelector("i").classList.toggle("on", state.heat);
    renderMap(filteredCompanies());
  });
  document.querySelector("#zoom-in").addEventListener("click", () => {
    state.zoom = Math.min(1.65, state.zoom + 0.15);
    updateZoom();
  });
  document.querySelector("#zoom-out").addEventListener("click", () => {
    state.zoom = Math.max(1, state.zoom - 0.15);
    updateZoom();
  });
  document.querySelector("#zoom-reset").addEventListener("click", () => {
    state.zoom = 1;
    state.selectedCluster = null;
    state.selectedCompany = null;
    updateZoom();
    renderAll();
  });
}

function updateZoom() {
  elements.zoomLayer.style.transform = `translate(390px, 360px) scale(${state.zoom}) translate(-390px, -360px)`;
}

async function init() {
  try {
    [roadmap, mapData] = await Promise.all([
      fetch("data/companies.json").then((response) => {
        if (!response.ok) throw new Error("companies");
        return response.json();
      }),
      fetch("data/brazil-map.json").then((response) => {
        if (!response.ok) throw new Error("map");
        return response.json();
      }),
    ]);
    companyByName = new Map(
      roadmap.companies.map((company) => [company.name, company]),
    );
    companyById = new Map(
      roadmap.companies.map((company) => [company.id, company]),
    );
    clusterById = new Map(
      roadmap.clusters.map((cluster) => [cluster.id, cluster]),
    );
    state.categories = new Set(Object.keys(roadmap.categoryLabels));
    elements.github.href = roadmap.source;
    elements.footerData.href = roadmap.source;
    elements.footerMap.href = mapData.attribution.url;
    document.querySelector("#stat-organizations").textContent =
      roadmap.metadata.organizations;
    document.querySelector("#stat-locations").textContent =
      roadmap.metadata.locationEntries;
    document.querySelector("#stat-clusters").textContent =
      roadmap.metadata.clusters;
    renderStates();
    bindEvents();
    renderAll();
  } catch (error) {
    document.body.innerHTML = "";
    const message = htmlElement("main", "load-error");
    message.append(
      htmlElement("h1", "", "Brazil Silicon Roadmap"),
      htmlElement("p", "", COPY[state.language].mapLoadError),
    );
    document.body.append(message);
    console.error(error);
  }
}

init();
