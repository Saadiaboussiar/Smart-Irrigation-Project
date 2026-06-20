import { X, Check, Bell } from "lucide-react";
import { Notification } from "../types/notification";
import NotificationCard from "./NotificationCard";

interface Props {
  open: boolean;
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onFeedback: (id: string) => void;
}

export default function NotificationDrawer({
  open, notifications, onClose, onMarkAllRead, onFeedback,
}: Props) {
  if (!open) return null;

  const waterNeeded = notifications.filter((n) => true); // all are besoin_eau=1

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={styles.backdrop} />

      {/* Drawer */}
      <div style={styles.drawer}>
        <div style={styles.handle} />

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Bell size={18} color="#2e7d32" />
            <h2 style={styles.title}>Notifications</h2>
            {notifications.length > 0 && (
              <span style={styles.count}>{notifications.length}</span>
            )}
          </div>
          <div style={styles.headerRight}>
            {notifications.length > 0 && (
              <button style={styles.markBtn} onClick={onMarkAllRead}>
                <Check size={13} /> Mark all read
              </button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={18} color="#666" />
            </button>
          </div>
        </div>

        <div style={styles.list}>
          {waterNeeded.length === 0 ? (
            <div style={styles.empty}>
              <Bell size={32} color="#ccc" />
              <p style={styles.emptyText}>No alerts right now</p>
              <p style={styles.emptySubtext}>
                Your fields are being monitored every 10 seconds
              </p>
            </div>
          ) : (
            waterNeeded.map((n) => (
              <NotificationCard
                key={n.id}
                notif={n}
                onFeedback={onFeedback}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 200,
  },
  drawer: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    zIndex: 201,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
  },
  handle: {
    width: 36,
    height: 4,
    background: "#e0e0e0",
    borderRadius: 2,
    margin: "12px auto 0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #f0f0f0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a1a1a",
  },
  count: {
    background: "#e8f5e9",
    color: "#2e7d32",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
  },
  markBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 12,
    color: "#555",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'DM Sans', sans-serif",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
  },
  list: {
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "40px 0",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 600,
    color: "#888",
  },
  emptySubtext: {
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
  },
};