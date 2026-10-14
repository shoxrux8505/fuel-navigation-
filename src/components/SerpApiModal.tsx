import React, { useState, useEffect } from 'react';

interface SerpApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStationToMap?: (station: any) => void;
}

export const SerpApiModal: React.FC<SerpApiModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'test' | 'code'>('endpoints');
  const [query, setQuery] = useState('Love\'s Travel Stop');
  const [ll, setLl] = useState('@32.7767,-96.7970,10z'); // Dallas, TX
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/serpapi/status')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(data.configured);
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSearch = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResponseJson(null);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (ll) params.set('ll', ll);

      const res = await fetch(`/api/serpapi/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || data.message || 'Failed to query SerpApi');
      } else {
        setResponseJson(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs shadow-md">
              API
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                SerpApi Google Maps Engine (`engine=google_maps`)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                https://serpapi.com/search?engine=google_maps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('endpoints')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'endpoints'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            API Endpoints & Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'test'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Request Runner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Integration Code Snippets
          </button>
        </div>

        {/* Tab 1: Endpoints & Parameters Documentation */}
        {activeTab === 'endpoints' && (
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            {/* Base Endpoint Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Base GET Endpoint
              </span>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-xs overflow-x-auto">
                <span>GET https://serpapi.com/search.json?engine=google_maps</span>
              </div>
            </div>

            {/* Parameters Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Key Query Parameters
              </h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Parameter</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 bg-slate-950/40 text-slate-300 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">engine</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (required)</td>
                      <td className="py-2 px-3 font-sans">Specifies SerpApi engine to use.</td>
                      <td className="py-2 px-3 text-slate-400">google_maps</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">q</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (required)</td>
                      <td className="py-2 px-3 font-sans">Search query term or business name.</td>
                      <td className="py-2 px-3 text-slate-400">Love's Travel Stop</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">ll</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (optional)</td>
                      <td className="py-2 px-3 font-sans">GPS coordinate anchor `@lat,lng,zoom`</td>
                      <td className="py-2 px-3 text-slate-400">@35.1919,-101.7609,12z</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">type</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (optional)</td>
                      <td className="py-2 px-3 font-sans">`search` (default) or `place` for single place</td>
                      <td className="py-2 px-3 text-slate-400">search</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">place_id</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (optional)</td>
                      <td className="py-2 px-3 font-sans">Google Place ID (when type=place)</td>
                      <td className="py-2 px-3 text-slate-400">ChIJ...</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">gl / hl</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (optional)</td>
                      <td className="py-2 px-3 font-sans">Country code (gl) and Language (hl)</td>
                      <td className="py-2 px-3 text-slate-400">gl=us&hl=en</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-amber-400 font-bold">api_key</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">string (required)</td>
                      <td className="py-2 px-3 font-sans">Your SerpApi secret API token.</td>
                      <td className="py-2 px-3 text-slate-400">secret_key</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expected JSON Response Architecture */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Returned JSON Structure (`local_results`)
              </h4>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div>{`{`}</div>
                <div className="pl-4 text-slate-400">"search_metadata": {`{ ... }`},</div>
                <div className="pl-4 text-emerald-400">"local_results": [</div>
                <div className="pl-8 text-slate-200">{`{`}</div>
                <div className="pl-12 text-slate-300">"position": 1,</div>
                <div className="pl-12 text-slate-300">"title": "Love's Travel Stop",</div>
                <div className="pl-12 text-amber-400">"gps_coordinates": {`{ "latitude": 35.1919, "longitude": -101.7609 }`},</div>
                <div className="pl-12 text-slate-300">"address": "Amarillo, TX",</div>
                <div className="pl-12 text-slate-300">"rating": 4.3,</div>
                <div className="pl-12 text-slate-300">"reviews": 1240,</div>
                <div className="pl-12 text-slate-300">"type": "Gas station / Truck stop"</div>
                <div className="pl-8 text-slate-200">{`}, ...`}</div>
                <div className="pl-4 text-emerald-400">]</div>
                <div>{`}`}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Test Runner */}
        {activeTab === 'test' && (
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Status indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Server SerpApi Integration Status:</span>
              {isConfigured ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  API Key Configured
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Key not in .env (add SERPAPI_API_KEY)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Search Query (`q`)</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Love's Travel Stop, gas station..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Coordinates (`ll`)</label>
                <input
                  type="text"
                  value={ll}
                  onChange={(e) => setLl(e.target.value)}
                  placeholder="@latitude,longitude,zoom"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleTestSearch}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Querying SerpApi Google Maps...' : 'Execute Live Search (/api/serpapi/search)'}
            </button>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs">
                <b>Error:</b> {errorMsg}
                <div className="mt-1 text-slate-400 text-[11px]">
                  To test with live data, set your SerpApi API key in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">.env</code> as <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">SERPAPI_API_KEY="your_key"</code>.
                </div>
              </div>
            )}

            {responseJson && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300">
                    Live Response Results: {responseJson.local_results?.length || 0} places
                  </span>
                </div>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto">
                  {JSON.stringify(responseJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Code Snippets */}
        {activeTab === 'code' && (
          <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
            {/* cURL Example */}
            <div>
              <span className="text-slate-400 font-sans font-semibold block mb-1">
                cURL CLI
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-emerald-400 overflow-x-auto">
{`curl "https://serpapi.com/search.json?engine=google_maps&q=Love%27s+Travel+Stop&ll=@35.1919,-101.7609,12z&api_key=YOUR_API_KEY"`}
              </pre>
            </div>

            {/* TypeScript / Node Example */}
            <div>
              <span className="text-slate-400 font-sans font-semibold block mb-1">
                TypeScript / Node.js
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-sky-400 overflow-x-auto">
{`// Query via our local server proxy (keeps API key secure on server)
const res = await fetch('/api/serpapi/search?q=Loves+Travel+Stop&ll=@35.19,-101.76,12z');
const data = await res.json();
console.log(data.local_results);`}
              </pre>
            </div>

            {/* Python Example */}
            <div>
              <span className="text-slate-400 font-sans font-semibold block mb-1">
                Python (requests)
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-amber-300 overflow-x-auto">
{`import requests

params = {
    "engine": "google_maps",
    "q": "Love's Travel Stop",
    "ll": "@35.1919,-101.7609,12z",
    "api_key": "YOUR_API_KEY"
}
response = requests.get("https://serpapi.com/search.json", params=params)
data = response.json()
print(data.get("local_results", []))`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
