import { createFileRoute } from "@tanstack/react-router";
import { useState, createContext, useContext, useMemo } from "react";
import {
  LayoutDashboard, MapPin, Camera, Bell, Settings as SettingsIcon,
  Droplets, Thermometer, Sprout, TrendingUp, AlertTriangle, Info,
  Plus, Wifi, Leaf, Bell as BellIcon, Languages, CheckCircle2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import greenhouse from "../assets/greenhouse.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Irrigation — AI-Powered Plant Care" },
      { name: "description", content: "AI-powered plant care and irrigation management for your smart garden." },
    ],
  }),
  component: App,
});

/* ---------------- i18n ---------------- */
const translations = {
  en: {
    appTitle: "Smart Irrigation", appSubtitle: "AI-Powered Plant Care",
    dashboard: "Dashboard", garden: "Garden", scan: "Scan", alerts: "Alerts", settings: "Settings",
    avgHumidity: "Avg Humidity", avgTemp: "Avg Temp", healthyPlants: "Healthy Plants", needsCare: "Needs Care",
    moistureTrend: "Moisture Trend (7 Days)", yourPlants: "Your Plants", total: "total",
    good: "Good", greenhousePlant: "Greenhouse Plants",
    gardenMap: "Garden Map", gardenSubtitle: "Visual overview of your plants",
    healthy: "Healthy", needsWater: "Needs Water", critical: "Critical",
    gardenLayout: "Garden Layout", tapPlant: "Tap any plant for details", zoneA: "Zone A", zoneB: "Zone B",
    aiScanner: "AI Plant Scanner", scannerSubtitle: "Analyze plant health with AI",
    positionPlant: "Position your plant in the frame", startScan: "Start AI Scan",
    scanningTips: "Scanning Tips",
    tip1: "Ensure good lighting conditions", tip2: "Position plant leaves in frame",
    tip3: "Keep camera steady during scan", tip4: "Capture entire plant if possible",
    alertsTitle: "Alerts", alertsSubtitle: "Plant notifications & updates", newBadge: "new",
    markAllRead: "Mark all as read",
    criticalMsg: "Critical! Water immediately - soil moisture at 28%",
    warningMsg: "Needs watering soon - soil moisture at 42%",
    infoMsg1: "AI detected optimal growth conditions",
    infoMsg2: "Scheduled watering completed successfully",
    smartSuggestions: "Smart Suggestions", optimalWatering: "Optimal Watering Time",
    optimalWateringDesc: "Best time to water your plants is early morning (6-8 AM) for maximum absorption.",
    settingsTitle: "Settings", settingsSubtitle: "Manage your smart irrigation system",
    addPlant: "Add Plant", configureSensor: "Configure Sensor",
    irrigationPrefs: "Irrigation Preferences",
    autoIrrigation: "Auto Irrigation", autoIrrigationDesc: "Automatically water plants based on AI recommendations",
    defaultWater: "Default Water Amount", preferredTime: "Preferred Irrigation Time",
    notifications: "Notifications", pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Receive alerts about your plants",
    language: "Language", english: "English", french: "French",
  },
  fr: {
    appTitle: "Irrigation Intelligente", appSubtitle: "Soin des plantes par IA",
    dashboard: "Tableau", garden: "Jardin", scan: "Scanner", alerts: "Alertes", settings: "Paramètres",
    avgHumidity: "Humidité moy.", avgTemp: "Temp. moy.", healthyPlants: "Plantes saines", needsCare: "À surveiller",
    moistureTrend: "Tendance d'humidité (7 jours)", yourPlants: "Vos plantes", total: "au total",
    good: "Bon", greenhousePlant: "Plantes de serre",
    gardenMap: "Carte du jardin", gardenSubtitle: "Vue d'ensemble de vos plantes",
    healthy: "Saines", needsWater: "À arroser", critical: "Critique",
    gardenLayout: "Plan du jardin", tapPlant: "Touchez une plante pour les détails", zoneA: "Zone A", zoneB: "Zone B",
    aiScanner: "Scanner IA", scannerSubtitle: "Analysez la santé des plantes avec l'IA",
    positionPlant: "Positionnez votre plante dans le cadre", startScan: "Lancer le scan IA",
    scanningTips: "Conseils de scan",
    tip1: "Assurez un bon éclairage", tip2: "Placez les feuilles dans le cadre",
    tip3: "Gardez l'appareil stable", tip4: "Capturez la plante entière si possible",
    alertsTitle: "Alertes", alertsSubtitle: "Notifications et mises à jour", newBadge: "nouvelles",
    markAllRead: "Tout marquer comme lu",
    criticalMsg: "Critique ! Arrosez immédiatement - humidité du sol à 28%",
    warningMsg: "Arrosage nécessaire bientôt - humidité du sol à 42%",
    infoMsg1: "L'IA a détecté des conditions de croissance optimales",
    infoMsg2: "Arrosage programmé terminé avec succès",
    smartSuggestions: "Suggestions intelligentes", optimalWatering: "Heure d'arrosage optimale",
    optimalWateringDesc: "Le meilleur moment pour arroser est tôt le matin (6h-8h) pour une absorption maximale.",
    settingsTitle: "Paramètres", settingsSubtitle: "Gérez votre système d'irrigation intelligent",
    addPlant: "Ajouter une plante", configureSensor: "Configurer un capteur",
    irrigationPrefs: "Préférences d'irrigation",
    autoIrrigation: "Irrigation automatique", autoIrrigationDesc: "Arrose automatiquement selon les recommandations de l'IA",
    defaultWater: "Quantité d'eau par défaut", preferredTime: "Heure d'irrigation préférée",
    notifications: "Notifications", pushNotifications: "Notifications push",
    pushNotificationsDesc: "Recevez des alertes sur vos plantes",
    language: "Langue", english: "Anglais", french: "Français",
  },
};

type Lang = keyof typeof translations;
const I18nCtx = createContext<{ t: typeof translations.en; lang: Lang; setLang: (l: Lang) => void }>({
  t: translations.en, lang: "en", setLang: () => {},
});
const useT = () => useContext(I18nCtx);

/* ---------------- Layout ---------------- */
function Header({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <header className="bg-[#1E7A3E] px-5 pt-6 pb-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>
        </div>
        {badge && (
          <span className="bg-white/20 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
    </header>
  );
}

function BottomNav({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const { t } = useT();
  const items = [
    { id: "dashboard", icon: LayoutDashboard, label: t.dashboard },
    { id: "garden", icon: MapPin, label: t.garden },
    { id: "scan", icon: Camera, label: t.scan },
    { id: "alerts", icon: Bell, label: t.alerts },
    { id: "settings", icon: SettingsIcon, label: t.settings },
  ];
  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      {items.map((i) => {
        const Icon = i.icon;
        const active = tab === i.id;
        return (
          <button
            key={i.id}
            onClick={() => setTab(i.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              active ? "text-[#1E7A3E] bg-[#E8F5EC]" : "text-gray-400"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>{i.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------------- Screens ---------------- */
function StatCard({ icon: Icon, label, value, tint, iconColor }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { t } = useT();
  const data = [
    { d: "Apr 8", v: 68 }, { d: "Apr 9", v: 72 }, { d: "Apr 10", v: 65 },
    { d: "Apr 11", v: 58 }, { d: "Apr 12", v: 62 }, { d: "Apr 13", v: 70 }, { d: "Apr 14", v: 74 },
  ];
  return (
    <>
      <Header title={t.appTitle} subtitle={t.appSubtitle} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Droplets} label={t.avgHumidity} value="55%" tint="bg-blue-50" iconColor="text-blue-500" />
          <StatCard icon={Thermometer} label={t.avgTemp} value="25°C" tint="bg-orange-50" iconColor="text-red-500" />
          <StatCard icon={Sprout} label={t.healthyPlants} value="3" tint="bg-green-50" iconColor="text-[#1E7A3E]" />
          <StatCard icon={TrendingUp} label={t.needsCare} value="2" tint="bg-orange-50" iconColor="text-[#F5A623]" />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3">{t.moistureTrend}</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke="#1E7A3E" strokeWidth={2.5} dot={{ fill: "#1E7A3E", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="font-bold text-gray-900">{t.yourPlants}</h3>
            <span className="text-xs text-gray-500">5 {t.total}</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <img src={greenhouse} alt={t.greenhousePlant} loading="lazy" width={768} height={512} className="w-full h-44 object-cover" />
            <span className="absolute top-3 right-3 bg-[#1E7A3E] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {t.good}
            </span>
            <div className="p-3">
              <div className="font-semibold text-gray-900">{t.greenhousePlant}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Garden() {
  const { t } = useT();
  const plants = [
    { x: 20, y: 25, type: "healthy" },
    { x: 60, y: 20, type: "healthy" },
    { x: 35, y: 55, type: "water" },
    { x: 75, y: 50, type: "healthy" },
    { x: 80, y: 78, type: "critical" },
  ];
  const colorFor = (type: string) =>
    type === "healthy" ? "bg-[#1E7A3E]" : type === "water" ? "bg-[#F5A623]" : "bg-[#E53935]";
  const IconFor = (type: string) =>
    type === "healthy" ? Sprout : type === "water" ? Droplets : AlertTriangle;
  return (
    <>
      <Header title={t.gardenMap} subtitle={t.gardenSubtitle} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
            <Sprout className="mx-auto text-[#1E7A3E]" size={22} />
            <div className="text-2xl font-bold text-gray-900 mt-1">3</div>
            <div className="text-[11px] text-gray-600">{t.healthy}</div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
            <Droplets className="mx-auto text-[#F5A623]" size={22} />
            <div className="text-2xl font-bold text-gray-900 mt-1">1</div>
            <div className="text-[11px] text-gray-600">{t.needsWater}</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-100">
            <AlertTriangle className="mx-auto text-[#E53935]" size={22} />
            <div className="text-2xl font-bold text-gray-900 mt-1">1</div>
            <div className="text-[11px] text-gray-600">{t.critical}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900">{t.gardenLayout}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t.tapPlant}</p>
          <div className="mt-3 relative rounded-xl overflow-hidden bg-[#EAF6EE] border border-green-100" style={{ aspectRatio: "1/1" }}>
            <div className="absolute inset-0 grid grid-cols-2">
              <div className="border-r border-green-200/60 relative">
                <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#1E7A3E]/70">{t.zoneA}</span>
              </div>
              <div className="relative">
                <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#1E7A3E]/70">{t.zoneB}</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,122,62,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,122,62,0.08)_1px,transparent_1px)] bg-[size:20%_20%]" />
            {plants.map((p, i) => {
              const Icon = IconFor(p.type);
              return (
                <button
                  key={i}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full ${colorFor(p.type)} text-white flex items-center justify-center shadow-md ring-4 ring-white/60`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function Scan() {
  const { t } = useT();
  return (
    <>
      <Header title={t.aiScanner} subtitle={t.scannerSubtitle} />
      <div className="p-4 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ height: "55vh", maxHeight: 380 }}>
          <img src={greenhouse} alt="" className="w-full h-full object-cover blur-sm opacity-70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Camera size={36} className="text-[#1E7A3E]" />
            </div>
            <p className="mt-4 text-white font-medium text-sm bg-black/40 px-3 py-1.5 rounded-full">
              {t.positionPlant}
            </p>
          </div>
          {/* Corner brackets */}
          {[
            "top-4 left-4 border-t-2 border-l-2",
            "top-4 right-4 border-t-2 border-r-2",
            "bottom-4 left-4 border-b-2 border-l-2",
            "bottom-4 right-4 border-b-2 border-r-2",
          ].map((c, i) => (
            <div key={i} className={`absolute w-8 h-8 border-white rounded-sm ${c}`} />
          ))}
        </div>

        <button className="w-full bg-[#1E7A3E] hover:bg-[#196634] transition text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md">
          <Camera size={20} /> {t.startScan}
        </button>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Info size={18} className="text-blue-500" /> {t.scanningTips}
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {[t.tip1, t.tip2, t.tip3, t.tip4].map((tip, i) => (
              <li key={i} className="flex gap-2"><span className="text-blue-500">•</span>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Alerts() {
  const { t } = useT();
  const [items, setItems] = useState([
    { id: 1, level: "critical", plant: "Strawberry", msg: t.criticalMsg, time: "Apr 14, 08:00 AM", unread: true },
    { id: 2, level: "warning", plant: "Basil", msg: t.warningMsg, time: "Apr 14, 07:30 AM", unread: true },
    { id: 3, level: "info", plant: "Tomato Plant", msg: t.infoMsg1, time: "Apr 14, 06:00 AM", unread: false },
    { id: 4, level: "info", plant: "Cucumber", msg: t.infoMsg2, time: "Apr 13, 06:05 PM", unread: false },
  ]);
  // Update messages when language changes
  useMemo(() => {
    setItems((prev) => prev.map((it) => {
      const msg = it.level === "critical" ? t.criticalMsg : it.level === "warning" ? t.warningMsg
        : it.id === 3 ? t.infoMsg1 : t.infoMsg2;
      return { ...it, msg };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const unreadCount = items.filter((i) => i.unread).length;
  const borderFor = (l: string) => l === "critical" ? "border-l-[#E53935]" : l === "warning" ? "border-l-[#F5A623]" : "border-l-gray-300";
  const IconFor = (l: string) => l === "critical" ? AlertTriangle : l === "warning" ? Droplets : Info;
  const iconColorFor = (l: string) => l === "critical" ? "text-[#E53935]" : l === "warning" ? "text-[#F5A623]" : "text-gray-400";

  return (
    <>
      <Header title={t.alertsTitle} subtitle={t.alertsSubtitle} badge={unreadCount > 0 ? `${unreadCount} ${t.newBadge}` : undefined} />
      <div className="p-4 space-y-3">
        <button
          onClick={() => setItems((p) => p.map((i) => ({ ...i, unread: false })))}
          className="w-full border border-[#1E7A3E] text-[#1E7A3E] font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} /> {t.markAllRead}
        </button>

        <div className="space-y-2.5">
          {items.map((it) => {
            const Icon = IconFor(it.level);
            return (
              <div key={it.id} className={`bg-white rounded-2xl p-3 shadow-sm border border-gray-100 border-l-4 ${borderFor(it.level)} flex gap-3`}>
                <Icon size={20} className={`${iconColorFor(it.level)} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{it.plant}</span>
                    {it.unread && <span className="w-2 h-2 rounded-full bg-[#1E7A3E]" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{it.msg}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{it.time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mt-4 mb-2 px-1">{t.smartSuggestions}</h3>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex gap-3">
            <Info size={20} className="text-[#1E7A3E] mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 text-sm">{t.optimalWatering}</div>
              <p className="text-xs text-gray-600 mt-1">{t.optimalWateringDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition relative shrink-0 ${on ? "bg-[#1E7A3E]" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const [auto, setAuto] = useState(true);
  const [push, setPush] = useState(true);
  const [water, setWater] = useState("200");
  const [time, setTime] = useState("07:00");

  return (
    <>
      <Header title={t.settingsTitle} subtitle={t.settingsSubtitle} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-start gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Plus className="text-[#1E7A3E]" size={20} />
            </div>
            <span className="font-semibold text-sm text-gray-900">{t.addPlant}</span>
          </button>
          <button className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-start gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Wifi className="text-[#1E7A3E]" size={20} />
            </div>
            <span className="font-semibold text-sm text-gray-900">{t.configureSensor}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-[#1E7A3E]" /> {t.irrigationPrefs}
          </h3>
          <div className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="font-medium text-sm text-gray-900">{t.autoIrrigation}</div>
              <p className="text-xs text-gray-500 mt-0.5">{t.autoIrrigationDesc}</p>
            </div>
            <Toggle on={auto} onChange={setAuto} />
          </div>
          <div className="space-y-2 mt-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">{t.defaultWater}</span>
              <div className="flex items-center mt-1 border border-gray-200 rounded-xl overflow-hidden">
                <input value={water} onChange={(e) => setWater(e.target.value)} className="flex-1 px-3 py-2.5 text-sm outline-none" />
                <span className="px-3 text-xs text-gray-500 bg-gray-50 self-stretch flex items-center">ml</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">{t.preferredTime}</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none" />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <BellIcon size={18} className="text-[#1E7A3E]" /> {t.notifications}
          </h3>
          <div className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="font-medium text-sm text-gray-900">{t.pushNotifications}</div>
              <p className="text-xs text-gray-500 mt-0.5">{t.pushNotificationsDesc}</p>
            </div>
            <Toggle on={push} onChange={setPush} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Languages size={18} className="text-[#1E7A3E]" /> {t.language}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(["en", "fr"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                  lang === l ? "bg-[#1E7A3E] text-white border-[#1E7A3E]" : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {l === "en" ? t.english : t.french}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- App Shell ---------------- */
function App() {
  const [tab, setTab] = useState("dashboard");
  const [lang, setLang] = useState<Lang>("en");
  const t: typeof translations.en = translations[lang];

  return (
    <I18nCtx.Provider value={{ t, lang, setLang }}>
      <div className="min-h-screen bg-[#F4FAF5] flex justify-center">
        <div className="w-full max-w-[420px] min-h-screen bg-[#F4FAF5] flex flex-col shadow-xl">
          <main key={tab} className="flex-1 pb-2 animate-in fade-in duration-200">
            {tab === "dashboard" && <Dashboard />}
            {tab === "garden" && <Garden />}
            {tab === "scan" && <Scan />}
            {tab === "alerts" && <Alerts />}
            {tab === "settings" && <SettingsScreen />}
          </main>
          <BottomNav tab={tab} setTab={setTab} />
        </div>
      </div>
    </I18nCtx.Provider>
  );
}
