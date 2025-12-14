import React from "react";

export default function MouseCard({ mouse, onBreed }) {
  const id = mouse.id || mouse;
  const phenotype = mouse.phenotype ? JSON.stringify(mouse.phenotype) : "—";

  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: 8,
        borderRadius: 6,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>#{id}</strong>{" "}
        <span style={{ color: "#666" }}>Gen {mouse.generation ?? "—"}</span>
      </div>
      <div style={{ fontSize: 12, color: "#333", marginBottom: 8 }}>
        Phenotype: <span style={{ color: "#111" }}>{phenotype}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBreed}>Breed</button>
        <button onClick={() => alert(JSON.stringify(mouse, null, 2))}>
          Details
        </button>
      </div>
    </div>
  );
}
