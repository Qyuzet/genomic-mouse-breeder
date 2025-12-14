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
      <h4>Genetics</h4>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleGRM} disabled={!population || loading}>
          Compute GRM
        </button>
        <button onClick={handleInbreeding} disabled={!population || loading}>
          Genomic Inbreeding
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        {grm && !grm.error && (
          <div>
            <strong>GRM:</strong>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ borderCollapse: "collapse", minWidth: 400 }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #eee", padding: 6 }}>ID</th>
                    {(grm.mouse_ids || []).map((id) => (
                      <th
                        key={id}
                        style={{ border: "1px solid #eee", padding: 6 }}
                      >
                        {id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(grm.grm || []).map((row, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #eee", padding: 6 }}>
                        {(grm.mouse_ids || [])[i]}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #f1f1f1",
                            padding: 6,
                            textAlign: "right",
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
          <div style={{ color: "#900" }}>GRM error: {grm.error}</div>
        )}

        {inb && (
          <div style={{ marginTop: 8 }}>
            <strong>Inbreeding:</strong>
            <pre style={{ maxHeight: 200, overflow: "auto" }}>
              {JSON.stringify(inb, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
