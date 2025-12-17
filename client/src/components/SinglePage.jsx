import React, { useEffect, useState } from "react";
import * as api from "../api";
import useBreedingSocket from "../hooks/useBreedingSocket";
import PopulationList from "./PopulationList";
import GeneticsPanel from "./GeneticsPanel";
import PartnerSelectionDialog from "./PartnerSelectionDialog";
import TabLayout from "./TabLayout";
import CollapsibleSection from "./CollapsibleSection";
import "./singlepage.css";

export default function SinglePage() {
  const [activeTab, setActiveTab] = useState("simulation");
  const [mode, setMode] = useState("SIM");

  // SIM state
  const [popName, setPopName] = useState("Experiment 1");
  const [popSize, setPopSize] = useState(30);
  const [pop, setPop] = useState(null);

  // REAL state
  const [strains, setStrains] = useState([]);
  const [genes, setGenes] = useState([]);
  const [geneDetails, setGeneDetails] = useState({});
  const [strainA, setStrainA] = useState("");
  const [strainB, setStrainB] = useState("");
  const [gene, setGene] = useState("");
  const [predictResult, setPredictResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  // Partner selection dialog
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [selectedMouseForBreeding, setSelectedMouseForBreeding] =
    useState(null);

  // Auto-connect WebSocket in background
  const { connected, messages, send } = useBreedingSocket({ enabled: true });

  useEffect(() => {
    api
      .getStrains()
      .then((r) => setStrains(r.strains || []))
      .catch(() => {});
    api
      .getGenes()
      .then((r) => {
        setGenes(r.genes || []);
        setGeneDetails(r.details || {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      let logMessage = `WebSocket: ${JSON.stringify(lastMsg).slice(0, 100)}`;

      if (lastMsg.type === "breed_result" && lastMsg.status === "success") {
        const count = lastMsg.data?.count || 0;
        logMessage = `Breeding successful: ${count} offspring added to population`;
      } else if (
        lastMsg.type === "breed_result" &&
        lastMsg.status === "error"
      ) {
        logMessage = `Breeding failed: ${lastMsg.message || "Unknown error"}`;
      } else if (
        lastMsg.type === "generation_advanced" &&
        lastMsg.status === "success"
      ) {
        const gen = lastMsg.data?.generation || "?";
        logMessage = `Advanced to generation ${gen}`;
      }

      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: logMessage,
        },
      ]);

      // Auto-refresh population after WebSocket breeding
      if (
        lastMsg.type === "breed_result" &&
        lastMsg.status === "success" &&
        pop &&
        pop.id
      ) {
        api
          .getPopulation(pop.id)
          .then(setPop)
          .catch(() => {});
      }
    }
  }, [messages, pop]);

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
    if (!pop) return alert("No population created yet");

    // Refresh population to ensure all mice are in backend registry
    try {
      const refreshed = await api.getPopulation(pop.id);
      setPop(refreshed);
    } catch (e) {
      console.error("Failed to refresh population before breeding:", e);
    }

    // Open partner selection dialog
    setSelectedMouseForBreeding(mouse);
    setShowPartnerDialog(true);
  }

  async function handleBreedWithPartner(mouse, partner, offspringCount) {
    if (!mouse || !partner) return;
    if (!pop) return alert("No population to update");

    const payload = {
      parent1_id: String(mouse.id || mouse),
      parent2_id: String(partner.id || partner),
      n_offspring: offspringCount || 2,
    };

    setLoading(true);
    setError(null);

    try {
      const res = await api.breed(payload);
      const count = res.offspring?.length || 0;

      // Build detailed offspring summary
      const offspringDetails =
        res.offspring
          ?.map((o, i) => {
            const coat = o.genome_summary?.coat_color || "unknown";
            const size = o.genome_summary?.size || "unknown";
            return `#${i + 1}: ${coat}, ${size}`;
          })
          .join(" | ") || "";

      const mainMessage = `Bred Mouse #${String(mouse.id).slice(
        0,
        6
      )} × Mouse #${String(partner.id).slice(0, 6)} → ${count} offspring`;

      const detailedMessage = offspringDetails
        ? `${mainMessage}\nOffspring: ${offspringDetails}`
        : mainMessage;

      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: detailedMessage,
        },
      ]);

      // Auto-refresh population
      try {
        const refreshed = await api.getPopulation(pop.id);
        setPop(refreshed);
      } catch (e) {
        console.error("Failed to refresh population:", e);
      }
    } catch (e) {
      let errorMsg = "Unknown error";

      if (e.response?.data?.detail) {
        errorMsg = e.response.data.detail;
      } else if (e.message) {
        errorMsg = e.message;
      }

      setError(errorMsg);

      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Breeding failed: ${errorMsg}`,
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
              <h3>1. Create Population</h3>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 12,
                  lineHeight: 1.4,
                }}
              >
                Start by creating a virtual mouse population with random genetic
                diversity.
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

              <div style={{ marginTop: 16 }}>
                <CollapsibleSection
                  title="Advanced Options"
                  description="Multi-generation simulation and batch operations"
                  badge="ADVANCED"
                  defaultOpen={false}
                >
                  <button
                    onClick={handleAdvance}
                    disabled={!pop || loading}
                    title="Breed selected mice and replace population with offspring (next generation)"
                    style={{ width: "100%" }}
                  >
                    Advance Generation
                  </button>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>
                    Breeds the entire population and advances to the next
                    generation. This replaces all current mice with their
                    offspring.
                  </div>
                </CollapsibleSection>
              </div>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: connected ? "#10b981" : "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: connected ? "#10b981" : "#9ca3af",
                    }}
                  />
                  Real-time updates {connected ? "active" : "connecting..."}
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
                <option
                  value=""
                  disabled
                  style={{ fontSize: 11, color: "#6b7280" }}
                >
                  ──────────────────────────────
                </option>
                <option value="DEFAULT">
                  DEFAULT - Unknown gene (generic model)
                </option>
                {genes
                  .filter((g) => g !== "DEFAULT")
                  .map((g) => {
                    const details = geneDetails[g] || {};
                    const name = details.name || g;
                    const trait = details.trait || "unknown";
                    const func = details.function || "";
                    return (
                      <option key={g} value={g} title={func}>
                        {g} - {name} ({trait})
                      </option>
                    );
                  })}
              </select>

              {gene && geneDetails[gene] && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    background: "#f0f9ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "#1e40af",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {geneDetails[gene].name}
                  </div>
                  <div style={{ color: "#3b82f6" }}>
                    {geneDetails[gene].function}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: "#6b7280" }}>
                    Trait: {geneDetails[gene].trait} | Model:{" "}
                    {geneDetails[gene].model?.type || "unknown"}
                  </div>
                </div>
              )}

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
              <h3 style={{ marginBottom: 4 }}>2. Your Population</h3>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
                {pop ? (
                  <>
                    Select mice to breed and view offspring
                    {pop.size > pop.mice_sample?.length && (
                      <span style={{ color: "#f59e0b", marginLeft: 4 }}>
                        (Showing {pop.mice_sample?.length} of {pop.size} mice)
                      </span>
                    )}
                  </>
                ) : (
                  "Create a population to start breeding"
                )}
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
            <h3 style={{ marginBottom: 4 }}>3. Genetic Analysis</h3>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}>
              View genetic relationships, inbreeding coefficients, and
              population statistics
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
                      <div style={{ whiteSpace: "pre-line" }}>
                        {log.message}
                      </div>
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

      {showPartnerDialog && selectedMouseForBreeding && (
        <PartnerSelectionDialog
          mouse={selectedMouseForBreeding}
          availableMice={pop?.mice_sample || []}
          onBreed={handleBreedWithPartner}
          onClose={() => {
            setShowPartnerDialog(false);
            setSelectedMouseForBreeding(null);
          }}
        />
      )}
    </div>
  );
}
