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

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `WebSocket: ${JSON.stringify(lastMsg).slice(0, 100)}`,
        },
      ]);

      if (lastMsg.type === "breed_complete" && pop && pop.id) {
        api
          .getPopulation(pop.id)
          .then(setPop)
          .catch(() => {});
      }
    }
  }, [messages]);

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
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}
              >
                Create a virtual mouse population to simulate breeding
                experiments and genetic analysis.
              </div>

              <label>Population Name</label>
              <input
                value={popName}
                onChange={(e) => setPopName(e.target.value)}
                placeholder="e.g., Experiment 1"
              />

              <label>
                Population Size
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (10-100 mice)
                </span>
              </label>
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
                title="Generate a new population with random genetic diversity"
              >
                Create Population
              </button>

              <button
                onClick={handleAdvance}
                disabled={!pop || loading}
                title="Simulate natural selection and advance to the next generation"
              >
                Advance Generation
              </button>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                Advances the population through selective breeding
              </div>
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
                    fontSize: 10,
                    color: "#6b7280",
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  Real-time connection for live breeding updates
                </div>
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
                  title="Test real-time breeding via WebSocket"
                >
                  Test Live Breed
                </button>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                  Breeds first two mice in real-time
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3>Real Data Controls</h3>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}
              >
                Use real mouse strain data to predict genetic crosses and
                outcomes.
              </div>

              <label>
                First Strain
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (Parent A)
                </span>
              </label>
              <select
                value={strainA}
                onChange={(e) => setStrainA(e.target.value)}
                title="Common lab mouse strains with known genetic profiles"
              >
                <option value="">Select strain...</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div
                style={{
                  fontSize: 9,
                  color: "#9ca3af",
                  marginTop: 2,
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}
              >
                C57BL/6J: Black coat, common reference
                <br />
                DBA/2J: Dilute brown, hearing loss model
                <br />
                BALB/cJ: White coat, immunology research
              </div>

              <label>
                Second Strain
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (Parent B)
                </span>
              </label>
              <select
                value={strainB}
                onChange={(e) => setStrainB(e.target.value)}
                title="Select a second strain to cross with"
              >
                <option value="">Select strain...</option>
                {strains.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label>
                Target Gene
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (Trait to analyze)
                </span>
              </label>
              <select
                value={gene}
                onChange={(e) => setGene(e.target.value)}
                title="Select which genetic trait to predict"
              >
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
                title="Predict offspring genotypes from this cross"
              >
                Predict Cross
              </button>
            </div>
          )}
        </aside>

        <main className="sp-main">
          <div
            className="panel"
            style={{
              height: "calc(100vh - 80px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <h3 style={{ marginBottom: 4 }}>Dashboard</h3>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
                View and manage your mouse population
              </div>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <PopulationList
                population={pop}
                onBreed={handleBreedAction}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </main>

        <aside className="sp-middle">
          <div className="panel">
            <h3 style={{ marginBottom: 4 }}>Analysis Results</h3>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}>
              Genetic relationship matrix and inbreeding coefficients
            </div>
            <GeneticsPanel population={pop} />
          </div>
        </aside>

        <aside className="sp-right">
          <div className="panel">
            <h3 style={{ marginBottom: 4 }}>Activity Log</h3>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
              Track all breeding events and system updates
            </div>
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

          {predictResult ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Cross Prediction Results</h3>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}>
                Expected genetic outcomes from crossing the selected strains
              </div>
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
                      marginBottom: 4,
                    }}
                  >
                    Genotype Distribution
                  </div>
                  <div
                    style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6 }}
                  >
                    Probability of each genetic combination
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
                      marginBottom: 4,
                    }}
                  >
                    Phenotype Distribution
                  </div>
                  <div
                    style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6 }}
                  >
                    Observable traits in offspring
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
                    marginBottom: 4,
                  }}
                >
                  Punnett Square
                </div>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6 }}>
                  Visual representation of all possible genetic combinations
                </div>
                <pre className="mini-json">{predictResult.punnett_square}</pre>
              </div>
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Expected Ratios
                </div>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6 }}>
                  Mendelian inheritance ratios for this cross
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
        </aside>
      </div>
    </div>
  );
}
