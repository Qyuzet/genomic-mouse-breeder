import React, { useEffect, useState } from "react";
import * as api from "../api";
import useBreedingSocket from "../hooks/useBreedingSocket";
import PopulationList from "./PopulationList";
import GeneticsPanel from "./GeneticsPanel";
import "./singlepage.css";

export default function SinglePage() {
  const [mode, setMode] = useState("SIM");

  // SIM state
  const [popName, setPopName] = useState("Experiment 1");
  const [popSize, setPopSize] = useState(30);
  const [pop, setPop] = useState(null);

  // REAL state
  const [strains, setStrains] = useState([]);
  const [genes, setGenes] = useState([]);
  const [strainA, setStrainA] = useState("");
  const [strainB, setStrainB] = useState("");
  const [gene, setGene] = useState("");
  const [predictResult, setPredictResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);
  const { connected, messages, send } = useBreedingSocket({ enabled: live });

  useEffect(() => {
    api
      .getStrains()
      .then((r) => setStrains(r.strains || []))
      .catch(() => {});
    api
      .getGenes()
      .then((r) => setGenes(r.genes || []))
      .catch(() => {});
  }, []);

  async function handleCreatePopulation() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        size: Number(popSize),
        name: popName,
        goal_preset: "LARGE_FRIENDLY",
      };
      const res = await api.createPopulation(body);
      setPop(res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleAdvance() {
    if (!pop || !pop.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.advancePopulation(pop.id);
      const refreshed = await api.getPopulation(pop.id);
      setPop(refreshed);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const payload = { strain1: strainA, strain2: strainB, gene };
      const res = await api.predictCross(payload);
      setPredictResult(res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleBreedAction(mouse) {
    if (!mouse) return;
    if (!pop) return alert("No population to update");
    const mice = pop.mice_sample || [];
    const partner =
      mice.find((m) => (m.id || m) !== (mouse.id || mouse)) || mice[0];
    if (!partner) return alert("No partner available");
    const payload = {
      parent1_id: String(mouse.id || mouse),
      parent2_id: String(partner.id || partner),
      n_offspring: 2,
    };
    setLoading(true);
    setError(null);
    try {
      const res = await api.breed(payload);
      // optionally refresh population if server supports it
      try {
        const refreshed = await api.getPopulation(pop.id);
        setPop(refreshed);
      } catch (e) {
        /* ignore */
      }
      // append message
      // eslint-disable-next-line no-console
      console.log("breed result", res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleRefresh(popId) {
    if (!popId) return;
    setLoading(true);
    setError(null);
    try {
      const refreshed = await api.getPopulation(popId);
      setPop(refreshed);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="sp-root">
      <header className="sp-topbar">
        <h2>Mouse Breeder — Single Page</h2>
        <div className="mode-toggle">
          <button
            onClick={() => setMode("SIM")}
            className={mode === "SIM" ? "active" : ""}
          >
            SIM
          </button>
          <button
            onClick={() => setMode("REAL")}
            className={mode === "REAL" ? "active" : ""}
          >
            REAL
          </button>
        </div>
      </header>

      <div className="sp-body">
        <aside className="sp-left">
          {mode === "SIM" ? (
            <div className="panel">
              <h3>SIM Controls</h3>
              <label>Population name</label>
              <input
                value={popName}
                onChange={(e) => setPopName(e.target.value)}
              />
              <label>Size</label>
              <input
                type="number"
                value={popSize}
                onChange={(e) => setPopSize(e.target.value)}
              />
              <button onClick={handleCreatePopulation} disabled={loading}>
                Create Population
              </button>
              <button onClick={handleAdvance} disabled={!pop || loading}>
                Advance Generation
              </button>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block" }}>Live WebSocket</label>
                <button onClick={() => setLive((v) => !v)}>
                  {live ? "Disconnect Live" : "Connect Live"}
                </button>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  WS: {connected ? "connected" : "disconnected"}
                </div>
                <button
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    if (!pop || !pop.mice_sample || pop.mice_sample.length < 2)
                      return alert("Need >=2 mice in population");
                    const p1 = pop.mice_sample[0].id || pop.mice_sample[0];
                    const p2 = pop.mice_sample[1].id || pop.mice_sample[1];
                    send({
                      type: "breed",
                      data: {
                        parent1_id: String(p1),
                        parent2_id: String(p2),
                        n_offspring: 2,
                      },
                    });
                  }}
                  disabled={!connected}
                >
                  Send Live Breed (demo)
                </button>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3>REAL Controls</h3>
              <label>Strain A</label>
              <select
                value={strainA}
                onChange={(e) => setStrainA(e.target.value)}
              >
                <option value="">—</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label>Strain B</label>
              <select
                value={strainB}
                onChange={(e) => setStrainB(e.target.value)}
              >
                <option value="">—</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label>Gene</label>
              <select value={gene} onChange={(e) => setGene(e.target.value)}>
                <option value="">—</option>
                {genes.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePredict}
                disabled={loading || !strainA || !strainB}
              >
                Predict Cross
              </button>
            </div>
          )}
        </aside>

        <main className="sp-main">
          <section className="summary">
            <h3>Dashboard</h3>
            <PopulationList
              population={pop}
              onBreed={handleBreedAction}
              onRefresh={handleRefresh}
            />
          </section>

          <section className="results">
            <h3>Results</h3>
            <GeneticsPanel population={pop} />
            {predictResult ? (
              <div className="card" style={{ marginTop: 12 }}>
                <h4>Prediction</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong>Genotypes</strong>
                    <ul>
                      {Object.entries(predictResult.genotypes || {}).map(
                        ([k, v]) => (
                          <li key={k}>
                            {k}: {Number.isFinite(v) ? v : String(v)}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <strong>Phenotypes</strong>
                    <ul>
                      {Object.entries(predictResult.phenotypes || {}).map(
                        ([k, v]) => (
                          <li key={k}>
                            {k}: {v}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Punnett</strong>
                  <pre style={{ background: "#f7f7f7", padding: 8 }}>
                    {predictResult.punnett_square}
                  </pre>
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Expected Ratios</strong>
                  <ul>
                    {Object.entries(predictResult.expected_ratios || {}).map(
                      ([k, v]) => (
                        <li key={k}>
                          {k}: {typeof v === "number" ? v : String(v)}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>
        </main>

        <aside className="sp-right">
          <div className="panel">
            <h3>Console</h3>
            {loading && <div className="badge">Loading…</div>}
            {error && <pre className="error">{error}</pre>}
            <div className="hint">
              Use the left controls to create/run experiments.
            </div>
            <div className="console-messages">
              {messages.length === 0 ? (
                <div style={{ fontSize: 13, color: "#666" }}>
                  No live messages yet.
                </div>
              ) : (
                messages
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((m, i) => (
                    <pre
                      key={i}
                      style={{
                        fontSize: 12,
                        background: "#fafafa",
                        padding: 6,
                        borderRadius: 4,
                        marginBottom: 6,
                      }}
                    >
                      {typeof m === "string" ? m : JSON.stringify(m, null, 2)}
                    </pre>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
