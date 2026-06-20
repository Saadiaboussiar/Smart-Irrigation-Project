import { Bell } from "lucide-react";

interface Props {
  unreadCount: number;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, onClick }: Props) {
  return (
    <button onClick={onClick} style={styles.btn}>
      <Bell size={22} color="#fff" />
      {unreadCount > 0 && (
        <span style={styles.badge}>{unreadCount}</span>
      )}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
  position: "relative",
  background: "#4caf50",        // ← green circle background
  border: "none",
  borderRadius: "50%",
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(76,175,80,0.4)",  // optional: subtle green glow
},
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    background: "#e53935",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    width: 16,
    height: 16,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};