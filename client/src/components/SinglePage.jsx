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
  const [activityLog, setActivityLog] = useState([]);
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
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Created population "${popName}" with ${popSize} mice`,
        },
      ]);
    } catch (e) {
      setError(e.message);
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Error: ${e.message}`,
          error: true,
        },
      ]);
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
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Advanced to generation ${refreshed.generation || "N/A"}`,
        },
      ]);
    } catch (e) {
      setError(e.message);
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Error advancing generation: ${e.message}`,
          error: true,
        },
      ]);
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
      const offspringCount = res.offspring?.length || 0;
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Bred mouse #${String(mouse.id).slice(
            0,
            6
          )} - ${offspringCount} offspring created`,
        },
      ]);
      // optionally refresh population if server supports it
      try {
        const refreshed = await api.getPopulation(pop.id);
        setPop(refreshed);
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      setError(e.message);
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Error breeding: ${e.message}`,
          error: true,
        },
      ]);
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
        <h2>Genomic Mouse Breeder</h2>
        <div className="mode-toggle">
          <button
            onClick={() => setMode("SIM")}
            className={mode === "SIM" ? "active" : ""}
          >
            Simulation
          </button>
          <button
            onClick={() => setMode("REAL")}
            className={mode === "REAL" ? "active" : ""}
          >
            Real Data
          </button>
        </div>
      </header>

      <div className="sp-body">
        <aside className="sp-left">
          {mode === "SIM" ? (
            <div className="panel">
              <h3>Simulation Controls</h3>
              <label>Population Name</label>
              <input
                value={popName}
                onChange={(e) => setPopName(e.target.value)}
                placeholder="Enter population name"
              />
              <label>Population Size</label>
              <input
                type="number"
                value={popSize}
                onChange={(e) => setPopSize(e.target.value)}
                min="10"
                max="100"
              />
              <button
                className="primary"
                onClick={handleCreatePopulation}
                disabled={loading}
              >
                Create Population
              </button>
              <button onClick={handleAdvance} disabled={!pop || loading}>
                Advance Generation
              </button>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <label style={{ display: "block", marginTop: 0 }}>
                  WebSocket Connection
                </label>
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    marginBottom: 8,
                    padding: "6px 10px",
                    background: connected ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${connected ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: 4,
                    color: connected ? "#166534" : "#991b1b",
                  }}
                >
                  Status: {connected ? "Connected" : "Disconnected"}
                </div>
                <button onClick={() => setLive((v) => !v)}>
                  {live ? "Disconnect" : "Connect"}
                </button>
                <button
                  onClick={() => {
                    if (!pop || !pop.mice_sample || pop.mice_sample.length < 2)
                      return alert("Need at least 2 mice in population");
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
                  Test Live Breed
                </button>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3>Real Data Controls</h3>
              <label>First Strain</label>
              <select
                value={strainA}
                onChange={(e) => setStrainA(e.target.value)}
              >
                <option value="">Select strain...</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label>Second Strain</label>
              <select
                value={strainB}
                onChange={(e) => setStrainB(e.target.value)}
              >
                <option value="">Select strain...</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label>Target Gene</label>
              <select value={gene} onChange={(e) => setGene(e.target.value)}>
                <option value="">Select gene...</option>
                {genes.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                className="primary"
                onClick={handlePredict}
                disabled={loading || !strainA || !strainB || !gene}
              >
                Predict Cross
              </button>
            </div>
          )}
        </aside>

        <main className="sp-main">
          <section className="summary">
            <div
              className="panel"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={{ flexShrink: 0 }}>Dashboard</h3>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <PopulationList
                  population={pop}
                  onBreed={handleBreedAction}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
          </section>

          <section className="results">
            <div
              className="panel"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={{ flexShrink: 0 }}>Analysis Results</h3>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <GeneticsPanel population={pop} />
              </div>
            </div>
            {predictResult ? (
              <div className="panel" style={{ marginTop: 16 }}>
                <h4>Cross Prediction Results</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginTop: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Genotype Distribution
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.6,
                      }}
                    >
                      {Object.entries(predictResult.genotypes || {}).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            style={{
                              padding: "6px 0",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{k}:</span>{" "}
                            {Number.isFinite(v) ? v : String(v)}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Phenotype Distribution
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.6,
                      }}
                    >
                      {Object.entries(predictResult.phenotypes || {}).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            style={{
                              padding: "6px 0",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{k}:</span> {v}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Punnett Square
                  </div>
                  <pre className="mini-json">
                    {predictResult.punnett_square}
                  </pre>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Expected Ratios
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      lineHeight: 1.6,
                    }}
                  >
                    {Object.entries(predictResult.expected_ratios || {}).map(
                      ([k, v]) => (
                        <div
                          key={k}
                          style={{
                            padding: "6px 0",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{k}:</span>{" "}
                          {typeof v === "number" ? v : String(v)}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </main>

        <aside className="sp-right">
          <div className="panel">
            <h3>Activity Log</h3>
            {loading && <div className="badge">Processing...</div>}
            {error && <div className="error">{error}</div>}
            {!loading && !error && activityLog.length === 0 && (
              <div className="hint">
                {mode === "SIM"
                  ? "Create a population to start breeding experiments."
                  : "Select strains and a gene to predict cross outcomes."}
              </div>
            )}
            <div className="console-messages">
              {activityLog.length === 0 ? (
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 12 }}>
                  No activity yet.
                </div>
              ) : (
                activityLog
                  .slice()
                  .reverse()
                  .slice(0, 50)
                  .map((log, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        padding: "8px 10px",
                        marginBottom: 6,
                        borderRadius: 4,
                        border: "1px solid #e5e7eb",
                        background: log.error ? "#fef2f2" : "#f9fafb",
                        color: log.error ? "#dc2626" : "#374151",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: 2,
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      >
                        {log.time}
                      </div>
                      <div>{log.message}</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
