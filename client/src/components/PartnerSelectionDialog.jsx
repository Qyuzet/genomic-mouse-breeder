import React, { useState } from "react";

export default function PartnerSelectionDialog({
  mouse,
  availableMice,
  onBreed,
  onClose,
}) {
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [offspringCount, setOffspringCount] = useState(2);
  const [isBreeding, setIsBreeding] = useState(false);

  if (!mouse) return null;

  const handleBreed = async () => {
    if (!selectedPartner) {
      alert("Please select a partner");
      return;
    }
    setIsBreeding(true);
    try {
      await onBreed(mouse, selectedPartner, offspringCount);
      onClose();
    } catch (e) {
      console.error("Breeding failed:", e);
      setIsBreeding(false);
    }
  };

  const getCompatibilityScore = (partner) => {
    if (!partner || !mouse) return 0;
    const genDiff = Math.abs(
      (partner.generation || 0) - (mouse.generation || 0)
    );
    if (genDiff === 0) return 100;
    if (genDiff === 1) return 85;
    if (genDiff === 2) return 70;
    return 50;
  };

  const getCompatibilityLabel = (score) => {
    if (score >= 90) return { text: "Excellent", color: "#10b981" };
    if (score >= 70) return { text: "Good", color: "#3b82f6" };
    if (score >= 50) return { text: "Fair", color: "#f59e0b" };
    return { text: "Poor", color: "#ef4444" };
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 600,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>
            Select Breeding Partner
          </h3>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Breeding: Mouse #{String(mouse.id).slice(0, 8)} (Generation{" "}
            {mouse.generation || 0})
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 8,
              color: "#374151",
            }}
          >
            Choose a partner (
            {availableMice.filter((m) => m.id !== mouse.id).length} available):
          </div>
          <div
            style={{
              maxHeight: 300,
              overflowY: "scroll",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 #f1f5f9",
            }}
          >
            {availableMice
              .filter((m) => m.id !== mouse.id)
              .map((partner) => {
                const compatibility = getCompatibilityScore(partner);
                const compatLabel = getCompatibilityLabel(compatibility);
                const isSelected = selectedPartner?.id === partner.id;

                return (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartner(partner)}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        Mouse #{String(partner.id).slice(0, 8)}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Generation {partner.generation || 0} • Coat:{" "}
                        {partner.genome_summary?.coat_color || "Unknown"} •
                        Size: {partner.genome_summary?.size || "Unknown"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: compatLabel.color,
                      }}
                    >
                      {compatLabel.text}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 8,
              color: "#374151",
              textAlign: "center",
            }}
          >
            Number of offspring:
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[2, 4, 6].map((count) => (
              <button
                key={count}
                onClick={() => setOffspringCount(count)}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    offspringCount === count ? "#3b82f6" : "#f3f4f6",
                  color: offspringCount === count ? "white" : "#374151",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isBreeding}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f3f4f6",
              border: "none",
              borderRadius: 6,
              cursor: isBreeding ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: isBreeding ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleBreed}
            disabled={!selectedPartner || isBreeding}
            style={{
              padding: "8px 16px",
              backgroundColor:
                selectedPartner && !isBreeding ? "#3b82f6" : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor:
                selectedPartner && !isBreeding ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            {isBreeding ? "Breeding..." : "Breed Selected Mice"}
          </button>
        </div>
      </div>
    </div>
  );
}
