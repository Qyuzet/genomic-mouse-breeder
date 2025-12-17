import React from "react";

export default function TabLayout({ activeTab, onTabChange, tabs }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: -2,
              transition: "all 0.2s",
            }}
            title={tab.description}
          >
            {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

