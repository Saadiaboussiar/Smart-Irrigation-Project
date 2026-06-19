import { ChevronRight } from "lucide-react";
import cottonImg    from "../assets/plants/cotton.jpg";
import maizeImg     from "../assets/plants/maize.jpg";
import potatoImg    from "../assets/plants/potato.jpg";
import riceImg      from "../assets/plants/rice.jpg";
import sugarcaneImg from "../assets/plants/sugarcane.jpg";
import wheatImg     from "../assets/plants/wheat.jpg";

const PLANTS = [
  { id: 1, name: "Maize",     color: "#f9a825", bg: "#fffde7", img: maizeImg },
  { id: 2, name: "Potato",    color: "#8d6e63", bg: "#efebe9", img: potatoImg },
  { id: 3, name: "Rice",      color: "#43a047", bg: "#e8f5e9", img: riceImg },
  { id: 4, name: "Sugarcane", color: "#00897b", bg: "#e0f2f1", img: sugarcaneImg },
  { id: 5, name: "Wheat",     color: "#fb8c00", bg: "#fff3e0", img: wheatImg },
];

interface Props {
  onSelectPlant: (plantId: number, plantName: string) => void;
}

export default function PlantsPage({ onSelectPlant }: Props) {
  return (
    <div style={{ 
        width: '150%',
      padding: '20px 70px 10px 20px', 
      maxWidth: '420px',  // Same as Dashboard
      margin: '0 auto',
      minHeight: '120vh',
      background: '#f8faf8'
    }}>
      <div style={{
        width: '118%',
        background: '#2e7d32',  // Same as Dashboard
        borderRadius: '16px',
        padding: '30px 30px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 className="header-title">Your Plants</h1>
        <p className="header-sub">Select a plant to view its history</p>
      </div>

      <div className="content">
        {PLANTS.map((plant) => (
          <button
            key={plant.id}
            onClick={() => onSelectPlant(plant.id, plant.name)}
            style={{
              width: "120%",
              background: "#fff",
              border: "1px solid #e8f5e9",
              borderLeft: `4px solid ${plant.color}`,
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "left",
            }}
          >
            {/* Plant avatar */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                background: plant.bg,
                border: `2px solid ${plant.color}`,
                flexShrink: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
  src={plant.img}
  alt={plant.name}
  style={{ width: "100%", height: "100%", objectFit: "cover" }}
/>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>
                {plant.name}
              </p>
              <p style={{ fontSize: 12, color: "#888" }}>
                Tap to view history & accuracy
              </p>
            </div>

            <ChevronRight size={16} color="#aaa" />
          </button>
        ))}
      </div>
    </div>
  );
}