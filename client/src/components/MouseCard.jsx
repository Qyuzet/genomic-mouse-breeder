import React from "react";

export default function MouseCard({ mouse, onBreed }) {
  const id = mouse.id || mouse;
  const phenotype = mouse.phenotype || {};

  const formatPhenotype = (pheno) => {
    if (!pheno || typeof pheno !== "object") return "No data";
    const entries = Object.entries(pheno);
    if (entries.length === 0) return "No data";
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        padding: 8,
        borderRadius: 6,
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
          fontSize: 11,
          marginBottom: 6,
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
            fontSize: 10,
            color: "#6b7280",
            background: "#f3f4f6",
            padding: "1px 5px",
            borderRadius: 3,
            border: "1px solid #e5e7eb",
          }}
        >
          G{mouse.generation ?? "0"}
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
          marginBottom: 8,
          lineHeight: 1.3,
          height: "26px",
          overflow: "hidden",
        }}
      >
        {formatPhenotype(phenotype)}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={onBreed}
          style={{
            flex: 1,
            margin: 0,
            padding: "4px 8px",
            fontSize: 11,
          }}
        >
          Breed
        </button>
        <button
          onClick={() => alert(JSON.stringify(mouse, null, 2))}
          style={{
            margin: 0,
            padding: "4px 8px",
            fontSize: 11,
          }}
        >
          Info
        </button>
      </div>
    </div>
  );
}
