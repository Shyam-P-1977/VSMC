import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Navigation, ArrowRight, Compass, Building, Check, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';
import { centerApi } from '../../api';

export function LocationSelectPage() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const { userLocation, updateLocation, hasLocation } = useAuth();

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(userLocation?.city || 'Pune');
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(userLocation?.area || '');
  const [selectedLatLng, setSelectedLatLng] = useState({
    lat: userLocation?.latitude || 18.5204,
    lng: userLocation?.longitude || 73.8567
  });

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [locatingGeo, setLocatingGeo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load cities on mount
  useEffect(() => {
    async function loadCities() {
      try {
        setLoadingCities(true);
        const res = await centerApi.getCities();
        const cityList = (res.cities || []).map((c) => (typeof c === 'object' && c !== null ? c.name : c));
        setCities(cityList);
        if (!selectedCity && cityList.length > 0) {
          setSelectedCity(cityList[0]);
        }
      } catch (err) {
        toast.error('Failed to load available cities');
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  // Load areas when city changes
  useEffect(() => {
    if (!selectedCity) return;
    async function loadAreas() {
      try {
        setLoadingAreas(true);
        const res = await centerApi.getAreas(selectedCity);
        const areaList = res.areas || [];
        setAreas(areaList);
        // If current selectedArea belongs to this city, keep it, else pick first
        const match = areaList.find(a => a.name === selectedArea);
        if (match) {
          setSelectedLatLng({ lat: match.lat, lng: match.lng });
        } else if (areaList.length > 0) {
          setSelectedArea(areaList[0].name);
          setSelectedLatLng({ lat: areaList[0].lat, lng: areaList[0].lng });
        } else {
          setSelectedArea('');
        }
      } catch (err) {
        toast.error(`Failed to load areas for ${selectedCity}`);
      } finally {
        setLoadingAreas(false);
      }
    }
    loadAreas();
  }, [selectedCity]);

  // Handle area change
  const handleAreaChange = (areaName) => {
    setSelectedArea(areaName);
    const found = areas.find(a => a.name === areaName);
    if (found) {
      setSelectedLatLng({ lat: found.lat, lng: found.lng });
    }
  };

  // Browser Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocatingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const nearest = await centerApi.getNearestLocation(latitude, longitude);
          if (nearest && nearest.nearest_area) {
            const nearestCity = nearest.nearest_area.city;
            const nearestArea = nearest.nearest_area.area;
            setSelectedCity(nearestCity);
            setSelectedArea(nearestArea);
            setSelectedLatLng({
              lat: nearest.nearest_area.lat,
              lng: nearest.nearest_area.lng
            });
            toast.success(`Location identified: ${nearestArea}, ${nearestCity}`);
          } else {
            toast.success('Location detected. Matching with nearest Maharashtra hubs.');
          }
        } catch (err) {
          toast.error('Could not map GPS coordinates to a service region');
        } finally {
          setLocatingGeo(false);
        }
      },
      (err) => {
        setLocatingGeo(false);
        let msg = 'Could not access GPS. Please choose your city and area below.';
        if (err.code === 1) msg = 'Location permission denied. Please select your city manually.';
        toast.error(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!selectedCity || !selectedArea) {
      toast.error('Please select both your city and area');
      return;
    }

    try {
      setSaving(true);
      await updateLocation({
        city: selectedCity,
        area: selectedArea,
        state: 'Maharashtra',
        latitude: selectedLatLng.lat,
        longitude: selectedLatLng.lng
      });

      toast.success(`Service area set to ${selectedArea}, ${selectedCity}!`);
      
      const destination = locationState.state?.from?.pathname || '/customer/centers';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save location';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFA] dark:bg-[#022828] text-slate-900 dark:text-slate-100">
      {/* Top Banner */}
      <header className="h-20 bg-white/90 dark:bg-[#043433]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold shadow">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-xl uppercase tracking-wider font-bold text-teal-950 dark:text-white">
              VSCMS <span className="text-yellow-signal">Locality Finder</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Maharashtra Auto Care Service Grid
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-xl p-6 sm:p-10 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-yellow-signal text-xs font-semibold mb-3">
              <MapPin className="w-3.5 h-3.5" />
              <span>Step 1: Set Your Service Zone</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Where are you located?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
              We need your current location to connect you with nearby authorized service centers, calculate accurate distance, and verify slot availability.
            </p>
          </div>

          {/* Quick GPS Geolocation Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingGeo}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border-2 border-dashed border-teal-600/40 dark:border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 font-semibold text-sm transition group"
            >
              {locatingGeo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Locating via GPS coordinates...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                  <span>Use My Current Location (GPS)</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Or Choose Manually
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Manual Selection Form */}
          <form onSubmit={handleSaveLocation} className="space-y-5">
            {/* State (Fixed to Maharashtra) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                State / Region
              </label>
              <div className="relative">
                <input
                  type="text"
                  value="Maharashtra"
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-not-allowed"
                />
                <Badge variant="teal" className="absolute right-3 top-3">
                  Western Hub
                </Badge>
              </div>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Select City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={loadingCities}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
              >
                {cities.map((c) => {
                  const name = typeof c === 'object' && c !== null ? c.name : c;
                  return (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Area / Locality Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Select Area / Locality</span>
                {loadingAreas && (
                  <span className="text-[11px] text-teal-600 font-normal">Loading areas...</span>
                )}
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                disabled={loadingAreas || areas.length === 0}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
              >
                {areas.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} (Pin: {a.pincode})
                  </option>
                ))}
              </select>
            </div>

            {/* Confirmation & Coordinates preview */}
            {selectedArea && (
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                  <span className="font-semibold text-teal-950 dark:text-teal-100">
                    {selectedArea}, {selectedCity}
                  </span>
                </div>
                <span className="text-[11px] text-teal-700 dark:text-teal-300 font-mono">
                  {selectedLatLng.lat.toFixed(4)}° N, {selectedLatLng.lng.toFixed(4)}° E
                </span>
              </div>
            )}

            {/* Submit Action */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={saving}
              icon={ArrowRight}
            >
              Continue to Service Centers
            </Button>
          </form>
        </Card>
      </main>

      {/* Footer info */}
      <footer className="p-4 text-center text-xs text-slate-400">
        You can change your service area at any time using the location chip in the navigation bar.
      </footer>
    </div>
  );
}
