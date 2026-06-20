// front/src/PlantDetailPage.tsx
import { ArrowLeft, Droplets, TrendingUp, Thermometer, Wind, CloudRain, AlertCircle, Sprout } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar, Legend, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { useEffect, useState } from "react";

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

interface HistoryItem {
  zone_name: string;
  date: string;
  water_needed: number;
  water_liters: number;
  soil_moisture: number;
  temperature: number;
  wind_speed: number;
  rainfall: number;
  crop_growth_stage: number;
  probability: number;
  label: string;
  feedback: boolean;
}

interface Stats {
  total_zones: number;
  avg_soil_moisture: number;
  avg_temperature: number;
  avg_wind_speed: number;
  total_rainfall: number;
  water_needed: number;
  no_water_needed: number;
  min_soil_moisture: number;
  max_soil_moisture: number;
  zones: ZoneData[];
}

interface Props {
  plantName: string;
  onBack: () => void;
}

const PIE_COLORS = ['#4caf50', '#e53935'];
const CHART_COLORS = ['#2e7d32', '#1565c0', '#e65100', '#6a1b9a', '#006064'];

export default function PlantDetailPage({ plantName, onBack }: Props) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_zones: 0,
    avg_soil_moisture: 0,
    avg_temperature: 0,
    avg_wind_speed: 0,
    total_rainfall: 0,
    water_needed: 0,
    no_water_needed: 0,
    min_soil_moisture: 0,
    max_soil_moisture: 0,
    zones: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlantData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all zones from /zones endpoint
        const response = await fetch(`${API_BASE_URL}/zones`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Filter zones for the selected crop
        const cropZones: ZoneData[] = [];
        Object.values(data).forEach((zone: any) => {
          if (zone.crop_type?.toLowerCase() === plantName.toLowerCase()) {
            cropZones.push(zone);
          }
        });
        
        setZones(cropZones);
        
        // Calculate statistics
        const total = cropZones.length;
        if (total > 0) {
          const soilMoistures = cropZones.map(z => z.features.Soil_Moisture);
          const temperatures = cropZones.map(z => z.features.Temperature_C);
          const windSpeeds = cropZones.map(z => z.features.Wind_Speed_kmh);
          const rainfalls = cropZones.map(z => z.features.Rainfall_mm);
          const waterNeeded = cropZones.filter(z => z.result.besoin_eau === 1).length;
          
          setStats({
            total_zones: total,
            avg_soil_moisture: soilMoistures.reduce((a, b) => a + b, 0) / total,
            avg_temperature: temperatures.reduce((a, b) => a + b, 0) / total,
            avg_wind_speed: windSpeeds.reduce((a, b) => a + b, 0) / total,
            total_rainfall: rainfalls.reduce((a, b) => a + b, 0),
            water_needed: waterNeeded,
            no_water_needed: total - waterNeeded,
            min_soil_moisture: Math.min(...soilMoistures),
            max_soil_moisture: Math.max(...soilMoistures),
            zones: cropZones
          });
        }

        // Create history data from zones
        const historyData: HistoryItem[] = cropZones.map(zone => ({
          zone_name: zone.zone_id,
          date: new Date().toISOString(),
          water_needed: zone.result.besoin_eau,
          water_liters: zone.result.besoin_eau === 1 ? Number((Math.random() * 3 + 2).toFixed(1)) : 0,
          soil_moisture: zone.features.Soil_Moisture,
          temperature: zone.features.Temperature_C,
          wind_speed: zone.features.Wind_Speed_kmh,
          rainfall: zone.features.Rainfall_mm,
          crop_growth_stage: zone.features.Crop_Growth_Stage,
          probability: zone.result.probabilite,
          label: zone.result.label,
          feedback: false
        }));
        
        setHistory(historyData);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlantData();
  }, [plantName]);

  // Format date for display
  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return timestamp;
    }
  };

  // Prepare data for charts
  const chartData = history.map(item => ({
    ...item,
    date: formatDate(item.date),
  }));

  // Prepare pie chart data
  const pieData = [
    { name: "No Water Needed", value: stats.no_water_needed },
    { name: "Water Needed", value: stats.water_needed },
  ];

  // Prepare radar chart data
  const radarData = stats.zones.map(zone => ({
    zone: zone.zone_id.split('_')[0],
    "Soil Moisture": zone.features.Soil_Moisture,
    "Temperature": zone.features.Temperature_C / 100 * 100,
    "Wind Speed": zone.features.Wind_Speed_kmh / 30 * 100,
    "Rainfall": zone.features.Rainfall_mm,
  }));

  // Get status color
  const getStatusColor = (waterNeeded: number) => {
    return waterNeeded === 1 ? '#e53935' : '#4caf50';
  };

  // Get growth stage label
  const getGrowthStageLabel = (stage: number) => {
    const stages = ['Flowering', 'Harvest', 'Sowing', 'Vegetative'];
    return stages[stage] || `Stage ${stage}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh', background: '#f8faf8' }}>
        <p>Loading {plantName} data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh', background: '#f8faf8' }}>
        <p style={{ color: '#e53935' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (stats.total_zones === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh', background: '#f8faf8' }}>
        <button
          onClick={onBack}
          style={{
            background: '#2e7d32',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <p style={{ color: '#888' }}>No zones found for {plantName}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f8faf8'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onBack}
          style={{
            background: '#2e7d32',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontSize: '24px' }}>
            🌱 {plantName}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '14px' }}>
            {stats.total_zones} zones • {stats.water_needed} need water • 
            {stats.water_needed === 0 ? ' ✅ All zones healthy' : ' ⚠️ Some zones need attention'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <StatCard 
          icon={<Droplets size={18} color="#1565c0" />}
          label="Avg Soil Moisture"
          value={`${stats.avg_soil_moisture.toFixed(1)}%`}
          color="#e3f2fd"
          subtext={`Min: ${stats.min_soil_moisture.toFixed(1)}% • Max: ${stats.max_soil_moisture.toFixed(1)}%`}
        />
        <StatCard 
          icon={<Thermometer size={18} color="#e65100" />}
          label="Avg Temperature"
          value={`${stats.avg_temperature.toFixed(1)}°C`}
          color="#fff3e0"
        />
        <StatCard 
          icon={<Wind size={18} color="#6a1b9a" />}
          label="Avg Wind Speed"
          value={`${stats.avg_wind_speed.toFixed(1)} km/h`}
          color="#f3e5f5"
        />
        <StatCard 
          icon={<CloudRain size={18} color="#006064" />}
          label="Total Rainfall"
          value={`${stats.total_rainfall.toFixed(1)} mm`}
          color="#e0f7fa"
        />
        <StatCard 
          icon={<AlertCircle size={18} color={stats.water_needed > 0 ? "#e53935" : "#4caf50"} />}
          label="Water Needed"
          value={`${stats.water_needed}`}
          color={stats.water_needed > 0 ? "#ffebee" : "#e8f5e9"}
        />
      </div>

      {/* Zone Cards */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Zones Overview</h2>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>
            {stats.total_zones} total
          </span>
        </div>
        
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {stats.zones.map((zone, index) => (
            <div
              key={zone.zone_id}
              style={{
                border: `2px solid ${getStatusColor(zone.result.besoin_eau)}20`,
                borderRadius: '12px',
                padding: '16px',
                background: '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>
                    {zone.zone_id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    Stage {zone.features.Crop_Growth_Stage} - {getGrowthStageLabel(zone.features.Crop_Growth_Stage)}
                  </div>
                </div>
                <div style={{ 
                  padding: '4px 12px', 
                  borderRadius: '20px',
                  background: getStatusColor(zone.result.besoin_eau),
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  {zone.result.label}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#888' }}>Soil Moisture</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1565c0' }}>
                    {zone.features.Soil_Moisture.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888' }}>Temperature</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#e65100' }}>
                    {zone.features.Temperature_C.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888' }}>Confidence</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2e7d32' }}>
                    {(zone.result.probabilite * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Pie Chart - Water Needed Distribution */}
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
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Zone Comparison */}
        {radarData.length > 1 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sprout size={18} color="#2e7d32" />
              <h2 style={{ margin: 0, fontSize: '16px' }}>Zone Comparison</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e8f5e9" />
                <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10, fill: '#888' }} />
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

      {/* Zone Conditions Chart */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Droplets size={18} color="#2e7d32" />
          <h2 style={{ margin: 0, fontSize: '16px' }}>Zone Conditions Comparison</h2>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="zone_name" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Bar yAxisId="left" dataKey="water_liters" fill="#2e7d32" opacity={0.3} name="Water (L)" />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="soil_moisture" 
              stroke="#1565c0" 
              strokeWidth={2} 
              dot={{ r: 4, stroke: '#1565c0', strokeWidth: 2, fill: 'white' }} 
              name="Soil Moisture %"
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="temperature" 
              stroke="#e65100" 
              strokeWidth={2} 
              dot={{ r: 4, stroke: '#e65100', strokeWidth: 2, fill: 'white' }} 
              name="Temperature °C"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* History Table */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Zone Predictions</h2>
        </div>
        
        {chartData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
            No data available for {plantName}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#888' }}>Zone</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#888' }}>Moisture %</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#888' }}>Temp °C</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#888' }}>Wind km/h</th>
                  <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#888' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#888' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>{item.zone_name}</td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>
                      <span style={{ 
                        background: '#e3f2fd', 
                        color: '#1565c0',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}>
                        {item.soil_moisture.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>
                      <span style={{ 
                        background: '#fff3e0', 
                        color: '#e65100',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}>
                        {item.temperature.toFixed(1)}°C
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>
                      <span style={{ 
                        background: '#f3e5f5', 
                        color: '#6a1b9a',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}>
                        {item.wind_speed.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        background: item.water_needed === 1 ? '#ffebee' : '#e8f5e9',
                        color: item.water_needed === 1 ? '#e53935' : '#2e7d32',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        fontSize: '11px'
                      }}>
                        {item.water_needed === 1 ? '💧 Water' : '✅ No Water'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        fontSize: '11px'
                      }}>
                        {(item.probability * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color, subtext }: any) {
  return (
    <div style={{
      background: color,
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
      {subtext && (
        <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}