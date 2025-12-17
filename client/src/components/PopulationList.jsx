import React from "react";
import MouseCard from "./MouseCard";

export default function PopulationList({ population, onBreed, onRefresh }) {
  if (!population) {
    return (
      <div className="panel">
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            No population created
          </div>
          <div style={{ fontSize: 12 }}>
            Create a population to start breeding
          </div>
        </div>
      </div>
    );
  }

  const mice = population.mice_sample || [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#374151",
              marginBottom: 2,
            }}
          >
            {population.name || "Population"}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            Gen {population.generation || 0} • {population.size || mice.length}{" "}
            mice total
            {population.size > mice.length && (
              <span style={{ color: "#f59e0b" }}> (showing {mice.length})</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onRefresh && onRefresh(population.id)}
          style={{ margin: 0, padding: "4px 10px", fontSize: 11 }}
          title="Reload population data to see all mice"
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 8,
          flex: 1,
          overflowY: "auto",
          alignContent: "start",
        }}
      >
        {mice.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              color: "#9ca3af",
              textAlign: "center",
              padding: "20px",
              fontSize: 12,
            }}
          >
            No mice in this population
          </div>
        )}
        {mice.map((m, idx) => (
          <MouseCard
            key={m.id || idx}
            mouse={m}
            onBreed={() => onBreed && onBreed(m)}
          />
        ))}
      </div>
    </div>
  );
}
