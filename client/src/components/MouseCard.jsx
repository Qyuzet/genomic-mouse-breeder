import React from "react";

export default function MouseCard({ mouse, onBreed }) {
  const id = mouse.id || mouse;
  const phenotype = mouse.phenotype || mouse.traits || {};
  const genotype = mouse.genotype || {};

  const formatPhenotype = (pheno) => {
    if (
      !pheno ||
      typeof pheno !== "object" ||
      Object.keys(pheno).length === 0
    ) {
      if (
        genotype &&
        typeof genotype === "object" &&
        Object.keys(genotype).length > 0
      ) {
        const entries = Object.entries(genotype);
        return entries
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
      }
      return `Gen ${mouse.generation || 0}`;
    }
    const entries = Object.entries(pheno);
    return entries
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        padding: 6,
        borderRadius: 4,
        background: "#fff",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#9ca3af";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      <div
        style={{
          fontSize: 10,
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600, color: "#111827" }}>
          #{String(id).slice(0, 6)}
        </span>
        <span
          style={{
            fontSize: 9,
            color: "#6b7280",
            background: "#f3f4f6",
            padding: "1px 4px",
            borderRadius: 2,
            border: "1px solid #e5e7eb",
          }}
          title={`Generation ${
            mouse.generation ?? "0"
          } - number of breeding cycles from original population`}
        >
          G{mouse.generation ?? "0"}
        </span>
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#6b7280",
          marginBottom: 6,
          lineHeight: 1.3,
          height: "22px",
          overflow: "hidden",
        }}
      >
        {formatPhenotype(phenotype)}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <button
          onClick={onBreed}
          style={{
            flex: 1,
            margin: 0,
            padding: "3px 6px",
            fontSize: 10,
          }}
          title="Select a partner and breed this mouse"
        >
          Select Partner
        </button>
        <button
          onClick={() => alert(JSON.stringify(mouse, null, 2))}
          style={{
            margin: 0,
            padding: "3px 6px",
            fontSize: 10,
          }}
        >
          Info
        </button>
      </div>
    </div>
  );
}
