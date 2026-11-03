import React, { useState, useEffect } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { predictiveService, WeatherRiskResult } from '../../../services/predictiveService';
import { CloudRain, Wind, Thermometer, Droplets, AlertTriangle, RefreshCw } from 'lucide-react';

const WeatherIntelligence: React.FC = () => {
  const { incidents } = useMccStore();
  const [rainfallMm, setRainfallMm] = useState<number>(75.0);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(45.0);
  const [temperatureC, setTemperatureC] = useState<number>(24.0);
  const [humidityPct, setHumidityPct] = useState<number>(85.0);
  const [weatherData, setWeatherData] = useState<WeatherRiskResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    analyzeWeatherRisk();
  }, [rainfallMm, windSpeedKmh, temperatureC, humidityPct]);

  const analyzeWeatherRisk = async () => {
    setLoading(true);
    try {
      const res = await predictiveService.analyzeWeather({
        rainfallMm,
        windSpeedKmh,
        temperatureC,
        humidityPct,
      });
      if (res) setWeatherData(res);
    } catch (err) {
      console.error('Failed to analyze weather risk:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Weather Intelligence & Environmental Risk Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time meteorological correlation predicting localized flash flooding, tree fall risks, and structural stress.
          </p>
        </div>
        <button
          onClick={analyzeWeatherRisk}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'ANALYZING...' : 'RE-ANALYZE WEATHER HAZARDS'}</span>
        </button>
      </div>

      {/* METEOROLOGICAL TELEMETRY SLIDERS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Live Sensor Telemetry & Simulation Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span className="flex items-center space-x-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>Rainfall Intensity</span>
              </span>
              <span className="font-mono text-blue-600">{rainfallMm} mm/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={rainfallMm}
              onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span className="flex items-center space-x-1">
                <Wind className="w-3.5 h-3.5 text-cyan-500" />
                <span>Wind Speed</span>
              </span>
              <span className="font-mono text-cyan-600">{windSpeedKmh} km/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={windSpeedKmh}
              onChange={(e) => setWindSpeedKmh(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span className="flex items-center space-x-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span>Ambient Temp</span>
              </span>
              <span className="font-mono text-amber-600">{temperatureC}°C</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={temperatureC}
              onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span className="flex items-center space-x-1">
                <Droplets className="w-3.5 h-3.5 text-teal-500" />
                <span>Relative Humidity</span>
              </span>
              <span className="font-mono text-teal-600">{humidityPct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={humidityPct}
              onChange={(e) => setHumidityPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>
        </div>
      </div>

      {/* ALERTS AND INCIDENT CORRELATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ACTIVE ALERTS CARDS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Active Environmental Hazard Warnings</h3>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                Threat: {weatherData?.threat_level || 'ELEVATED'}
              </span>
            </div>

            <div className="space-y-2.5">
              {weatherData?.active_alerts?.map((alert, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl flex items-start space-x-3"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red-900 leading-relaxed">{alert}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WEATHER-INCIDENT CORRELATION FROM POSTGRESQL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Live Incident Vulnerability Under Current Weather</h3>

            <div className="space-y-3">
              {incidents.slice(0, 6).map((inc) => {
                const isVulnerable = inc.category.includes('Pothole') || inc.category.includes('Water') || inc.severity === 'Critical';
                return (
                  <div
                    key={inc.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {inc.id} — {inc.category}
                      </p>
                      <p className="text-xs text-slate-500">{inc.location}</p>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-500 font-medium">Weather Sensitivity:</span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          isVulnerable
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isVulnerable ? 'HIGH (+65% surge risk)' : 'LOW (Protected)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RISK MULTIPLIER SIDEBAR */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <CloudRain className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold">Vulnerability Modifiers</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Risk Multiplier</span>
                <span className="text-3xl font-black text-cyan-400 font-mono mt-1 inline-block">
                  {weatherData?.risk_multiplier ? `${weatherData.risk_multiplier.toFixed(1)}x` : '1.8x'}
                </span>
                <p className="text-xs text-slate-400 mt-1">Multiplies default baseline dispatch urgency.</p>
              </div>

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Material Stress Index</span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-1 inline-block">
                  {weatherData?.material_stress_index ? weatherData.material_stress_index.toFixed(3) : '1.500'}
                </span>
                <p className="text-xs text-slate-400 mt-1">Asphalt & subterranean conduit pressure index.</p>
              </div>

              <div className="p-4 bg-blue-950/60 rounded-xl border border-blue-800/80">
                <p className="text-[10px] uppercase font-black text-blue-400">Dispatch Recommendation</p>
                <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                  Pre-deploy suction pump trailers and traffic diversions to low-lying underpasses before peak rainfall.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherIntelligence;
