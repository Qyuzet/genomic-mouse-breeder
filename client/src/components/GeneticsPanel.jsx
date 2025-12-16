import React, { useState } from "react";
import * as api from "../api";

export default function GeneticsPanel({ population }) {
  const [grm, setGrm] = useState(null);
  const [inb, setInb] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGRM() {
    if (!population) return;
    setLoading(true);
    try {
      const ids = (population.mice_sample || []).map((m) => m.id || m);
      const res = await api.computeGRM({ mouse_ids: ids });
      setGrm(res);
    } catch (e) {
      setGrm({ error: e.message });
    }
    setLoading(false);
  }

  async function handleInbreeding() {
    if (!population) return;
    setLoading(true);
    try {
      const ids = (population.mice_sample || []).map((m) => m.id || m);
      const res = await api.computeInbreeding({ mouse_ids: ids });
      setInb(res);
    } catch (e) {
      setInb({ error: e.message });
    }
    setLoading(false);
  }

  return (
    <div className="panel">
      <h4>Genetic Analysis</h4>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleGRM} disabled={!population || loading}>
          Compute GRM
        </button>
        <button onClick={handleInbreeding} disabled={!population || loading}>
          Inbreeding
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        {grm && !grm.error && (
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Genomic Relationship Matrix
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th
                      style={{
                        border: "1px solid #e5e7eb",
                        padding: 8,
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      ID
                    </th>
                    {(grm.mouse_ids || []).map((id) => (
                      <th
                        key={id}
                        style={{
                          border: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {String(id).slice(0, 6)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(grm.grm || []).map((row, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          border: "1px solid #e5e7eb",
                          padding: 8,
                          fontWeight: 500,
                          background: "#f9fafb",
                          color: "#374151",
                        }}
                      >
                        {String((grm.mouse_ids || [])[i]).slice(0, 6)}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #e5e7eb",
                            padding: 8,
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          {typeof val === "number"
                            ? val.toFixed(3)
                            : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {grm && grm.error && (
          <div className="error">GRM Error: {grm.error}</div>
        )}

        {inb && !inb.error && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Inbreeding Coefficients
            </div>
            <div className="mini-json">{JSON.stringify(inb, null, 2)}</div>
          </div>
        )}

        {inb && inb.error && (
          <div className="error">Inbreeding Error: {inb.error}</div>
        )}
      </div>
    </div>
  );
}
