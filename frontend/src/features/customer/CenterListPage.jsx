import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, Search, Star, Clock, Wrench, ArrowRight,
  Filter, Map as MapIcon, List, AlertCircle, ChevronRight,
  Sparkles, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';
import { centerApi } from '../../api';
import { LocationModal } from './LocationModal';

export function CenterListPage() {
  const navigate = useNavigate();
  const { userLocation, hasLocation } = useAuth();

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Fetch nearby centers
  const fetchCenters = async () => {
    try {
      setLoading(true);
      const params = {
        radius: radiusKm,
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
        city: userLocation?.city,
        area: userLocation?.area,
        q: searchQuery
      };
      const res = await centerApi.getCenters(params);
      setCenters(res.centers || []);
    } catch (err) {
      toast.error('Failed to load service centers in this area');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [radiusKm, userLocation?.latitude, userLocation?.longitude, userLocation?.city]);

  // Handle live search filter or trigger on Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCenters();
  };

  const handleSelectCenter = (center) => {
    // Save in sessionStorage as wizard fallback
    sessionStorage.setItem('vscms_selected_center', JSON.stringify(center));
    navigate(`/customer/book?center_id=${center.id}`);
  };

  const radiusOptions = [5, 10, 25, 50];

  return (
    <div className="min-h-screen bg-[#F8FAFA] dark:bg-[#022828] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationUpdated={fetchCenters}
      />

      {/* Header bar */}
      <div className="bg-white dark:bg-[#043433] border-b border-slate-200/80 dark:border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-yellow-signal">
                Step 2 of 4: Center Discovery
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display uppercase tracking-wide">
              Authorized Service Centers Near You
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select an approved workshop in Maharashtra to inspect, service, or repair your vehicle.
            </p>
          </div>

          {/* Current Location Chip */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center gap-2 text-xs">
              <MapPin className="w-4 h-4 text-teal-600 dark:text-yellow-signal" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Current Area</span>
                <span className="font-bold text-teal-900 dark:text-teal-100">
                  {userLocation?.area ? `${userLocation.area}, ${userLocation.city}` : 'Maharashtra'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLocationModalOpen(true)}
            >
              Change Location
            </Button>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search center by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          {/* Radius selector & View Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Radius Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase px-2.5">Radius:</span>
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                    radiusKm === r
                      ? 'bg-yellow-signal text-ink shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>

            {/* List / Map view toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-xl transition ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Map View"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Scanning authorized workshops nearby...</p>
          </div>
        ) : centers.length === 0 ? (
          /* Empty State */
          <div className="my-auto py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              No Service Centers in {radiusKm} km Radius
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              We couldn't find an approved center within {radiusKm} km of {userLocation?.area || 'your area'}. Try expanding the search radius or choosing an adjacent city or hub.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {radiusKm < 50 && (
                <Button
                  variant="primary"
                  onClick={() => setRadiusKm(50)}
                >
                  Increase Search Radius to 50 km
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsLocationModalOpen(true)}
              >
                Change Location
              </Button>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          /* Map View (OpenStreetMap Embed) */
          <div className="space-y-4">
            <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-100 dark:bg-slate-800">
              {/* OSM Embed iframe centered on customer location */}
              <iframe
                title="Nearby Centers OpenStreetMap"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(userLocation?.longitude || 73.85) - 0.2}%2C${(userLocation?.latitude || 18.52) - 0.2}%2C${(userLocation?.longitude || 73.85) + 0.2}%2C${(userLocation?.latitude || 18.52) + 0.2}&amp;layer=mapnik&amp;marker=${userLocation?.latitude || 18.52}%2C${userLocation?.longitude || 73.85}`}
                className="w-full h-full"
              />
            </div>
            {/* Quick center pills below map */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {centers.map((c) => (
                <Card key={c.id} className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                    <p className="text-xs text-slate-500">{c.distance_km} km away • {c.area}</p>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => handleSelectCenter(c)}>
                    Select
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* List View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((c) => (
              <Card
                key={c.id}
                className="overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header / Image Placeholder */}
                  <div className="h-36 bg-gradient-to-tr from-teal-900 to-teal-700 relative p-4 flex flex-col justify-between text-white overflow-hidden">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FFD60A_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      {/* Open / Closed badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.is_open_now
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-slate-800/80 text-slate-200'
                      }`}>
                        {c.is_open_now ? '● Open Today' : 'Closed'}
                      </span>

                      {/* Distance Badge */}
                      <span className="px-2.5 py-1 rounded-full bg-yellow-signal text-ink font-bold text-xs shadow">
                        {c.distance_km} km away
                      </span>
                    </div>

                    <div className="relative z-10">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-teal-300">
                        {c.city} • {c.area}
                      </span>
                      <h3 className="text-lg font-bold font-display uppercase tracking-wide leading-tight text-white group-hover:text-yellow-signal transition">
                        {c.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="p-5 space-y-3.5">
                    {/* Rating & Services count */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{c.avg_rating ? `${Number(c.avg_rating).toFixed(1)} / 5.0` : 'New Center'}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        {c.service_count || 8} Catalog Services
                      </div>
                    </div>

                    {/* Address snippet */}
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.address || `${c.area}, ${c.city}`}</span>
                    </div>

                    {/* Working hours */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.working_hours || '09:00 - 18:00'} ({c.working_days || 'Mon - Sat'})</span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-5 pt-0">
                  <Button
                    variant="primary"
                    className="w-full justify-between"
                    onClick={() => handleSelectCenter(c)}
                    icon={ArrowRight}
                  >
                    <span>Select this Center</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
