import { useState,useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Droplets, Thermometer, Leaf, TrendingUp, Home, Map, Camera,
  Bell, Settings, TriangleAlert, Info, Check, ChevronRight,
  Plus, Wifi, BellRing, Clock, Sprout, ScanLine, Waves,
} from "lucide-react";
import { useNotifications } from "./hooks/useNotifications";
import NotificationBell from "./components/NotificationBell";
import NotificationDrawer from "./components/NotificationDrawer";
import PlantsPage from "./pages/PlantsPage";
import PlantDetailPage from "./pages/PlantDetailPage";
import Dashboard from "./components/Dashboard";

// ─── FASTAPI CONFIG ───────────────────────────────────────────
const API_BASE_URL = "http://localhost:8000";

async function predictWaterNeed(formData) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Soil_Moisture:     parseFloat(formData.soilMoisture),
      Crop_Growth_Stage: parseFloat(formData.cropGrowthStage),
      sol_chaud_sec:     parseFloat(formData.solChaudSec),
      Mulching_Used:     parseFloat(formData.mulchingUsed),
      Wind_Speed_kmh:    parseFloat(formData.windSpeed),
      Rainfall_mm:       parseFloat(formData.rainfall),
      Temperature_C:     parseFloat(formData.temperature),
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}

async function scanPlantImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);
  const response = await fetch(`${API_BASE_URL}/predict-image`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}

const moistureData = [
  { day: "Apr 8",  value: 72 },
  { day: "Apr 9",  value: 68 },
  { day: "Apr 10", value: 63 },
  { day: "Apr 11", value: 58 },
  { day: "Apr 12", value: 52 },
  { day: "Apr 13", value: 60 },
  { day: "Apr 14", value: 67 },
];

// ─── SHARED CSS ───────────────────────────────────────────────
// Extracted so it's available in EVERY render path (fixes the "plain HTML" bug
// caused by the previous `<style>{/* same CSS string as before */}</style>` no-op)
const APP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f0f4f0; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
  .app-shell { width: 100%; max-width: 420px; min-height: 100vh; background: #f6faf6; display: flex; flex-direction: column; position: relative; box-shadow: 0 0 40px rgba(0,0,0,0.1); }
  .screen { flex: 1; display: flex; flex-direction: column; padding-bottom: 80px; }
  .header { background: linear-gradient(135deg, #1b5e20, #2e7d32); padding: 24px 20px 20px; display: flex; flex-direction: column; gap: 2px; }
  .header-title { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .header-sub { color: rgba(255,255,255,0.75); font-size: 13px; }
  .content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .card { background: #fff; border-radius: 14px; padding: 14px; border: 1px solid #e8f5e9; }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .card-label { font-size: 12px; color: #666; font-weight: 500; }
  .card-value { font-size: 26px; font-weight: 700; color: #1a1a1a; }
  .card-blue { background: #e3f2fd; border-color: #bbdefb; }
  .card-orange { background: #fff3e0; border-color: #ffe0b2; }
  .card-green { background: #e8f5e9; border-color: #c8e6c9; }
  .icon-blue { color: #1565c0; }
  .icon-orange { color: #e65100; }
  .icon-green { color: #2e7d32; }
  .section-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e8f5e9; }
  .section-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
  .section-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .section-header { display: flex; justify-content: space-between; align-items: center; }
  .section-count { font-size: 13px; color: #888; }
  .predict-card { border-left: 3px solid #2e7d32; }
  .predict-desc { font-size: 12px; color: #666; margin-bottom: 14px; line-height: 1.5; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-label { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.4px; }
  .form-input { border: 1.5px solid #ddd; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; background: #fafafa; color: #1a1a1a; outline: none; transition: border-color 0.2s; width: 100%; }
  .form-input:focus { border-color: #2e7d32; background: #fff; }
  .predict-btn { width: 100%; background: #2e7d32; color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'DM Sans', sans-serif; transition: background 0.2s, transform 0.1s; }
  .predict-btn:hover { background: #1b5e20; }
  .predict-btn:active { transform: scale(0.98); }
  .btn-scanning { background: #888; cursor: not-allowed; }
  .prediction-result { border-radius: 12px; padding: 14px; margin-top: 12px; }
  .result-ok { background: #e8f5e9; border: 1px solid #c8e6c9; }
  .result-warning { background: #fff3e0; border: 1px solid #ffe0b2; }
  .result-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .result-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .result-icon-ok { color: #2e7d32; }
  .result-icon-warn { color: #e65100; }
  .result-text { font-size: 13px; color: #444; line-height: 1.5; }
  .result-amount { font-size: 32px; font-weight: 700; color: #e65100; font-family: 'DM Mono', monospace; margin: 4px 0; }
  .result-prob { font-size: 12px; color: #888; margin-top: 6px; }
  .plant-card { background: #fff; border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; border: 1px solid #e8f5e9; }
  .plant-img { width: 52px; height: 52px; border-radius: 10px; background: linear-gradient(135deg, #388e3c, #81c784); flex-shrink: 0; }
  .plant-info { flex: 1; }
  .plant-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .plant-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
  .stat-pill { border: 1.5px solid; border-radius: 12px; padding: 10px; text-align: center; }
  .stat-num { font-size: 22px; font-weight: 700; }
  .stat-lbl { font-size: 11px; font-weight: 500; margin-top: 2px; }
  .garden-grid { background: #e8f5e9; border-radius: 12px; position: relative; height: 220px; overflow: hidden; border: 1px solid #c8e6c9; }
  .zone-label { position: absolute; top: 8px; font-size: 11px; font-weight: 600; color: #555; }
  .plant-node { position: absolute; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.2s; }
  .plant-node:hover { transform: translate(-50%, -50%) scale(1.15); }
  .viewfinder { background: linear-gradient(135deg, #1b5e20, #388e3c); border-radius: 16px; height: 220px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .vf-center { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .vf-text { color: rgba(255,255,255,0.85); font-size: 13px; }
  .vf-corner { position: absolute; width: 24px; height: 24px; border-color: #fff; border-style: solid; border-width: 0; }
  .vf-tl { top: 12px; left: 12px; border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 4px; }
  .vf-tr { top: 12px; right: 12px; border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 4px; }
  .vf-bl { bottom: 12px; left: 12px; border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 4px; }
  .vf-br { bottom: 12px; right: 12px; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 4px; }
  .scan-line-anim { position: absolute; width: 80%; height: 2px; background: rgba(255,255,255,0.8); animation: scanMove 1.2s ease-in-out infinite alternate; box-shadow: 0 0 10px rgba(255,255,255,0.6); }
  @keyframes scanMove { from { top: 20%; } to { top: 80%; } }
  .tips-card { background: #e8f0fe; border-radius: 14px; padding: 14px; border: 1px solid #c5cae9; }
  .tips-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 10px; }
  .tip-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
  .tip-text { font-size: 13px; color: #444; line-height: 1.4; }
  .new-badge { background: #2e7d32; color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .mark-read-btn { background: #fff; border: 1.5px solid #ddd; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'DM Sans', sans-serif; color: #444; transition: background 0.2s; }
  .mark-read-btn:hover { background: #f5f5f5; }
  .alert-card { border-left: 4px solid; border-radius: 12px; padding: 12px 14px; }
  .alert-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .alert-plant { font-size: 14px; font-weight: 600; color: #1a1a1a; flex: 1; }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #2e7d32; flex-shrink: 0; }
  .alert-msg { font-size: 13px; color: #444; margin-bottom: 4px; line-height: 1.4; }
  .alert-time { font-size: 11px; color: #999; }
  .suggestion-card { background: #e8f5e9; border-radius: 14px; padding: 14px; display: flex; gap: 12px; border: 1px solid #c8e6c9; }
  .suggest-title { font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .suggest-text { font-size: 12px; color: #555; line-height: 1.5; }
  .action-card { background: #fff; border: 1.5px solid #e8f5e9; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #1a1a1a; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
  .action-card:hover { background: #f1f8e9; }
  .settings-section { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e8f5e9; display: flex; flex-direction: column; gap: 14px; }
  .settings-section-header { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
  .settings-section-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .settings-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .settings-label { font-size: 13px; font-weight: 500; color: #1a1a1a; }
  .settings-desc { font-size: 11px; color: #888; margin-top: 2px; line-height: 1.4; }
  .settings-input-row { display: flex; flex-direction: column; gap: 6px; }
  .input-unit-wrap { display: flex; align-items: center; gap: 8px; }
  .unit-label { font-size: 13px; color: #888; font-weight: 500; }
  .lang-select { border: 1.5px solid #ddd; border-radius: 8px; padding: 6px 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; background: #fafafa; color: #1a1a1a; outline: none; cursor: pointer; }
  .lang-select:focus { border-color: #2e7d32; }
  .toggle { width: 44px; height: 24px; border-radius: 20px; background: #ccc; position: relative; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
  .toggle-on { background: #2e7d32; }
  .toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
  .toggle-on .toggle-knob { left: 23px; }
  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 420px; background: #fff; border-top: 1px solid #e8f5e9; display: flex; padding: 8px 0 12px; box-shadow: 0 -4px 20px rgba(0,0,0,0.06); z-index: 100; }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 0; border: none; background: none; font-family: 'DM Sans', sans-serif; transition: transform 0.15s; }
  .nav-item:active { transform: scale(0.9); }
  .nav-label { font-size: 10px; font-weight: 500; color: #aaa; }
  .nav-item.active .nav-label { color: #2e7d32; }
  .nav-icon { color: #aaa; }
  .nav-item.active .nav-icon { color: #2e7d32; }
`;



// ─── GARDEN MAP ───────────────────────────────────────────────
// ─── GARDEN MAP ───────────────────────────────────────────────
function Garden() {
  const [zonesData, setZonesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('http://localhost:8000/zones');
        const data = await response.json();
        
        // Convert object to array and add status based on besoin_eau
        const zonesArray = Object.values(data).map((zone, index) => ({
          id: index + 1,
          x: 20 + Math.random() * 60, // Random position for visual layout
          y: 15 + Math.random() * 70,
          zone_id: zone.zone_id,
          crop_type: zone.crop_type,
          status: zone.result.besoin_eau === 1 ? 'needs-water' : 'healthy',
          label: zone.result.label,
          probabilite: zone.result.probabilite,
          features: zone.features
        }));
        
        setZonesData(zonesArray);
      } catch (error) {
        console.error('Error fetching zones:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchZones();
  }, []);

  const statusColor = { 
    healthy: "#2e7d32", 
    "needs-water": "#e65100", 
    critical: "#c62828" 
  };
  
  const statusBg = { 
    healthy: "#e8f5e9", 
    "needs-water": "#fff3e0", 
    critical: "#ffebee" 
  };
  
  const StatusIcon = ({ s }) => s === "critical"
    ? <TriangleAlert size={14} color="#fff" />
    : s === "needs-water" ? <Droplets size={14} color="#fff" />
    : <Leaf size={14} color="#fff" />;

  // Calculate stats
  const healthyCount = zonesData.filter(z => z.status === 'healthy').length;
  const needsWaterCount = zonesData.filter(z => z.status === 'needs-water').length;
  const criticalCount = zonesData.filter(z => z.status === 'critical').length;

  if (loading) {
    return (
      <div style={{ 
        width: '150%',
        padding: '20px 120px 10px 20px', 
        maxWidth: '420px',
        margin: '0 auto',
        minHeight: '120vh',
        background: '#f8faf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading garden data...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '150%',
      padding: '20px 120px 10px 20px', 
      maxWidth: '420px',
      margin: '0 auto',
      minHeight: '120vh',
      background: '#f8faf8'
    }}>
      <div style={{
        width: '135%',
        background: '#2e7d32',
        borderRadius: '16px',
        padding: '30px 30px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 className="header-title">🌿 Garden Map</h1>
        <p className="header-sub">Visual overview of your zones</p>
      </div>
      
      <div className="content" style={{ 
        width:"110%",
        padding: '20px 10px 10px 20px', 
        margin: '10px 0px 50px 34px',
      }}>
        {/* Stats Cards */}
        <div className="grid3">
          {[
            { label: "Healthy", count: healthyCount, status: "healthy" },
            { label: "Needs Water", count: needsWaterCount, status: "needs-water" },
            { label: "Critical", count: criticalCount, status: "critical" },
          ].map((s) => (
            <div key={s.label} className="stat-pill" style={{ 
              borderColor: statusColor[s.status], 
              background: statusBg[s.status],
              padding: '12px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p className="stat-num" style={{ color: statusColor[s.status], fontSize: '24px', fontWeight: 700, margin: 0 }}>
                {s.count}
              </p>
              <p className="stat-lbl" style={{ color: statusColor[s.status], fontSize: '12px', margin: 0 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Garden Map */}
        <div className="section-card">
          <h2 className="section-title" style={{ marginBottom: 4 }}>Garden Layout</h2>
          <p className="predict-desc" style={{ marginBottom: 12 }}>
            {zonesData.length} zones • {needsWaterCount} need water
          </p>
          <div className="garden-grid" style={{
            position: 'relative',
            width: '100%',
            height: '400px',
            background: '#f0f7f0',
            borderRadius: '16px',
            border: '2px solid #c8e6c9',
            overflow: 'hidden'
          }}>
            {/* Zone Labels */}
            <span className="zone-label" style={{ 
              position: 'absolute',
              left: 8, 
              top: 8,
              fontSize: '12px',
              color: '#888',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.8)',
              padding: '4px 12px',
              borderRadius: '8px'
            }}>
              🌱 Zone A
            </span>
            <span className="zone-label" style={{ 
              position: 'absolute',
              right: 8, 
              top: 8,
              fontSize: '12px',
              color: '#888',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.8)',
              padding: '4px 12px',
              borderRadius: '8px'
            }}>
              🌿 Zone B
            </span>

            {/* Plants */}
            {zonesData.map((p) => (
              <div
                key={p.id}
                className="plant-node"
                style={{ 
                  left: `${p.x}%`, 
                  top: `${p.y}%`, 
                  background: statusColor[p.status],
                  position: 'absolute',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transform: 'translate(-50%, -50%)',
                  transition: 'all 0.3s ease',
                  zIndex: 1
                }}
                title={`${p.zone_id} - ${p.label}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                }}
                onClick={() => {
                  alert(`${p.zone_id}\nCrop: ${p.crop_type}\nStatus: ${p.label}\nSoil Moisture: ${p.features.Soil_Moisture.toFixed(1)}%\nTemperature: ${p.features.Temperature_C.toFixed(1)}°C`);
                }}
              >
                <StatusIcon s={p.status} />
              </div>
            ))}

            {/* Legend */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '16px',
              background: 'rgba(255,255,255,0.9)',
              padding: '8px 16px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: '11px',
              zIndex: 2
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor.healthy }} />
                Healthy
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor['needs-water'] }} />
                Needs Water
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor.critical }} />
                Critical
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  

// ─── SCAN ─────────────────────────────────────────────────────
function Scan() {
  const [scanning,     setScanning]     = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const startScan = async () => {
    if (!selectedFile) { setError("Please select a plant image first."); return; }
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanPlantImage(selectedFile);
      setResult(data);
    } catch (err) {
      setError("Could not connect to the scan API. Make sure FastAPI is running.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{ 
        width: '150%',
      padding: '20px 120px 10px 20px', 
      maxWidth: '420px',  // Same as Dashboard
      margin: '0 auto',
      minHeight: '120vh',
      background: '#f8faf8'
    }}>
      <div style={{
        width: '135%',
        background: '#2e7d32',  // Same as Dashboard
        borderRadius: '16px',
        padding: '30px 30px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 className="header-title">AI Plant Scanner</h1>
        <p className="header-sub">Analyze plant health with AI</p>
      </div>
      
      {/* ONLY THIS WRAPPER ADDED - centers the inner content */}
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div className="content" style={{ 
            width:"110%",
      padding: '20px 10px 10px 20px', 
      margin: '10px 0px 50px 34px',
    }}>
          <label className="viewfinder" style={{ cursor: "pointer" }}>
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileChange} />
            <div className="vf-corner vf-tl" /><div className="vf-corner vf-tr" />
            <div className="vf-corner vf-bl" /><div className="vf-corner vf-br" />
            {preview ? (
              <img src={preview} alt="Plant preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
            ) : scanning ? (
              <div className="scan-line-anim" />
            ) : (
              <div className="vf-center" >
                <Camera size={40} color="rgba(255,255,255,0.9)" />
                <p className="vf-text">Tap to select or capture plant image</p>
              </div>
            )}
          </label>

          {error && <p style={{ color: "#c62828", fontSize: 13 }}>⚠️ {error}</p>}

          <button className={`predict-btn ${scanning ? "btn-scanning" : ""}`} onClick={startScan} disabled={scanning} >
            <ScanLine size={16} />
            {scanning ? "Analyzing..." : "Start AI Scan"}
          </button>

          {result && (
            <div className={`prediction-result ${result.besoin_eau === 1 ? "result-warning" : "result-ok"}`}>
              <div className="result-header">
                {result.besoin_eau === 1
                  ? <TriangleAlert size={18} className="result-icon-warn" />
                  : <Check size={18} className="result-icon-ok" />}
                <span className="result-title">
                  {result.besoin_eau === 1 ? "Watering Needed" : "No Watering Needed"}
                </span>
              </div>
              {result.besoin_eau === 1 ? (
                <>
                  <p className="result-text">Based on the plant image analysis:</p>
                  <p className="result-amount">
                    {result.irrigation?.water_liters
                      ?? result.irrigation?.quantity_liters
                      ?? result.irrigation?.quantite_litres
                      ?? "—"} L
                  </p>
                  <p className="result-text">of water recommended.</p>
                </>
              ) : (
                <p className="result-text">Your plant looks well hydrated! No irrigation needed right now.</p>
              )}
            </div>
          )}

          <div className="tips-card">
            <h3 >Scanning Tips</h3>
            {[
              "Ensure good lighting conditions",
              "Position plant leaves in frame",
              "Keep camera steady during scan",
              "Capture entire plant if possible",
            ].map((t) => (
              <div key={t} className="tip-row">
                <Check size={13} className="icon-green" style={{ flexShrink: 0 }} />
                <span className="tip-text">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ALERTS ───────────────────────────────────────────────────
function Alerts() {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "critical", plant: "Strawberry",   msg: "Critical! Water immediately – soil moisture at 28%",   time: "Apr 14, 08:00 AM", read: false },
    { id: 2, type: "warning",  plant: "Basil",        msg: "Needs watering soon – soil moisture at 42%",           time: "Apr 14, 07:30 AM", read: false },
    { id: 3, type: "info",     plant: "Tomato Plant", msg: "AI detected optimal growth conditions",                time: "Apr 14, 06:00 AM", read: true  },
    { id: 4, type: "info",     plant: "Cucumber",     msg: "Scheduled watering completed successfully",            time: "Apr 13, 06:05 PM", read: true  },
  ]);

  const markAll = () => setAlerts(alerts.map((a) => ({ ...a, read: true })));
  const unread  = alerts.filter((a) => !a.read).length;

  const typeStyle = {
    critical: { border: "#c62828", bg: "#ffebee", icon: <TriangleAlert size={16} color="#c62828" /> },
    warning:  { border: "#e65100", bg: "#fff3e0", icon: <TriangleAlert size={16} color="#e65100" /> },
    info:     { border: "#ccc",    bg: "#fff",    icon: <Info size={16} color="#888" /> },
  };

  return (
    <div className="screen">
      <div className="header" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="header-title">Alerts</h1>
          <p className="header-sub">Plant notifications &amp; updates</p>
        </div>
        {unread > 0 && <span className="new-badge">{unread} new</span>}
      </div>
      <div className="content">
        <button className="mark-read-btn" onClick={markAll}>
          <Check size={14} /> Mark all as read
        </button>
        {alerts.map((a) => {
          const s = typeStyle[a.type];
          return (
            <div key={a.id} className="alert-card" style={{ borderLeftColor: s.border, background: s.bg }}>
              <div className="alert-top">
                {s.icon}
                <span className="alert-plant">{a.plant}</span>
                {!a.read && <span className="unread-dot" />}
              </div>
              <p className="alert-msg">{a.msg}</p>
              <p className="alert-time">{a.time}</p>
            </div>
          );
        })}
        <h2 className="section-title" style={{ marginTop: 20 }}>Smart Suggestions</h2>
        <div className="suggestion-card">
          <Clock size={18} className="icon-green" style={{ flexShrink: 0 }} />
          <div>
            <p className="suggest-title">Optimal Watering Time</p>
            <p className="suggest-text">Best time to water your plants is early morning (6–8 AM) for maximum absorption.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────
function SettingsPage() {
  const [autoIrrigation, setAutoIrrigation] = useState(true);
  const [pushNotifs,     setPushNotifs]     = useState(true);
  const [emailAlerts,    setEmailAlerts]    = useState(false);
  const [waterAmount,    setWaterAmount]    = useState("200");
  const [irrigationTime, setIrrigationTime] = useState("07:00");
  const [language,       setLanguage]       = useState("en");

  return (
    <div className="screen">
      <div className="header">
        <h1 className="header-title">Settings</h1>
        <p className="header-sub">Manage your smart irrigation system</p>
      </div>
      <div className="content">
        <div className="grid2" style={{ marginBottom: 20 }}>
          <button className="action-card"><Plus size={20} className="icon-green" /><span>Add Plant</span></button>
          <button className="action-card"><Wifi size={20} className="icon-green" /><span>Configure Sensor</span></button>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><span>🌐</span><h3 className="settings-section-title">Language</h3></div>
          <div className="settings-row">
            <div>
              <p className="settings-label">App Language</p>
              <p className="settings-desc">Choose your preferred language</p>
            </div>
            <select className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">🇬🇧 English</option>
              <option value="fr">🇫🇷 Français</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><Droplets size={16} className="icon-green" /><h3 className="settings-section-title">Irrigation Preferences</h3></div>
          <div className="settings-row">
            <div>
              <p className="settings-label">Auto Irrigation</p>
              <p className="settings-desc">Automatically water plants based on AI recommendations</p>
            </div>
            <div className={`toggle ${autoIrrigation ? "toggle-on" : ""}`} onClick={() => setAutoIrrigation(!autoIrrigation)}><div className="toggle-knob" /></div>
          </div>
          <div className="settings-input-row">
            <label className="settings-label">Default Water Amount</label>
            <div className="input-unit-wrap">
              <input className="form-input" type="number" value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} />
              <span className="unit-label">ml</span>
            </div>
          </div>
          <div className="settings-input-row">
            <label className="settings-label">Preferred Irrigation Time</label>
            <input className="form-input" type="time" value={irrigationTime} onChange={(e) => setIrrigationTime(e.target.value)} />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><BellRing size={16} className="icon-green" /><h3 className="settings-section-title">Notifications</h3></div>
          <div className="settings-row">
            <div><p className="settings-label">Push Notifications</p><p className="settings-desc">Receive alerts about your plants</p></div>
            <div className={`toggle ${pushNotifs ? "toggle-on" : ""}`} onClick={() => setPushNotifs(!pushNotifs)}><div className="toggle-knob" /></div>
          </div>
          <div className="settings-row">
            <div><p className="settings-label">Email Alerts</p><p className="settings-desc">Get daily summary via email</p></div>
            <div className={`toggle ${emailAlerts ? "toggle-on" : ""}`} onClick={() => setEmailAlerts(!emailAlerts)}><div className="toggle-knob" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAV CONFIG ───────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "garden",    label: "Garden",    Icon: Map },
  { id: "scan",      label: "Scan",      Icon: Camera },
  { id: "plants",    label: "Plants",    Icon: Leaf },
  { id: "settings",  label: "Settings",  Icon: Settings },
];

// ─── APP SHELL ────────────────────────────────────────────────



export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { notifications, unreadCount, markAllRead, markRead, submitFeedback } =
    useNotifications();

  const [selectedPlant, setSelectedPlant] = useState(null);

  const handleSelectPlant = (
    plantId,
    plantName,
    plantData
  ) => {
    setSelectedPlant({
      id: plantId,
      name: plantName,
      data: plantData,
    });
  };

  const handleOpenNotif = () => {
    setDrawerOpen(true);
    markAllRead();
  };

  // PlantDetailPage — full-screen override (no bottom nav)
  if (selectedPlant) {
    return (
      <>
        <style>{APP_CSS}</style>
        <div className="app-shell">
          <PlantDetailPage
            plantId={selectedPlant.id}
            plantName={selectedPlant.name}
            plantData={selectedPlant.data}
            onBack={() => setSelectedPlant(null)}
          />
        </div>
      </>
    );
  }

  // Map tabs to components
  const screens= {
    dashboard: <Dashboard />,
    garden: <Garden />,
    scan: <Scan />,
    alerts: <Alerts />,
    plants: <PlantsPage onSelectPlant={handleSelectPlant} />,
    settings: <SettingsPage />,
  };

  return (
    <>
      <style>{APP_CSS}</style>

      <div className="app-shell">
        {/* Notification Bell — floats over header */}
        <div
          style={{
            position: "fixed",
            top: 20,
            right: "calc(50% - 200px)",
            zIndex: 150,
          }}
        >
          <NotificationBell
            unreadCount={unreadCount}
            onClick={handleOpenNotif}
          />
        </div>

        {/* Render the active screen */}
        {screens[tab]}

        <NotificationDrawer
          open={drawerOpen}
          notifications={notifications}
          onClose={() => setDrawerOpen(false)}
          onMarkAllRead={markAllRead}
          onFeedback={submitFeedback}
        />

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={22} className="nav-icon" />
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}