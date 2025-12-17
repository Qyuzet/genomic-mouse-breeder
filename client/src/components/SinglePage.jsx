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
                <div style={{ padding: 20, lineHeight: 1.6 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
                    }}
                  >
                    Mouse Breeding Simulator - Overview
                  </h2>
                  <p style={{ marginBottom: 12 }}>
                    A comprehensive genetics simulation system implementing
                    Mendelian inheritance, quantitative genetics, and genomic
                    prediction methods used in modern animal breeding.
                  </p>
                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 20,
                      marginBottom: 12,
                    }}
                  >
                    Core Features
                  </h3>
                  <ul style={{ marginLeft: 20, marginBottom: 16 }}>
                    <li>Genome-wide SNPs (200 biallelic markers)</li>
                    <li>
                      Recombination via Poisson crossovers on 2 chromosomes
                    </li>
                    <li>Wright's pedigree inbreeding coefficient (F)</li>
                    <li>VanRaden genomic relationship matrix (GRM)</li>
                    <li>Quantitative trait via linear mixed model (LMM)</li>
                    <li>Per-locus mutation model</li>
                    <li>
                      Real mouse strain data integration (Mouse Phenome
                      Database)
                    </li>
                  </ul>
                  <h3
                    style={{
                      borderBottom: "1px solid #000",
                      paddingBottom: 4,
                      marginTop: 20,
                      marginBottom: 12,
                    }}
                  >
                    Simulation Modes
                  </h3>
                  <div style={{ marginBottom: 12 }}>
                    <strong>SIM Mode (Simulated Genetics):</strong> Uses
                    simulated genomes with random SNP markers and Mendelian
                    inheritance patterns.
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>REAL Mode (Real Genomic Data):</strong> Uses actual
                    mouse strain genotypes from the Mouse Phenome Database for
                    prediction.
                  </div>
                </div>
              )}

              {docSection === "classes" && (
                <div style={{ padding: 20, lineHeight: 1.6 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
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
                    <h3 style={{ marginBottom: 8 }}>Class: Genome</h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Stores genetic information including visible traits and
                      genome-wide SNPs.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "#f9f9f9",
                        padding: 8,
                        border: "1px solid #ddd",
                      }}
                    >
                      <div>
                        - snps: List[int] (200 SNP genotypes, 0/1/2 encoding)
                      </div>
                      <div>
                        - visible_traits: Dict (coat_color, size, temperament)
                      </div>
                      <div>- get_snp_genotypes() → List[int]</div>
                      <div>- get_allele_frequencies() → List[float]</div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>Class: Mouse</h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Represents an individual mouse with genome, phenotype,
                      lineage, and quantitative trait.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "#f9f9f9",
                        padding: 8,
                        border: "1px solid #ddd",
                      }}
                    >
                      <div>- id: int (unique identifier)</div>
                      <div>- genome: Genome (genetic information)</div>
                      <div>- phenotype: Dict (observable traits)</div>
                      <div>- parents: Tuple[int, int] (dam_id, sire_id)</div>
                      <div>- generation: int (generation number)</div>
                      <div>- polytrait: float (quantitative trait value)</div>
                      <div>- mate(partner, n_offspring) → List[Mouse]</div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>Class: Population</h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Manages a population of mice with breeding, selection, and
                      statistics tracking.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "#f9f9f9",
                        padding: 8,
                        border: "1px solid #ddd",
                      }}
                    >
                      <div>- mice: List[Mouse] (all individuals)</div>
                      <div>- mouse_registry: Dict[int, Mouse] (ID lookup)</div>
                      <div>- goal: Dict (breeding objectives)</div>
                      <div>- compute_grm() → List[List[float]]</div>
                      <div>
                        - compute_genomic_inbreeding() → Dict[int, float]
                      </div>
                      <div>- next_generation(strategy, cull_rate)</div>
                      <div>- get_statistics() → Dict</div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 24,
                      border: "1px solid #000",
                      padding: 12,
                    }}
                  >
                    <h3 style={{ marginBottom: 8 }}>Class: Dataset</h3>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      Lightweight loader for real mouse strain data from Mouse
                      Phenome Database.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "#f9f9f9",
                        padding: 8,
                        border: "1px solid #ddd",
                      }}
                    >
                      <div>- strains: Dict[str, Dict] (strain genotypes)</div>
                      <div>- loci: Dict[str, RealLocus] (gene definitions)</div>
                      <div>- get_genotype(strain, locus) → int</div>
                      <div>- predict_cross(strain1, strain2, locus) → Dict</div>
                    </div>
                  </div>
                </div>
              )}

              {docSection === "mathematics" && (
                <div style={{ padding: 20, lineHeight: 1.8 }}>
                  <h2
                    style={{
                      borderBottom: "2px solid #000",
                      paddingBottom: 8,
                      marginBottom: 16,
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
                    <h3 style={{ marginBottom: 12 }}>
                      1. Genomic Relationship Matrix (GRM)
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      VanRaden (2008) method for computing genomic relationships
                      from SNP marker data.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      G = (1 / Σ 2p<sub>j</sub>(1-p<sub>j</sub>)) × (M - 2P)(M -
                      2P)<sup>T</sup>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>M</strong>: n×m matrix of SNP genotypes (0/1/2
                        encoding)
                      </div>
                      <div>
                        <strong>P</strong>: n×m matrix where each element is 2p
                        <sub>j</sub>
                      </div>
                      <div>
                        <strong>
                          p<sub>j</sub>
                        </strong>
                        : allele frequency at SNP j
                      </div>
                      <div>
                        <strong>G[i][j]</strong>: genomic relationship between
                        individuals i and j
                      </div>
                      <div>
                        <strong>G[i][i]</strong>: 1 + F<sub>i</sub> (diagonal
                        relates to inbreeding)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12 }}>
                      2. Pedigree Inbreeding Coefficient
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Wright's coefficient measuring probability of identity by
                      descent.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      F<sub>X</sub> = φ(dam, sire)
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>
                          F<sub>X</sub>
                        </strong>
                        : inbreeding coefficient of individual X
                      </div>
                      <div>
                        <strong>φ(dam, sire)</strong>: kinship coefficient
                        between parents
                      </div>
                      <div>
                        <strong>φ(i,j)</strong>: probability that alleles are
                        identical by descent
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12 }}>3. Genomic Inbreeding</h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Inbreeding coefficient derived from GRM diagonal elements.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      F<sub>genomic</sub> = G<sub>ii</sub> - 1
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>
                          G<sub>ii</sub>
                        </strong>
                        : diagonal element of GRM for individual i
                      </div>
                      <div>
                        <strong>
                          F<sub>genomic</sub>
                        </strong>
                        : genomic inbreeding coefficient
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12 }}>
                      4. Linear Mixed Model (LMM)
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Quantitative trait model with fixed and random genetic
                      effects.
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      y = Xb + Za + e
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <div>
                        <strong>y</strong>: n×1 vector of phenotypic
                        observations
                      </div>
                      <div>
                        <strong>X</strong>: n×p design matrix for fixed effects
                      </div>
                      <div>
                        <strong>b</strong>: p×1 vector of fixed effect
                        coefficients
                      </div>
                      <div>
                        <strong>Z</strong>: n×q incidence matrix
                      </div>
                      <div>
                        <strong>a</strong>: q×1 vector of random genetic
                        effects, a ~ N(0, Gσ<sup>2</sup>
                        <sub>a</sub>)
                      </div>
                      <div>
                        <strong>e</strong>: n×1 vector of residual errors, e ~
                        N(0, Iσ<sup>2</sup>
                        <sub>e</sub>)
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                      }}
                    >
                      h<sup>2</sup> = σ<sup>2</sup>
                      <sub>a</sub> / (σ<sup>2</sup>
                      <sub>a</sub> + σ<sup>2</sup>
                      <sub>e</sub>)
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12 }}>5. Chi-Square Test</h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Goodness-of-fit test for Mendelian ratios (Pearson 1900).
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      χ<sup>2</sup> = Σ[(O<sub>i</sub> - E<sub>i</sub>)
                      <sup>2</sup> / E<sub>i</sub>]
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <strong>
                          O<sub>i</sub>
                        </strong>
                        : observed count for genotype i
                      </div>
                      <div>
                        <strong>
                          E<sub>i</sub>
                        </strong>
                        : expected count for genotype i
                      </div>
                      <div>
                        <strong>Critical value</strong>: 5.991 (α=0.05, df=2)
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 32,
                      border: "1px solid #000",
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginBottom: 12 }}>
                      6. Heritability Estimation
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      Parent-offspring regression method (Falconer & Mackay
                      1996).
                    </p>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                        marginBottom: 12,
                      }}
                    >
                      R = h<sup>2</sup> × S
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <div>
                        <strong>R</strong>: response to selection
                      </div>
                      <div>
                        <strong>S</strong>: selection differential
                      </div>
                      <div>
                        <strong>
                          h<sup>2</sup>
                        </strong>
                        : narrow-sense heritability
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        background: "#f9f9f9",
                        padding: 12,
                        border: "1px solid #000",
                      }}
                    >
                      Slope(offspring ~ mid-parent) = h<sup>2</sup>
                    </div>
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
