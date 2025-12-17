import React, { useState } from "react";

export default function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  badge = null,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: 12,
          backgroundColor: isOpen ? "#f9fafb" : "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {title}
            {badge && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {description}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#9ca3af",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </div>
      </div>
      {isOpen && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "white",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

