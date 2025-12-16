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
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <div>
          <h4 style={{ margin: 0, marginBottom: 2, fontSize: 12 }}>
            {population.name || "Population"}
          </h4>
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            Gen {population.generation || 0} • {mice.length} mice
          </div>
        </div>
        <button
          onClick={() => onRefresh && onRefresh(population.id)}
          style={{ margin: 0, padding: "4px 10px", fontSize: 11 }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 8,
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
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
              fontSize: 11,
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
