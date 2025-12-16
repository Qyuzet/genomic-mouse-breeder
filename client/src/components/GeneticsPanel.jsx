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
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleGRM}
          disabled={!population || loading}
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          Compute GRM
        </button>
        <button
          onClick={handleInbreeding}
          disabled={!population || loading}
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          Inbreeding
        </button>
      </div>
      <div>
        {grm && !grm.error && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Genomic Relationship Matrix
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 10,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th
                      style={{
                        border: "1px solid #e5e7eb",
                        padding: 4,
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
                          padding: 4,
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {String(id).slice(0, 4)}
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
                          padding: 4,
                          fontWeight: 500,
                          background: "#f9fafb",
                          color: "#374151",
                        }}
                      >
                        {String((grm.mouse_ids || [])[i]).slice(0, 4)}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #e5e7eb",
                            padding: 4,
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          {typeof val === "number"
                            ? val.toFixed(2)
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
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
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
    </>
  );
}
