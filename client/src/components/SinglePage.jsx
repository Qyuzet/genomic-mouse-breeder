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
  const [docSection, setDocSection] = useState("overview");
  const [docSearchQuery, setDocSearchQuery] = useState("");

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
  const [breedResult, setBreedResult] = useState(null);

  // Validation state
  const [validationResults, setValidationResults] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [validationParams, setValidationParams] = useState({
    n_trials: 1000,
    population_size: 100,
    n_generations: 5,
  });

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

      // Store breeding results for display
      setBreedResult({
        parent1: `Mouse #${String(mouse.id).slice(0, 6)}`,
        parent2: `Mouse #${String(partner.id).slice(0, 6)}`,
        offspring_count: count,
        genotype_counts: res.genotype_counts || {},
        phenotype_summary: res.phenotype_summary || {},
        cross_diagram: res.cross_diagram || "",
      });

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

  async function handleRunValidation() {
    setValidationLoading(true);
    setValidationError(null);
    setValidationResults(null);

    console.log("Running validation with parameters:", validationParams);

    try {
      const res = await api.validateAll(validationParams);
      setValidationResults(res);

      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Validation completed: ${res.pass_count}/${res.total_count} tests passed (n_trials=${validationParams.n_trials}, pop_size=${validationParams.population_size})`,
        },
      ]);
    } catch (e) {
      setValidationError(e.message || "Validation failed");
      setActivityLog((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: `Validation failed: ${e.message}`,
          error: true,
        },
      ]);
    }

    setValidationLoading(false);
  }

  // Helper function to check if content matches search query
  const matchesSearch = (text) => {
    if (!docSearchQuery.trim()) return true;
    return text.toLowerCase().includes(docSearchQuery.toLowerCase());
  };

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
          <button
            onClick={() => setMode("VALIDATION")}
            className={mode === "VALIDATION" ? "active" : ""}
          >
            Validation
          </button>
          <button
            onClick={() => setMode("DOCUMENTATION")}
            className={mode === "DOCUMENTATION" ? "active" : ""}
          >
            Documentation
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
          ) : mode === "REAL" ? (
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
          ) : mode === "VALIDATION" ? (
            <div className="panel">
              <h3>Accuracy Validation</h3>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 16,
                  lineHeight: 1.4,
                }}
              >
                Run scientific validation tests to verify the accuracy of the
                genetics simulation
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>
                  Number of Trials (Mendelian Test)
                  <span
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      fontWeight: 400,
                      marginLeft: 6,
                    }}
                  >
                    (Higher = more accurate, slower)
                  </span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={validationParams.n_trials}
                  onChange={(e) =>
                    setValidationParams({
                      ...validationParams,
                      n_trials: parseInt(e.target.value) || 1000,
                    })
                  }
                  title="Number of breeding trials for Mendelian ratio test"
                />
                <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                  Default: 1000 (recommended 500-2000)
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
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
                    (Larger = more robust)
                  </span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="10"
                  value={validationParams.population_size}
                  onChange={(e) =>
                    setValidationParams({
                      ...validationParams,
                      population_size: parseInt(e.target.value) || 100,
                    })
                  }
                  title="Population size for GRM and heritability tests"
                />
                <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                  Default: 100 (recommended 50-200)
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>
                  Number of Generations
                  <span
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      fontWeight: 400,
                      marginLeft: 6,
                    }}
                  >
                    (Inbreeding test)
                  </span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  step="1"
                  value={validationParams.n_generations}
                  onChange={(e) =>
                    setValidationParams({
                      ...validationParams,
                      n_generations: parseInt(e.target.value) || 5,
                    })
                  }
                  title="Number of generations for inbreeding correlation test"
                />
                <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                  Default: 5 (recommended 3-7)
                </div>
              </div>

              <button
                className="primary"
                onClick={handleRunValidation}
                disabled={validationLoading}
                style={{ marginBottom: 16 }}
              >
                {validationLoading
                  ? "Running Tests..."
                  : "Run All Validation Tests"}
              </button>

              {validationError && (
                <div
                  style={{
                    padding: "8px 10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "#dc2626",
                    marginBottom: 12,
                  }}
                >
                  {validationError}
                </div>
              )}

              {validationResults && (
                <div>
                  <div
                    style={{
                      padding: "12px",
                      background: validationResults.overall_pass
                        ? "#f0fdf4"
                        : "#fef2f2",
                      border: `1px solid ${
                        validationResults.overall_pass ? "#bbf7d0" : "#fecaca"
                      }`,
                      borderRadius: 6,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}
                    >
                      Overall Result:{" "}
                      {validationResults.overall_pass ? "PASS" : "FAIL"}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {validationResults.pass_count} of{" "}
                      {validationResults.total_count} tests passed
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#374151" }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Test Results:
                    </div>
                    {validationResults.detailed_results?.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 10px",
                          background: "#f9fafb",
                          borderLeft: `3px solid ${
                            result.passed ? "#10b981" : "#ef4444"
                          }`,
                          marginBottom: 8,
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 500 }}>
                            {result.method_name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: result.passed ? "#10b981" : "#ef4444",
                            }}
                          >
                            {result.passed ? "PASS" : "FAIL"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: 24,
                  fontSize: 10,
                  color: "#9ca3af",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Validation Methods:
                </div>
                <div style={{ marginBottom: 6 }}>
                  1. <strong>Mendelian Ratios</strong> - Chi-square test for
                  inheritance patterns
                </div>
                <div style={{ marginBottom: 6 }}>
                  2. <strong>GRM Relationships</strong> - Genomic relationship
                  matrix accuracy
                </div>
                <div style={{ marginBottom: 6 }}>
                  3. <strong>Inbreeding Correlation</strong> - Pedigree vs
                  genomic inbreeding
                </div>
                <div style={{ marginBottom: 6 }}>
                  4. <strong>Heritability</strong> - Realized heritability
                  estimation
                </div>
                <div style={{ marginBottom: 6 }}>
                  5. <strong>Real Mode Predictions</strong> - Accuracy of real
                  data predictions
                </div>
              </div>
            </div>
          ) : mode === "DOCUMENTATION" ? (
            <div
              className="panel"
              style={{ border: "1px solid #000", background: "#fff" }}
            >
              <h3
                style={{
                  borderBottom: "1px solid #000",
                  paddingBottom: 8,
                  marginBottom: 16,
                }}
              >
                Documentation
              </h3>

              <div style={{ marginBottom: 16 }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      paddingRight: docSearchQuery ? "30px" : "10px",
                      border: "1px solid #000",
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />
                  {docSearchQuery && (
                    <button
                      onClick={() => setDocSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: 5,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: "0 5px",
                      }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                {docSearchQuery && (
                  <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                    Searching for: "{docSearchQuery}"
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setDocSection("overview")}
                  style={{
                    padding: "8px 12px",
                    border:
                      docSection === "overview"
                        ? "2px solid #000"
                        : "1px solid #000",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: docSection === "overview" ? 600 : 400,
                  }}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDocSection("classes")}
                  style={{
                    padding: "8px 12px",
                    border:
                      docSection === "classes"
                        ? "2px solid #000"
                        : "1px solid #000",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: docSection === "classes" ? 600 : 400,
                  }}
                >
                  Code Structure
                </button>
                <button
                  onClick={() => setDocSection("mathematics")}
                  style={{
                    padding: "8px 12px",
                    border:
                      docSection === "mathematics"
                        ? "2px solid #000"
                        : "1px solid #000",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: docSection === "mathematics" ? 600 : 400,
                  }}
                >
                  Mathematical Equations
                </button>
                <button
                  onClick={() => setDocSection("validation")}
                  style={{
                    padding: "8px 12px",
                    border:
                      docSection === "validation"
                        ? "2px solid #000"
                        : "1px solid #000",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: docSection === "validation" ? 600 : 400,
                  }}
                >
                  Validation Methods
                </button>
                <button
                  onClick={() => setDocSection("references")}
                  style={{
                    padding: "8px 12px",
                    border:
                      docSection === "references"
                        ? "2px solid #000"
                        : "1px solid #000",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: docSection === "references" ? 600 : 400,
                  }}
                >
                  References
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        {mode !== "VALIDATION" && mode !== "DOCUMENTATION" ? (
          <>
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
                  <div
                    style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}
                  >
                    {pop ? (
                      <>
                        Select mice to breed and view offspring
                        {pop.size > pop.mice_sample?.length && (
                          <span style={{ color: "#f59e0b", marginLeft: 4 }}>
                            (Showing {pop.mice_sample?.length} of {pop.size}{" "}
                            mice)
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
                <div
                  style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}
                >
                  View genetic relationships, inbreeding coefficients, and
                  population statistics
                </div>
                <GeneticsPanel population={pop} />
              </div>
            </aside>
          </>
        ) : null}

        {mode === "VALIDATION" && (
          <main className="sp-main" style={{ gridColumn: "2 / 4" }}>
            <div className="panel" style={{ height: "calc(100vh - 80px)" }}>
              <h3 style={{ marginBottom: 4 }}>Validation Details</h3>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 16 }}>
                Scientific validation ensures the simulator follows established
                genetics principles
              </div>

              {!validationResults && !validationLoading && (
                <div
                  style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}
                >
                  <p style={{ marginBottom: 12 }}>
                    Click "Run All Validation Tests" to verify the accuracy of
                    the genetics simulation.
                  </p>
                  <p style={{ marginBottom: 12 }}>
                    The validation suite runs 5 comprehensive tests based on
                    established scientific methods:
                  </p>
                  <div style={{ marginLeft: 16, marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>1. Mendelian Ratios (Chi-Square Test)</strong>
                      <div
                        style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}
                      >
                        Tests if breeding follows Mendel's laws (1866). Expected
                        1:2:1 ratio for heterozygous crosses.
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>2. GRM Relationship Accuracy</strong>
                      <div
                        style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}
                      >
                        Validates genomic relationship matrix using VanRaden
                        (2008) method. Tests parent-offspring and sibling
                        relationships.
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>3. Inbreeding Coefficient Correlation</strong>
                      <div
                        style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}
                      >
                        Compares pedigree-based (Wright 1922) vs genomic
                        inbreeding. Expected correlation &gt; 0.85.
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>4. Realized Heritability</strong>
                      <div
                        style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}
                      >
                        Tests heritability estimation using Falconer & Mackay
                        (1996) method. Validates quantitative genetics.
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>5. Real Mode Prediction Accuracy</strong>
                      <div
                        style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}
                      >
                        Validates predictions against Mouse Genome Database
                        (MGD) data. Tests real genomic data integration.
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      fontStyle: "italic",
                    }}
                  >
                    Note: Validation tests may take 30-60 seconds to complete as
                    they run thousands of simulations.
                  </p>
                </div>
              )}

              {validationLoading && (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div
                    style={{ fontSize: 14, color: "#3b82f6", marginBottom: 8 }}
                  >
                    Running validation tests...
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    This may take 30-60 seconds
                  </div>
                </div>
              )}

              {validationResults && (
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <div
                    style={{
                      padding: "16px",
                      background: validationResults.overall_pass
                        ? "#f0fdf4"
                        : "#fef2f2",
                      border: `2px solid ${
                        validationResults.overall_pass ? "#10b981" : "#ef4444"
                      }`,
                      borderRadius: 8,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}
                    >
                      {validationResults.overall_pass
                        ? "✓ VALIDATION PASSED"
                        : "✗ VALIDATION FAILED"}
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {validationResults.pass_count} of{" "}
                      {validationResults.total_count} tests passed (
                      {Math.round(
                        (validationResults.pass_count /
                          validationResults.total_count) *
                          100
                      )}
                      %)
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      Detailed Results:
                    </div>
                    {validationResults.detailed_results?.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 14px",
                          background: "#ffffff",
                          border: `2px solid ${
                            result.passed ? "#10b981" : "#ef4444"
                          }`,
                          borderRadius: 6,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {result.method_name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "4px 12px",
                              borderRadius: 4,
                              background: result.passed ? "#10b981" : "#ef4444",
                              color: "white",
                            }}
                          >
                            {result.passed ? "PASS" : "FAIL"}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                          Timestamp:{" "}
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {mode === "DOCUMENTATION" && (
          <main className="sp-main" style={{ gridColumn: "2 / 4" }}>
            <div
              className="panel"
              style={{
                height: "calc(100vh - 80px)",
                overflow: "auto",
                border: "1px solid #000",
                background: "#fff",
              }}
            >
              {docSection === "overview" && (
                <div style={{ padding: 20, lineHeight: 1.6, fontSize: 13 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                      fontSize: 20,
                    }}
                  >
                    Mouse Breeding Simulator - Overview
                  </h2>
                  <p style={{ marginBottom: 16 }}>
                    A comprehensive genetics simulation system implementing
                    Mendelian inheritance, quantitative genetics, and genomic
                    prediction methods used in modern animal breeding programs.
                    This simulator combines classical genetics with modern
                    genomic techniques to provide an educational and research
                    tool for understanding genetic inheritance patterns.
                  </p>

                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 24,
                      marginBottom: 12,
                      fontSize: 16,
                    }}
                  >
                    Core Features
                  </h3>
                  <ul
                    style={{
                      marginLeft: 20,
                      marginBottom: 16,
                      lineHeight: 1.8,
                    }}
                  >
                    <li>
                      <strong>Genome-wide SNPs:</strong> 200 biallelic markers
                      distributed across 2 chromosomes
                    </li>
                    <li>
                      <strong>Recombination:</strong> Poisson-distributed
                      crossovers simulating meiotic recombination
                    </li>
                    <li>
                      <strong>Pedigree Inbreeding:</strong> Wright's coefficient
                      (F) tracking identity by descent
                    </li>
                    <li>
                      <strong>Genomic Relationships:</strong> VanRaden GRM for
                      genomic prediction
                    </li>
                    <li>
                      <strong>Quantitative Traits:</strong> Linear mixed model
                      with additive genetic effects
                    </li>
                    <li>
                      <strong>Mutation Model:</strong> Per-locus mutation rates
                      (0.001 for SNPs, 0.01 for visible traits)
                    </li>
                    <li>
                      <strong>Real Data Integration:</strong> Mouse Phenome
                      Database strain genotypes
                    </li>
                  </ul>

                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 24,
                      marginBottom: 12,
                      fontSize: 16,
                    }}
                  >
                    Simulation Modes
                  </h3>

                  <div
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      SIM Mode (Simulated Genetics)
                    </div>
                    <p style={{ marginBottom: 8 }}>
                      Uses simulated genomes with random SNP markers and
                      Mendelian inheritance patterns. Ideal for learning
                      genetics principles and testing breeding strategies.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 8,
                        border: "1px solid #d1d5db",
                      }}
                    >
                      pop = Population(size=30, mode=Mode.SIM)
                      <br />
                      offspring = mate(parent1, parent2)
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      REAL Mode (Real Genomic Data)
                    </div>
                    <p style={{ marginBottom: 8 }}>
                      Uses actual mouse strain genotypes from the Mouse Phenome
                      Database (MPD). Enables prediction of real offspring
                      phenotypes based on actual genetic data from laboratory
                      mouse strains.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 8,
                        border: "1px solid #d1d5db",
                      }}
                    >
                      dataset = Dataset.load("datasets/cleaned/...")
                      <br />
                      pop = Population(mode=Mode.REAL, dataset=dataset,
                      <br />
                      &nbsp;&nbsp;strainA="C57BL/6J", strainB="BALB/cJ")
                    </div>
                  </div>

                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 24,
                      marginBottom: 12,
                      fontSize: 16,
                    }}
                  >
                    Key Genetic Concepts
                  </h3>

                  <div style={{ marginBottom: 12 }}>
                    <strong>Mendelian Inheritance:</strong> Each offspring
                    receives one allele from each parent at every locus,
                    following Mendel's laws of segregation and independent
                    assortment.
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <strong>Recombination:</strong> During meiosis, chromosomes
                    undergo crossover events that shuffle genetic material,
                    creating new allele combinations.
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <strong>Inbreeding:</strong> Mating of related individuals
                    increases homozygosity and can reveal recessive traits.
                    Measured by Wright's coefficient F.
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <strong>Genomic Selection:</strong> Using genome-wide
                    markers to predict breeding values and select superior
                    individuals for breeding programs.
                  </div>
                </div>
              )}

              {docSection === "classes" && (
                <div style={{ padding: 20, lineHeight: 1.6, fontSize: 13 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                      fontSize: 20,
                    }}
                  >
                    Code Structure
                  </h2>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8, fontSize: 16 }}>
                      Class: Genome
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Stores genetic information including visible traits (coat
                      color, size, ear shape, temperament) and genome-wide SNPs
                      distributed across 2 chromosomes with recombination.
                    </p>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Constructor:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`def __init__(self,
             coat_color=None, size=None,
             ear_shape=None, temperament=None,
             haplotype_chr1=None,
             haplotype_chr2=None,
             is_founder=False):`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Attributes:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <code>coat_color</code>: Tuple[str, str] - Alleles for
                        coat color (B/b)
                      </li>
                      <li>
                        <code>size</code>: Tuple[str, str] - Alleles for body
                        size (L/s)
                      </li>
                      <li>
                        <code>ear_shape</code>: Tuple[str, str] - Alleles for
                        ear shape (N/D)
                      </li>
                      <li>
                        <code>temperament</code>: Tuple[str, str] - Alleles for
                        temperament (F/A)
                      </li>
                      <li>
                        <code>haplotype_chr1</code>: Tuple of 2 lists, each with
                        100 SNPs
                      </li>
                      <li>
                        <code>haplotype_chr2</code>: Tuple of 2 lists, each with
                        100 SNPs
                      </li>
                    </ul>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Methods:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`def get_snp_genotypes(self) -> List[int]:
    """Returns 200 SNP genotypes in 0/1/2 encoding"""

def form_gamete(self) -> 'Genome':
    """Creates gamete via meiosis with recombination"""

def copy(self) -> 'Genome':
    """Deep copy of genome"""`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8, fontSize: 16 }}>
                      Class: Mouse
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Represents an individual mouse with genome, phenotype,
                      lineage tracking, and quantitative trait value. Supports
                      both SIM and REAL modes.
                    </p>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Constructor:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`def __init__(self,
             genome: Genome = None,
             generation: int = 0,
             parents: Tuple[int, int] = None,
             age: int = 0,
             is_founder: bool = False,
             polytrait: float = None,
             strain: Optional[str] = None,
             dataset: Optional[Dataset] = None,
             mode: Mode = Mode.SIM):`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Attributes:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <code>id</code>: int - Unique identifier
                        (auto-incremented)
                      </li>
                      <li>
                        <code>genome</code>: Genome - Genetic information
                      </li>
                      <li>
                        <code>phenotype</code>: Dict - Observable traits (color,
                        size, etc.)
                      </li>
                      <li>
                        <code>parents</code>: Tuple[int, int] - Parent IDs (dam,
                        sire)
                      </li>
                      <li>
                        <code>generation</code>: int - Generation number
                      </li>
                      <li>
                        <code>polytrait</code>: float - Quantitative trait value
                      </li>
                      <li>
                        <code>strain</code>: Optional[str] - Strain name (REAL
                        mode)
                      </li>
                    </ul>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Example Usage:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Create founder mouse (SIM mode)
mouse = Mouse(generation=0, is_founder=True)

# Create from real strain (REAL mode)
dataset = Dataset.load("datasets/cleaned/...")
mouse = Mouse(generation=0, is_founder=True,
              strain="C57BL/6J", dataset=dataset,
              mode=Mode.REAL)`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8, fontSize: 16 }}>
                      Class: Population
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Manages a population of mice with breeding, selection
                      strategies, genomic calculations (GRM, inbreeding), and
                      statistics tracking.
                    </p>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Constructor:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`def __init__(self,
             size: int = 30,
             goal: Dict[str, str] = None,
             mode: Mode = Mode.SIM,
             dataset: Optional[Dataset] = None,
             strainA: Optional[str] = None,
             strainB: Optional[str] = None):`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Methods:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`def compute_grm(self) -> List[List[float]]:
    """Compute VanRaden genomic relationship matrix"""

def next_generation(self, strategy='fitness',
                    cull_rate=0.0) -> Dict:
    """Advance to next generation with selection"""

def get_stats(self) -> Dict:
    """Get population statistics and metrics"""

def select_fitness_pairs(self) -> List[Tuple]:
    """Select breeding pairs by fitness"""

def select_diverse_pairs(self) -> List[Tuple]:
    """Select genetically diverse pairs"""`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Example Usage:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Create population
pop = Population(size=30, mode=Mode.SIM)

# Advance generation with fitness selection
stats = pop.next_generation(strategy='fitness',
                             cull_rate=0.2)

# Compute genomic relationship matrix
grm = pop.compute_grm()

# Get statistics
stats = pop.get_stats()
print(f"Mean inbreeding: {stats['mean_F_pedigree']}")`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8, fontSize: 16 }}>
                      Class: Dataset
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Lightweight loader for real mouse strain data from Mouse
                      Phenome Database (MPD). Handles genotype data and
                      phenotype predictions.
                    </p>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Attributes:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <code>strains</code>: Dict[str, Dict] - Strain genotypes
                        and phenotypes
                      </li>
                      <li>
                        <code>loci</code>: Dict[str, RealLocus] - Gene
                        definitions with alleles
                      </li>
                      <li>
                        <code>geno</code>: Dict - SNP marker genotypes for
                        genomic analysis
                      </li>
                    </ul>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Key Methods:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`@staticmethod
def load(filepath: str) -> 'Dataset':
    """Load dataset from JSON file"""

def get_genotype(self, strain: str, locus: str) -> int:
    """Get genotype (0/1/2) for strain at locus"""

def predict_cross(self, strain1: str, strain2: str,
                  locus: str) -> Dict:
    """Predict offspring probabilities"""`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Example Usage:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Load real strain data
dataset = Dataset.load("datasets/cleaned/...")

# Get genotype for C57BL/6J at Tyrp1 locus
geno = dataset.get_genotype("C57BL/6J", "Tyrp1")

# Predict cross outcome
pred = dataset.predict_cross("C57BL/6J", "BALB/cJ",
                              "Tyrp1")`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8, fontSize: 16 }}>
                      Function: mate()
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Core breeding function implementing Mendelian inheritance
                      with recombination and mutation. Creates offspring from
                      two parent mice.
                    </p>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Function Signature:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`def mate(parent1: Mouse, parent2: Mouse,
         n_offspring: int = None) -> List[Mouse]:`}
                    </pre>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Implementation Steps:
                    </div>
                    <ol
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        Each parent forms gametes via meiosis (recombination)
                      </li>
                      <li>Gametes combine to form offspring genomes</li>
                      <li>
                        Mutations applied at per-locus rates (0.001 SNPs, 0.01
                        traits)
                      </li>
                      <li>Phenotypes determined from genotypes</li>
                      <li>Quantitative traits computed from SNP effects</li>
                    </ol>

                    <div
                      style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}
                    >
                      Example Usage:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Breed two mice
parent1 = pop.mice[0]
parent2 = pop.mice[1]
offspring = mate(parent1, parent2, n_offspring=5)

# Offspring inherit from both parents
for child in offspring:
    print(f"Mouse {child.id}: {child.phenotype}")
    print(f"Parents: {child.parents}")`}
                    </pre>
                  </div>
                </div>
              )}

              {docSection === "mathematics" && (
                <div style={{ padding: 20, lineHeight: 1.8, fontSize: 13 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                      fontSize: 20,
                    }}
                  >
                    Mathematical Equations
                  </h2>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      1. Genomic Relationship Matrix (GRM)
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      VanRaden (2008) method for computing genomic relationships
                      from SNP marker data. This is the foundation of genomic
                      prediction in animal breeding and quantitative genetics.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Formula:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      G = (1 / Σ 2p<sub>j</sub>(1-p<sub>j</sub>)) × (M - 2P)(M -
                      2P)<sup>T</sup>
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>M</strong>: n×m matrix of SNP genotypes (0/1/2
                        encoding)
                      </li>
                      <li>
                        <strong>P</strong>: n×m matrix where each element is 2p
                        <sub>j</sub>
                      </li>
                      <li>
                        <strong>
                          p<sub>j</sub>
                        </strong>
                        : allele frequency at SNP j
                      </li>
                      <li>
                        <strong>M - 2P</strong>: centered genotype matrix
                        (critical step!)
                      </li>
                      <li>
                        <strong>G[i][j]</strong>: genomic relationship between
                        individuals i and j
                      </li>
                      <li>
                        <strong>G[i][i]</strong>: 1 + F<sub>i</sub> (diagonal
                        relates to inbreeding)
                      </li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                        marginBottom: 12,
                      }}
                    >
                      {`# Step 1: Get genotype matrix M (n × m)
M = [mouse.genome.get_snp_genotypes() for mouse in mice]

# Step 2: Compute allele frequencies
p = [sum(M[i][j] for i in range(n)) / (2*n)
     for j in range(m)]

# Step 3: Center the matrix (CRITICAL!)
M_centered = [[M[i][j] - 2*p[j]
               for j in range(m)]
              for i in range(n)]

# Step 4: Compute normalization
denom = sum(2*p_j*(1-p_j) for p_j in p)

# Step 5: Compute G = M_centered @ M_centered.T / denom
G = [[sum(M_centered[i][k] * M_centered[j][k]
          for k in range(m)) / denom
      for j in range(n)]
     for i in range(n)]`}
                    </pre>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Expected Values:
                    </div>
                    <ul style={{ marginLeft: 20, lineHeight: 1.8 }}>
                      <li>
                        Unrelated founders: G<sub>ik</sub> ≈ 0.0
                      </li>
                      <li>
                        Parent-offspring: G<sub>ik</sub> ≈ 0.5
                      </li>
                      <li>
                        Full siblings: G<sub>ik</sub> ≈ 0.5
                      </li>
                      <li>
                        Self (diagonal): G<sub>ii</sub> ≈ 1.0 + F<sub>i</sub>
                      </li>
                    </ul>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      2. Pedigree Inbreeding Coefficient
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Wright's coefficient (F) measuring probability of identity
                      by descent. Computed recursively from pedigree
                      relationships.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Formula:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      F<sub>X</sub> = φ(dam, sire)
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Kinship Coefficient:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      φ(i,j) = 0.5 × [φ(dam<sub>i</sub>, j) + φ(sire<sub>i</sub>
                      , j)] × (1 + F<sub>j</sub>)
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>
                          F<sub>X</sub>
                        </strong>
                        : inbreeding coefficient of individual X
                      </li>
                      <li>
                        <strong>φ(dam, sire)</strong>: kinship coefficient
                        between parents
                      </li>
                      <li>
                        <strong>φ(i,j)</strong>: probability that alleles are
                        identical by descent
                      </li>
                      <li>Founders: F = 0, φ(i,i) = 0.5</li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`def pedigree_inbreeding(mouse, registry):
    """Compute Wright's F coefficient"""
    if not mouse.parents:
        return 0.0  # Founder

    dam_id, sire_id = mouse.parents
    dam = registry[dam_id]
    sire = registry[sire_id]

    # F = kinship between parents
    return kinship(dam, sire, registry)

def kinship(mouse1, mouse2, registry):
    """Compute kinship coefficient φ(i,j)"""
    # Recursive computation using pedigree
    # Base case: φ(founder, founder) = 0
    # Recursive: φ(i,j) = 0.5[φ(dam_i,j) + φ(sire_i,j)]`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      3. Genomic Inbreeding
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Inbreeding coefficient derived from GRM diagonal elements.
                      Measures realized inbreeding from actual genomic data.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Formula:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      F<sub>genomic</sub> = G<sub>ii</sub> - 1
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>
                          G<sub>ii</sub>
                        </strong>
                        : diagonal element of GRM for individual i
                      </li>
                      <li>
                        <strong>
                          F<sub>genomic</sub>
                        </strong>
                        : genomic inbreeding coefficient
                      </li>
                      <li>Measures actual homozygosity from SNP data</li>
                      <li>
                        Can differ from pedigree F due to Mendelian sampling
                      </li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Compute GRM
G = pop.compute_grm()

# Extract genomic inbreeding for each individual
F_genomic = []
for i in range(len(pop.mice)):
    F_gen = G[i][i] - 1.0
    F_genomic.append(F_gen)

# Compare with pedigree inbreeding
F_pedigree = [pedigree_inbreeding(m, pop.mouse_registry)
              for m in pop.mice]
correlation = pearson_correlation(F_pedigree, F_genomic)`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      4. Linear Mixed Model (LMM)
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Quantitative trait model with fixed and random genetic
                      effects. Foundation of genomic prediction and breeding
                      value estimation.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Model:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      y = Xb + Za + e
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>y</strong>: n×1 vector of phenotypic
                        observations
                      </li>
                      <li>
                        <strong>X</strong>: n×p design matrix for fixed effects
                      </li>
                      <li>
                        <strong>b</strong>: p×1 vector of fixed effect
                        coefficients
                      </li>
                      <li>
                        <strong>Z</strong>: n×q incidence matrix
                      </li>
                      <li>
                        <strong>a</strong>: q×1 vector of random genetic
                        effects, a ~ N(0, Gσ<sup>2</sup>
                        <sub>a</sub>)
                      </li>
                      <li>
                        <strong>e</strong>: n×1 vector of residual errors, e ~
                        N(0, Iσ<sup>2</sup>
                        <sub>e</sub>)
                      </li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Heritability:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      h<sup>2</sup> = σ<sup>2</sup>
                      <sub>a</sub> / (σ<sup>2</sup>
                      <sub>a</sub> + σ<sup>2</sup>
                      <sub>e</sub>)
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`def compute_polytrait(mouse, snp_effects):
    """Compute quantitative trait from SNP effects"""
    genotypes = mouse.genome.get_snp_genotypes()

    # Additive genetic value
    genetic_value = sum(g * beta
                        for g, beta in zip(genotypes, snp_effects))

    # Add environmental noise
    h2 = 0.5  # Target heritability
    var_g = var(genetic_values)
    var_e = var_g * (1 - h2) / h2
    noise = random.gauss(0, sqrt(var_e))

    return genetic_value + noise`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      5. Chi-Square Test
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Goodness-of-fit test for Mendelian ratios (Pearson 1900).
                      Tests if observed genotype frequencies match expected
                      Mendelian ratios.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Formula:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      χ<sup>2</sup> = Σ[(O<sub>i</sub> - E<sub>i</sub>)
                      <sup>2</sup> / E<sub>i</sub>]
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>
                          O<sub>i</sub>
                        </strong>
                        : observed count for genotype i
                      </li>
                      <li>
                        <strong>
                          E<sub>i</sub>
                        </strong>
                        : expected count for genotype i
                      </li>
                      <li>
                        <strong>Critical value</strong>: 5.991 (α=0.05, df=2)
                      </li>
                      <li>
                        For Aa × Aa cross: Expected ratio 1:2:1 (AA:Aa:aa)
                      </li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`def chi_square_test(observed, expected):
    """Test if observed matches expected ratios"""
    chi2 = sum((obs - exp)**2 / exp
               for obs, exp in zip(observed, expected))

    # For 1:2:1 ratio (df=2), critical value = 5.991
    critical_value = 5.991
    p_value = 1 - chi2_cdf(chi2, df=2)

    return chi2 < critical_value  # Pass if chi2 < 5.991

# Example: Test Aa × Aa cross
n_trials = 1000
counts = {'AA': 0, 'Aa': 0, 'aa': 0}
for _ in range(n_trials):
    offspring = mate(parent1, parent2, n_offspring=1)[0]
    # Count genotypes...

observed = [counts['AA'], counts['Aa'], counts['aa']]
expected = [n_trials*0.25, n_trials*0.5, n_trials*0.25]
passes = chi_square_test(observed, expected)`}
                    </pre>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12, fontSize: 16 }}>
                      6. Heritability Estimation
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Parent-offspring regression method (Falconer & Mackay
                      1996). Breeder's equation relating selection response to
                      heritability.
                    </p>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Breeder's Equation:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      R = h<sup>2</sup> × S
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Where:
                    </div>
                    <ul
                      style={{
                        marginLeft: 20,
                        marginBottom: 12,
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>R</strong>: response to selection (offspring
                        mean - population mean)
                      </li>
                      <li>
                        <strong>S</strong>: selection differential (parent mean
                        - population mean)
                      </li>
                      <li>
                        <strong>
                          h<sup>2</sup>
                        </strong>
                        : narrow-sense heritability
                      </li>
                      <li>
                        <strong>
                          Realized h<sup>2</sup>
                        </strong>
                        : h<sup>2</sup> = R / S
                      </li>
                    </ul>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Regression Method:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#fff",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      Slope(offspring ~ mid-parent) = h<sup>2</sup>
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Implementation:
                    </div>
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        background: "#fff",
                        padding: 10,
                        border: "1px solid #d1d5db",
                        overflow: "auto",
                      }}
                    >
                      {`# Create large population
pop = Population(size=200)
pop_mean = mean([m.polytrait for m in pop.mice])

# Select top 20% as parents (strong selection)
sorted_mice = sorted(pop.mice, key=lambda m: m.polytrait,
                     reverse=True)
parents = sorted_mice[:40]
parent_mean = mean([m.polytrait for m in parents])

# Selection differential
S = parent_mean - pop_mean

# Breed selected parents
offspring = []
for i in range(0, len(parents), 2):
    offspring.extend(mate(parents[i], parents[i+1]))

# Response to selection
offspring_mean = mean([m.polytrait for m in offspring])
R = offspring_mean - pop_mean

# Realized heritability
h2_realized = R / S
h2_target = 0.5  # Target heritability

# Validation: |h2_realized - h2_target| < 0.15
passes = abs(h2_realized - h2_target) < 0.15`}
                    </pre>
                  </div>
                </div>
              )}

              {docSection === "validation" && (
                <div style={{ padding: 20, lineHeight: 1.6 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                    }}
                  >
                    Validation Methods
                  </h2>
                  <p style={{ marginBottom: 16 }}>
                    Five comprehensive validation methods verify the scientific
                    accuracy of the simulation.
                  </p>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>
                      Method 1: Mendelian Ratios (Chi-Square Test)
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Tests if breeding follows Mendel's laws by comparing
                      observed vs expected genotype ratios.
                    </p>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>Test:</strong> Aa × Aa cross should produce
                        1:2:1 ratio (AA:Aa:aa)
                      </div>
                      <div>
                        <strong>Method:</strong> Chi-square goodness-of-fit test
                      </div>
                      <div>
                        <strong>Pass Criteria:</strong> χ<sup>2</sup> &lt; 5.991
                        (p &gt; 0.05)
                      </div>
                      <div>
                        <strong>Reference:</strong> Mendel (1866), Pearson
                        (1900)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>
                      Method 2: GRM Relationship Accuracy
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Validates genomic relationship calculations against known
                      pedigree relationships.
                    </p>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>Test 1:</strong> Unrelated founders should have
                        G ≈ 0
                      </div>
                      <div>
                        <strong>Test 2:</strong> Parent-offspring should have G
                        ≈ 0.5
                      </div>
                      <div>
                        <strong>Test 3:</strong> Full siblings should have G ≈
                        0.5
                      </div>
                      <div>
                        <strong>Pass Criteria:</strong> All errors &lt; 0.2
                      </div>
                      <div>
                        <strong>Reference:</strong> VanRaden (2008), Wright
                        (1922)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>
                      Method 3: Inbreeding Coefficient Correlation
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Compares pedigree-based and genomic inbreeding
                      coefficients.
                    </p>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>Test:</strong> Correlation between F_pedigree
                        and F_genomic
                      </div>
                      <div>
                        <strong>Pass Criteria:</strong> Pearson r &gt; 0.7
                      </div>
                      <div>
                        <strong>Reference:</strong> Pryce et al. (2012)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>
                      Method 4: Realized Heritability
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Tests if realized h<sup>2</sup> matches target h
                      <sup>2</sup> = 0.4.
                    </p>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>Test:</strong> Parent-offspring regression slope
                      </div>
                      <div>
                        <strong>Pass Criteria:</strong> |h<sup>2</sup>_realized
                        - 0.4| &lt; 0.15
                      </div>
                      <div>
                        <strong>Reference:</strong> Falconer & Mackay (1996)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>
                      Method 5: Real Mode Prediction Accuracy
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Validates predictions against Mouse Genome Database.
                    </p>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>Test:</strong> Known crosses with documented
                        outcomes
                      </div>
                      <div>
                        <strong>Pass Criteria:</strong> Accuracy &gt; 80%
                      </div>
                      <div>
                        <strong>Reference:</strong> Mouse Genome Informatics
                        (MGI)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {docSection === "references" && (
                <div style={{ padding: 20, lineHeight: 1.8 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                    }}
                  >
                    References
                  </h2>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Falconer, D.S. & Mackay, T.F.C. (1996).</strong>{" "}
                    Introduction to Quantitative Genetics. 4th Edition. Longman,
                    Harlow, Essex, UK.
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Mendel, G. (1866).</strong> Versuche über
                    Pflanzen-Hybriden. Verhandlungen des naturforschenden
                    Vereines in Brünn, 4, 3-47.
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Pearson, K. (1900).</strong> On the criterion that a
                    given system of deviations from the probable in the case of
                    a correlated system of variables is such that it can be
                    reasonably supposed to have arisen from random sampling.
                    Philosophical Magazine Series 5, 50(302), 157-175.
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>
                      Pryce, J.E., Haile-Mariam, M., Goddard, M.E. & Hayes, B.J.
                      (2014).
                    </strong>{" "}
                    Identification of genomic regions associated with inbreeding
                    depression in Holstein and Jersey dairy cattle. Genetics
                    Selection Evolution, 46, 71.
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>VanRaden, P.M. (2008).</strong> Efficient methods to
                    compute genomic predictions. Journal of Dairy Science,
                    91(11), 4414-4423.
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Wright, S. (1922).</strong> Coefficients of
                    inbreeding and relationship. The American Naturalist,
                    56(645), 330-338.
                  </div>

                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 32,
                      marginBottom: 16,
                    }}
                  >
                    Data Sources
                  </h3>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Mouse Genome Informatics (MGI).</strong> The Jackson
                    Laboratory. Available at: http://www.informatics.jax.org
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      paddingLeft: 20,
                      textIndent: -20,
                    }}
                  >
                    <strong>Mouse Phenome Database (MPD).</strong> The Jackson
                    Laboratory. Available at: https://phenome.jax.org
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

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

          {mode === "SIM" && breedResult ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Breeding Results</h3>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}>
                Actual genetic outcomes from the breeding event
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#374151",
                  marginBottom: 12,
                  padding: "8px 10px",
                  background: "#f9fafb",
                  borderRadius: 6,
                }}
              >
                <strong>{breedResult.cross_diagram}</strong> →{" "}
                {breedResult.offspring_count} offspring
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
                  Coat Color Distribution
                </div>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6 }}>
                  Observed phenotypes in offspring
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    lineHeight: 1.6,
                  }}
                >
                  {Object.entries(breedResult.genotype_counts || {}).map(
                    ([k, v]) => (
                      <div
                        key={k}
                        style={{
                          padding: "6px 0",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{k}:</span> {v} (
                        {Math.round((v / breedResult.offspring_count) * 100)}%)
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {mode === "REAL" && predictResult ? (
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
