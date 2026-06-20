import { Droplets, TriangleAlert, CheckCircle } from "lucide-react";
import { Notification } from "../types/notification";
import { ChevronRight } from "lucide-react";
import cottonImg    from "../assets/plants/cotton.jpg";
import maizeImg     from "../assets/plants/maize.jpg";
import potatoImg    from "../assets/plants/potato.jpg";
import riceImg      from "../assets/plants/rice.jpg";
import sugarcaneImg from "../assets/plants/sugarcane.jpg";
import wheatImg     from "../assets/plants/wheat.jpg";

const PLANT_IMAGES: Record<string, string> = {
  Cotton:   cottonImg,
  Maize:    maizeImg,
  Potato:   potatoImg,
  Rice:     riceImg,
  Sugarcane:sugarcaneImg,
  Wheat:    wheatImg,
};

const PLANT_COLORS: Record<string, string> = {
  Cotton:    "#795548",
  Maize:     "#f9a825",
  Potato:    "#8d6e63",
  Rice:      "#43a047",
  Sugarcane: "#00897b",
  Wheat:     "#fb8c00",
};

interface Props {
  notif: Notification;
  onFeedback: (id: string) => void;
}

export default function NotificationCard({ notif, onFeedback }: Props) {
  const color = PLANT_COLORS[notif.crop_type] ?? "#2e7d32";
  const img   = PLANT_IMAGES[notif.crop_type];

  const time = new Date(notif.timestamp).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{ ...styles.card, borderLeftColor: color }}>
      {/* Plant image */}
      <div style={styles.imgWrap}>
        {img ? (
          <img src={img} alt={notif.crop_type} style={styles.img} />
        ) : (
          <div style={{ ...styles.imgFallback, background: color }} />
        )}
      </div>

      {/* Content */}
      <div style={styles.body}>
        <div style={styles.topRow}>
          <TriangleAlert size={14} color="#e65100" />
          <span style={styles.cropName}>{notif.crop_type}</span>
          <span style={styles.zone}>({notif.zone_id})</span>
          <span style={styles.time}>{time}</span>
        </div>

        <p style={styles.msg}>
          Needs water —{" "}
          <span style={styles.liters}>
            {notif.water_liters.toFixed(1)} L
          </span>{" "}
          recommended
        </p>

        <p style={styles.conf}>
          Confidence: {Math.round(notif.probabilite * 100)}%
        </p>

        <p style={styles.predId}>ID: {notif.id.slice(0, 8)}…</p>

        {/* Feedback button */}
        {notif.feedbackGiven ? (
          <div style={styles.feedbackDone}>
            <CheckCircle size={13} color="#2e7d32" />
            <span>Feedback recorded — model will retrain</span>
          </div>
        ) : (
          <button
            style={styles.feedbackBtn}
            onClick={() => onFeedback(notif.id)}
          >
            <Droplets size={13} />
            Plant doesn't need water (wrong prediction)
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff8f0",
    border: "1px solid #ffe0b2",
    borderLeft: "4px solid",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    gap: 10,
  },
  imgWrap: {
    flexShrink: 0,
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imgFallback: {
    width: "100%",
    height: "100%",
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  cropName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a1a1a",
  },
  zone: {
    fontSize: 11,
    color: "#888",
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: "#aaa",
  },
  msg: {
    fontSize: 13,
    color: "#444",
  },
  liters: {
    fontWeight: 700,
    color: "#e65100",
    fontSize: 15,
  },
  conf: {
    fontSize: 11,
    color: "#888",
  },
  predId: {
    fontSize: 10,
    color: "#bbb",
    fontFamily: "monospace",
  },
  feedbackBtn: {
    marginTop: 4,
    background: "#fff3e0",
    border: "1.5px solid #ffcc80",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    color: "#e65100",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'DM Sans', sans-serif",
  },
  feedbackDone: {
    marginTop: 4,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: 500,
  },
};