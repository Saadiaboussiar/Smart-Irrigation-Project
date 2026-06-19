import { useState, useEffect, useRef, useCallback } from "react";
import { Zone, Notification } from "../types/notification";

const API_BASE_URL = "http://localhost:8000";
const POLL_INTERVAL = 10000; // 10 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/zones`);
      if (!res.ok) return;
      const data: Record<string, Zone> = await res.json();

      const newNotifs: Notification[] = [];

      Object.values(data).forEach((zone) => {
        const pid = zone.result.prediction_id;
        if (
          zone.result.besoin_eau === 1 &&
          pid &&
          !seenIds.current.has(pid)
        ) {
          seenIds.current.add(pid);
          newNotifs.push({
            id: pid,
            zone_id: zone.zone_id,
            crop_type: zone.crop_type,
            water_liters: zone.result.irrigation?.quantite_eau_litres ?? 0,
            probabilite: zone.result.probabilite,
            timestamp: new Date().toISOString(),
            read: false,
            feedbackGiven: false,
          });
        }
      });

      if (newNotifs.length > 0) {
        setNotifications((prev) => [...newNotifs, ...prev]);
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, []);

  useEffect(() => {
    fetchZones();
    const interval = setInterval(fetchZones, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchZones]);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const submitFeedback = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction_id: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, feedbackGiven: true } : n))
      );
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, markRead, submitFeedback };
}