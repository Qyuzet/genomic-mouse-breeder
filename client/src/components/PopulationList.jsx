import React from "react";
import MouseCard from "./MouseCard";

export default function PopulationList({ population, onBreed, onRefresh }) {
  if (!population) return <div className="card">No population</div>;

  const mice = population.mice_sample || [];

  return (
    <div className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4>Population: {population.name || population.id}</h4>
        <div>
          <button onClick={() => onRefresh && onRefresh(population.id)}>
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 8,
        }}
      >
        {mice.length === 0 && (
          <div style={{ gridColumn: "1/-1", color: "#666" }}>
            No mice listed in sample.
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
