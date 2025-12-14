const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const getStrains = () => request("/api/strains");
export const getGenes = () => request("/api/genes");
export const createPopulation = (payload) =>
  request("/api/population/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getPopulation = (id) => request(`/api/population/${id}`);
export const advancePopulation = (id) =>
  request(`/api/population/${id}/advance`, { method: "POST" });
export const selectPopulation = (id, payload) =>
  request(`/api/population/${id}/select`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const breed = (payload) =>
  request("/api/breed", { method: "POST", body: JSON.stringify(payload) });
export const computeGRM = (payload) =>
  request("/api/genetics/grm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const computeInbreeding = (payload) =>
  request("/api/genetics/inbreeding", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const predictCross = (payload) =>
  request("/api/cross/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const realCross = (payload) =>
  request("/api/real/cross", { method: "POST", body: JSON.stringify(payload) });
export const exportPopulation = (id, format = "json") =>
  request(`/api/export/population/${id}?format=${format}`, { method: "POST" });
export const getMouse = (id) => request(`/api/mouse/${id}`);

export default {
  getStrains,
  getGenes,
  createPopulation,
  getPopulation,
  advancePopulation,
  selectPopulation,
  breed,
  computeGRM,
  computeInbreeding,
  predictCross,
  realCross,
  exportPopulation,
  getMouse,
};
