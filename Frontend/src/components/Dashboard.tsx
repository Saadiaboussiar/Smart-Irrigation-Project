// front/src/Dashboard.tsx
import { useState, useEffect } from "react";
import { 
  Droplets, Thermometer, Leaf, TrendingUp, Sprout, Waves, 
  TriangleAlert, Check, CloudRain, Wind, BarChart3, 
  Calendar, Zap, Shield, Activity,
  AlertCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Area,
  Legend
} from "recharts";

const API_BASE_URL = "http://localhost:8000";

interface ZoneData {
  zone_id: string;
  crop_type: string;
  features: {
    Soil_Moisture: number;
    Crop_Growth_Stage: number;
    Wind_Speed_kmh: number;
    Rainfall_mm: number;
    Temperature_C: number;
  };
  result: {
    besoin_eau: number;
    label: string;
    probabilite: number;
  };
}

interface DashboardStats {
  totalZones: number;
  totalCrops: number;
  avgMoisture: number;
  avgTemp: number;
  avgWindSpeed: number;
  totalRainfall: number;
  waterNeeded: number;
  noWaterNeeded: number;
  minMoisture: number;
  maxMoisture: number;
  avgConfidence: number;
  crops: {[key: string]: ZoneData[]};
  moistureTrend: {day: string, value: number}[];
  cropHealth: {name: string, health: number}[];
}

const PIE_COLORS = ['#4caf50', '#e53935'];
const CHART_COLORS = ['#2e7d32', '#1565c0', '#e65100', '#6a1b9a', '#006064'];

export default function Dashboard() {
  const [form, setForm] = useState({
    soilMoisture:    "",
    temperature:     "",
    windSpeed:       "",
    rainfall:        "",
    cropGrowthStage: "3",
    solChaudSec:     "0",
    mulchingUsed:    "0",
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalZones: 0,
    totalCrops: 0,
    avgMoisture: 0,
    avgTemp: 0,
    avgWindSpeed: 0,
    totalRainfall: 0,
    waterNeeded: 0,
    noWaterNeeded: 0,
    minMoisture: 0,
    maxMoisture: 0,
    avgConfidence: 0,
    crops: {},
    moistureTrend: [],
    cropHealth: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch real data from /zones endpoint
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/zones`);
        if (!response.ok) throw new Error("Failed to fetch zones");
        
        const data = await response.json();
        const zones: ZoneData[] = Object.values(data);
        
        // Group by crop type
        const crops: {[key: string]: ZoneData[]} = {};
        zones.forEach(zone => {
          const cropType = zone.crop_type || "Unknown";
          if (!crops[cropType]) crops[cropType] = [];
          crops[cropType].push(zone);
        });

        // Calculate statistics
        const totalZones = zones.length;
        const totalCrops = Object.keys(crops).length;
        const soilMoistures = zones.map(z => z.features.Soil_Moisture);
        const temperatures = zones.map(z => z.features.Temperature_C);
        const windSpeeds = zones.map(z => z.features.Wind_Speed_kmh);
        const rainfalls = zones.map(z => z.features.Rainfall_mm);
        const confidences = zones.map(z => z.result.probabilite);
        const waterNeeded = zones.filter(z => z.result.besoin_eau === 1).length;
        
        // Calculate crop health (based on moisture levels)
        const cropHealth = Object.entries(crops).map(([name, cropZones]) => {
          const avgMoisture = cropZones.reduce((sum, z) => sum + z.features.Soil_Moisture, 0) / cropZones.length;
          // Health score: 0-100 based on moisture (ideal range 50-80)
          let health = 100;
          if (avgMoisture < 30) health = 30;
          else if (avgMoisture < 40) health = 50;
          else if (avgMoisture < 50) health = 70;
          else if (avgMoisture < 70) health = 90;
          else if (avgMoisture < 80) health = 80;
          else if (avgMoisture < 90) health = 60;
          else health = 40;
          return { name, health };
        });

        // Create moisture trend
        const moistureTrend = zones.map((zone, index) => ({
          day: zone.zone_id.split('_')[0] || `Zone ${index + 1}`,
          value: Math.round(zone.features.Soil_Moisture)
        })).slice(0, 7);

        setStats({
          totalZones,
          totalCrops,
          avgMoisture: soilMoistures.reduce((a, b) => a + b, 0) / totalZones,
          avgTemp: temperatures.reduce((a, b) => a + b, 0) / totalZones,
          avgWindSpeed: windSpeeds.reduce((a, b) => a + b, 0) / totalZones,
          totalRainfall: rainfalls.reduce((a, b) => a + b, 0),
          waterNeeded,
          noWaterNeeded: totalZones - waterNeeded,
          minMoisture: Math.min(...soilMoistures),
          maxMoisture: Math.max(...soilMoistures),
          avgConfidence: confidences.reduce((a, b) => a + b, 0) / totalZones,
          crops,
          moistureTrend,
          cropHealth
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const predict = async () => {
    const { soilMoisture, temperature, windSpeed, rainfall } = form;
    if (!soilMoisture || !temperature || !windSpeed || !rainfall) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setPrediction(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Soil_Moisture: parseFloat(soilMoisture),
          Temperature_C: parseFloat(temperature),
          Wind_Speed_kmh: parseFloat(windSpeed),
          Rainfall_mm: parseFloat(rainfall),
          Crop_Growth_Stage: parseInt(form.cropGrowthStage),
          sol_chaud_sec: parseInt(form.solChaudSec),
          Mulching_Used: parseInt(form.mulchingUsed)
        })
      });
      
      if (!response.ok) throw new Error("Prediction failed");
      const result = await response.json();
      setPrediction(result);
    } catch (err) {
      setError("Could not connect to the prediction API. Make sure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  if (dashboardLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', minHeight: '100vh', background: '#f8faf8' }}>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = [
    { name: "No Water Needed", value: stats.noWaterNeeded },
    { name: "Water Needed", value: stats.waterNeeded },
  ];

  // Prepare radar data
  const radarData = Object.entries(stats.crops).map(([name, zones]) => {
    const avgMoisture = zones.reduce((sum, z) => sum + z.features.Soil_Moisture, 0) / zones.length;
    const avgTemp = zones.reduce((sum, z) => sum + z.features.Temperature_C, 0) / zones.length;
    const avgWind = zones.reduce((sum, z) => sum + z.features.Wind_Speed_kmh, 0) / zones.length;
    return {
      crop: name,
      "Soil Moisture": Math.round(avgMoisture),
      "Temperature": Math.round(avgTemp),
      "Wind Speed": Math.round(avgWind),
    };
  });

  return (
    <div style={{ padding: '20px 20px 100px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: '#f8faf8' }}>
      {/* Header */}
      {/* Header with Simple Green Background */}
<div style={{
  background: '#2e7d32',
  borderRadius: '16px',
  padding: '30px 24px',
  marginBottom: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
}}>
  <h1 style={{ 
    fontSize: '28px', 
    fontWeight: 700, 
    color: 'white', 
    margin: 0 
  }}>
    🌿 Smart Irrigation Dashboard
  </h1>
  <p style={{ 
    color: 'rgba(255,255,255,0.9)', 
    marginTop: '4px',
    fontSize: '15px'
  }}>
    Real-time overview of all crops and zones
  </p>
</div>

      {/* Main Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <StatCard 
          icon={<Droplets size={20} color="#1565c0" />}
          label="Total Zones"
          value={stats.totalZones}
          color="#e3f2fd"
        />
        <StatCard 
          icon={<Leaf size={20} color="#2e7d32" />}
          label="Total Crops"
          value={stats.totalCrops}
          color="#e8f5e9"
        />
        <StatCard 
          icon={<AlertCircle size={20} color={stats.waterNeeded > 0 ? "#e53935" : "#4caf50"} />}
          label="Need Water"
          value={stats.waterNeeded}
          color={stats.waterNeeded > 0 ? "#ffebee" : "#e8f5e9"}
        />
        <StatCard 
          icon={<Shield size={20} color="#2e7d32" />}
          label="Avg Confidence"
          value={`${(stats.avgConfidence * 100).toFixed(0)}%`}
          color="#e8f5e9"
        />
      </div>

      {/* Secondary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <StatCard 
          icon={<Thermometer size={18} color="#e65100" />}
          label="Avg Temperature"
          value={`${stats.avgTemp.toFixed(1)}°C`}
          color="#fff3e0"
        />
        <StatCard 
          icon={<Wind size={18} color="#6a1b9a" />}
          label="Avg Wind Speed"
          value={`${stats.avgWindSpeed.toFixed(1)} km/h`}
          color="#f3e5f5"
        />
        <StatCard 
          icon={<CloudRain size={18} color="#006064" />}
          label="Total Rainfall"
          value={`${stats.totalRainfall.toFixed(1)} mm`}
          color="#e0f7fa"
        />
        <StatCard 
          icon={<Activity size={18} color="#2e7d32" />}
          label="Moisture Range"
          value={`${stats.minMoisture.toFixed(0)}% - ${stats.maxMoisture.toFixed(0)}%`}
          color="#e8f5e9"
        />
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Pie Chart */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="#2e7d32" />
            <h2 style={{ margin: 0, fontSize: '16px' }}>Water Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Crop Comparison */}
        {radarData.length > 1 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={18} color="#2e7d32" />
              <h2 style={{ margin: 0, fontSize: '16px' }}>Crop Comparison</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e8f5e9" />
                <PolarAngleAxis dataKey="crop" tick={{ fontSize: 10, fill: '#888' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#888' }} />
                <Radar name="Soil Moisture" dataKey="Soil Moisture" stroke="#1565c0" fill="#1565c0" fillOpacity={0.3} />
                <Radar name="Temperature" dataKey="Temperature" stroke="#e65100" fill="#e65100" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Crops Overview */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sprout size={18} color="#2e7d32" />
          <h2 style={{ margin: 0, fontSize: '16px' }}>Crops Overview</h2>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>
            {stats.totalCrops} crops • {stats.totalZones} zones
          </span>
        </div>
        
        <div style={{ display: 'grid', gap: '10px' }}>
          {Object.entries(stats.crops).map(([cropName, zones]) => {
            const waterNeeded = zones.filter(z => z.result.besoin_eau === 1).length;
            const avgMoisture = zones.reduce((sum, z) => sum + z.features.Soil_Moisture, 0) / zones.length;
            const health = stats.cropHealth.find(h => h.name === cropName)?.health || 50;
            
            return (
              <div key={cropName} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                background: '#f8faf8',
                borderRadius: '10px',
                border: '1px solid #e8f5e9',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>
                    {cropName === 'Rice' ? '🌾' : 
                     cropName === 'Maize' ? '🌽' : 
                     cropName === 'Wheat' ? '🌾' : 
                     cropName === 'Potato' ? '🥔' : 
                     cropName === 'Sugarcane' ? '🌿' : 
                     cropName === 'Cotton' ? '🌾' : '🌱'}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>
                      {cropName}
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '12px', color: '#888' }}>
                      {zones.length} zones
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '12px', color: '#888' }}>
                      Moisture: {avgMoisture.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Health Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      background: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${health}%`,
                        height: '100%',
                        background: health > 70 ? '#4caf50' : health > 40 ? '#ff9800' : '#e53935',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontSize: '10px', color: '#888' }}>{health}%</span>
                  </div>
                  
                  {waterNeeded > 0 ? (
                    <span style={{
                      background: '#ffebee',
                      color: '#e53935',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      💧 {waterNeeded} need water
                    </span>
                  ) : (
                    <span style={{
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      ✅ All healthy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Prediction Form */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Waves size={18} color="#2e7d32" />
          <h2 style={{ margin: 0, fontSize: '18px' }}>Water Need Prediction</h2>
        </div>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
          Enter your plant's current conditions to get an AI-powered watering recommendation.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Soil Moisture (%)
            </label>
            <input 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              type="number" 
              name="soilMoisture" 
              min="0" 
              max="100" 
              placeholder="e.g. 35" 
              value={form.soilMoisture} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Temperature (°C)
            </label>
            <input 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              type="number" 
              name="temperature" 
              placeholder="e.g. 28" 
              value={form.temperature} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Wind Speed (km/h)
            </label>
            <input 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              type="number" 
              name="windSpeed" 
              placeholder="e.g. 12" 
              value={form.windSpeed} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Rainfall (mm)
            </label>
            <input 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              type="number" 
              name="rainfall" 
              placeholder="e.g. 5" 
              value={form.rainfall} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Crop Growth Stage
            </label>
            <select 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                background: 'white'
              }}
              name="cropGrowthStage" 
              value={form.cropGrowthStage} 
              onChange={handleChange}
            >
              <option value="0">Flowering</option>
              <option value="1">Harvest</option>
              <option value="2">Sowing</option>
              <option value="3">Vegetative</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Hot & Dry Soil
            </label>
            <select 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                background: 'white'
              }}
              name="solChaudSec" 
              value={form.solChaudSec} 
              onChange={handleChange}
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '4px' }}>
              Mulching Used
            </label>
            <select 
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                background: 'white'
              }}
              name="mulchingUsed" 
              value={form.mulchingUsed} 
              onChange={handleChange}
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </div>

        {error && <p style={{ color: "#c62828", fontSize: 13, marginBottom: 8 }}>⚠️ {error}</p>}

        <button 
          onClick={predict} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = '#1b5e20';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = '#2e7d32';
          }}
        >
          <Waves size={18} />
          {loading ? "Predicting..." : "Predict Water Need"}
        </button>

        {prediction && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: '12px',
            background: prediction.besoin_eau === 1 ? '#ffebee' : '#e8f5e9',
            border: `2px solid ${prediction.besoin_eau === 1 ? '#e53935' : '#4caf50'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {prediction.besoin_eau === 1 ? (
                <TriangleAlert size={20} color="#e53935" />
              ) : (
                <Check size={20} color="#4caf50" />
              )}
              <span style={{ fontWeight: 700, fontSize: '18px', color: prediction.besoin_eau === 1 ? '#e53935' : '#2e7d32' }}>
                {prediction.besoin_eau === 1 ? 'Watering Needed' : 'No Watering Needed'}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: '14px', margin: '4px 0' }}>
              {prediction.besoin_eau === 1 
                ? 'Your plant needs water right now.' 
                : 'Your plant is well hydrated! No irrigation required right now.'}
            </p>
            {prediction.irrigation && prediction.besoin_eau === 1 && (
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#e53935', margin: '8px 0' }}>
                {prediction.irrigation?.quantite_eau_litres ?? "—"} L
              </p>
            )}
            <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              Confidence: {Math.round(prediction.probabilite * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: any) {
  return (
    <div style={{
      background: color,
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
      border: '1px solid rgba(0,0,0,0.05)'
    }}>
      <div style={{ marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
    </div>
  );
}