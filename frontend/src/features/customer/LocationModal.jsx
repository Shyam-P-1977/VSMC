import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Navigation, X, Check, Loader2, Building } from 'lucide-react';
import { Button, Badge } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';
import { centerApi } from '../../api';

export function LocationModal({ isOpen, onClose, onLocationUpdated }) {
  const { userLocation, updateLocation } = useAuth();

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(userLocation?.city || 'Pune');
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(userLocation?.area || '');
  const [selectedLatLng, setSelectedLatLng] = useState({
    lat: userLocation?.latitude || 18.5204,
    lng: userLocation?.longitude || 73.8567
  });

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [locatingGeo, setLocatingGeo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCities() {
      try {
        setLoadingCities(true);
        const res = await centerApi.getCities();
        setCities((res.cities || []).map((c) => (typeof c === 'object' && c !== null ? c.name : c)));
        if (userLocation?.city) {
          setSelectedCity(userLocation.city);
        }
      } catch {
        // ignore
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, [isOpen, userLocation]);

  useEffect(() => {
    if (!isOpen || !selectedCity) return;
    async function loadAreas() {
      try {
        setLoadingAreas(true);
        const res = await centerApi.getAreas(selectedCity);
        const areaList = res.areas || [];
        setAreas(areaList);
        const match = areaList.find(a => a.name === selectedArea);
        if (match) {
          setSelectedLatLng({ lat: match.lat, lng: match.lng });
        } else if (areaList.length > 0) {
          setSelectedArea(areaList[0].name);
          setSelectedLatLng({ lat: areaList[0].lat, lng: areaList[0].lng });
        }
      } catch {
        // ignore
      } finally {
        setLoadingAreas(false);
      }
    }
    loadAreas();
  }, [isOpen, selectedCity]);

  const handleAreaChange = (areaName) => {
    setSelectedArea(areaName);
    const found = areas.find(a => a.name === areaName);
    if (found) {
      setSelectedLatLng({ lat: found.lat, lng: found.lng });
    }
  };

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
            setSelectedCity(nearest.nearest_area.city);
            setSelectedArea(nearest.nearest_area.area);
            setSelectedLatLng({
              lat: nearest.nearest_area.lat,
              lng: nearest.nearest_area.lng
            });
            toast.success(`Matched: ${nearest.nearest_area.area}, ${nearest.nearest_area.city}`);
          }
        } catch {
          toast.error('Could not map GPS to service area');
        } finally {
          setLocatingGeo(false);
        }
      },
      () => {
        setLocatingGeo(false);
        toast.error('Location permission denied or unavailable');
      },
      { timeout: 8000 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCity || !selectedArea) {
      toast.error('Please select both city and area');
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
      toast.success(`Location updated to ${selectedArea}, ${selectedCity}`);
      if (onLocationUpdated) onLocationUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update location');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Change Your Service Location
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your city or area to find local workshops
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locatingGeo}
          className="w-full mb-5 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-teal-500/30 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold text-xs hover:bg-teal-50 transition"
        >
          {locatingGeo ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Fetching GPS position...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 text-teal-600" />
              <span>Use Current Location (GPS)</span>
            </>
          )}
        </button>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
            >
              {cities.map((c) => {
                const name = typeof c === 'object' && c !== null ? c.name : c;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Area / Locality
            </label>
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
            >
              {areas.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} (Pin: {a.pincode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Location
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
