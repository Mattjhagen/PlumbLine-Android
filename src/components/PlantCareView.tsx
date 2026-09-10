import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplet,
  Sparkles,
  Plus,
  Bell,
  BellRing,
  Calendar,
  Clock,
  Check,
  AlertTriangle,
  Leaf,
  X,
  RefreshCw,
  Trash2,
  BookOpen,
} from 'lucide-react';

import { PlumbLineLogo } from './PlumbLineLogo';
import {
  markTaskCompleted,
  sendTestPushNotification,
  requestPushPermission,
} from '../utils/taskNotificationManager';

export interface Plant {
  id: string;
  name: string;
  species: string;
  waterFrequencyDays: number;
  fertilizeFrequencyDays: number;
  lastWateredAt: string;
  lastFertilizedAt: string;
  notes?: string;
  scriptureLink?: string;
  imageUrl?: string;
}

interface PlantCareViewProps {
  onSelectPassage?: (book: string, chapter: number) => void;
}

export const PlantCareView: React.FC<PlantCareViewProps> = ({ onSelectPassage }) => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  // New Plant Form State
  const [newName, setNewName] = useState('');
  const [newSpecies, setNewSpecies] = useState('');
  const [newWaterDays, setNewWaterDays] = useState(7);
  const [newFertDays, setNewFertDays] = useState(30);
  const [newNotes, setNewNotes] = useState('');

  // Fetch plants from server or fallback to local storage
  const fetchPlants = async () => {
    try {
      const res = await fetch('/api/plants');
      if (res.ok) {
        const data = await res.json();
        setPlants(data);
        localStorage.setItem('rooted_plants_cache', JSON.stringify(data));
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (err) {
      console.warn('Using cached plants:', err);
      try {
        const cached = localStorage.getItem('rooted_plants_cache');
        if (cached) setPlants(JSON.parse(cached));
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotifications = async () => {
    try {
      const res = await sendTestPushNotification();
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      setNotificationStatusMsg(
        res.success
          ? 'Reminders enabled! Test push notification delivered.'
          : 'In-app notification active. Open in browser tab for system push alerts.'
      );
    } catch (err: any) {
      setNotificationStatusMsg(err.message || 'Notification request failed.');
    }
    setTimeout(() => setNotificationStatusMsg(null), 5000);
  };

  const handleWaterPlant = async (plantId: string) => {
    let updatedPlant: any = null;
    const nowStr = new Date().toISOString();
    try {
      const res = await fetch(`/api/plants/${plantId}/water`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        updatedPlant = data.plant;
      }
    } catch {
      // Offline fallback
    }

    setPlants((prev) => {
      const updated = prev.map((p) =>
        p.id === plantId ? updatedPlant || { ...p, lastWateredAt: nowStr } : p
      );
      localStorage.setItem('rooted_plants_cache', JSON.stringify(updated));
      return updated;
    });

    // Mark task completed and update bell badge
    await markTaskCompleted({
      id: `rem-water-${plantId}`,
      type: 'watering',
      title: `Water plant`,
      message: 'Watered today',
      plantId: plantId,
      urgency: 'normal',
    });
  };

  const handleFertilizePlant = async (plantId: string) => {
    let updatedPlant: any = null;
    const nowStr = new Date().toISOString();
    try {
      const res = await fetch(`/api/plants/${plantId}/fertilize`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        updatedPlant = data.plant;
      }
    } catch {
      // Offline fallback
    }

    setPlants((prev) => {
      const updated = prev.map((p) =>
        p.id === plantId ? updatedPlant || { ...p, lastFertilizedAt: nowStr } : p
      );
      localStorage.setItem('rooted_plants_cache', JSON.stringify(updated));
      return updated;
    });

    // Mark task completed and update bell badge
    await markTaskCompleted({
      id: `rem-fert-${plantId}`,
      type: 'fertilizing',
      title: `Fertilize plant`,
      message: 'Nourished today',
      plantId: plantId,
      urgency: 'normal',
    });
  };

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const payload = {
      name: newName.trim(),
      species: newSpecies.trim() || 'Indoor Botanical',
      waterFrequencyDays: Number(newWaterDays) || 7,
      fertilizeFrequencyDays: Number(newFertDays) || 30,
      notes: newNotes.trim(),
    };

    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setPlants((prev) => [created, ...prev]);
      }
    } catch (err) {
      // Offline fallback
      const offlinePlant: Plant = {
        id: `plant-local-${Date.now()}`,
        name: payload.name,
        species: payload.species,
        waterFrequencyDays: payload.waterFrequencyDays,
        fertilizeFrequencyDays: payload.fertilizeFrequencyDays,
        lastWateredAt: new Date().toISOString(),
        lastFertilizedAt: new Date().toISOString(),
        notes: payload.notes,
        scriptureLink: 'Genesis 1:11 — "The earth brought forth grass, herbs yielding seed."',
      };
      setPlants((prev) => [offlinePlant, ...prev]);
    } finally {
      setShowAddModal(false);
      setNewName('');
      setNewSpecies('');
      setNewNotes('');
    }
  };

  // Helper to calculate days remaining or overdue
  const getScheduleStatus = (lastDateStr: string, frequencyDays: number) => {
    const lastDate = new Date(lastDateStr).getTime();
    const intervalMs = frequencyDays * 86400000;
    const dueDate = lastDate + intervalMs;
    const now = Date.now();
    const diffDays = Math.ceil((dueDate - now) / 86400000);

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false, isToday: true };
    } else {
      return { text: `In ${diffDays} days`, isOverdue: false, isToday: false };
    }
  };

  return (
    <div className="w-full flex flex-col pb-16 space-y-6">
      {/* Header & Notification Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
              <Leaf size={16} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-emerald-500">
              Plant Care & Reminders
            </span>
          </div>

          <button
            onClick={requestNotifications}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-emerald-500 text-[11px] text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {notificationPermission === 'granted' ? (
              <BellRing size={13} className="text-emerald-500" />
            ) : (
              <Bell size={13} className="text-[var(--text-muted)]" />
            )}
            <span>{notificationPermission === 'granted' ? 'Reminders Active' : 'Enable Alerts'}</span>
          </button>
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          Botanical Care & Rhythms
        </h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          Track watering and nourishment schedules for your household plants alongside daily biblical reflections on growth, pruning, and fruitfulness.
        </p>

        {notificationStatusMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Check size={14} />
            <span>{notificationStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Your Garden ({plants.length})
        </span>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          <span>Add Plant</span>
        </button>
      </div>

      {/* Plants Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading plant schedules...</span>
        </div>
      ) : plants.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <Leaf size={32} className="mx-auto text-[var(--text-tertiary)] mb-2" />
          <p className="text-sm font-medium text-[var(--text-main)]">No plants tracked yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Add an olive tree, fig tree, or household botanical to receive watering reminders.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            Add First Plant
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plants.map((plant) => {
            const waterStatus = getScheduleStatus(plant.lastWateredAt, plant.waterFrequencyDays);
            const fertStatus = getScheduleStatus(plant.lastFertilizedAt, plant.fertilizeFrequencyDays);

            return (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-3.5 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--bg-main)] border border-[var(--border-subtle)] shrink-0 flex items-center justify-center">
                      {plant.imageUrl ? (
                        <img
                          src={plant.imageUrl}
                          alt={plant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Leaf size={22} className="text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-main)]">
                        {plant.name}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        {plant.species}
                      </p>
                    </div>
                  </div>

                  {waterStatus.isOverdue && (
                    <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle size={11} /> Water Overdue
                    </span>
                  )}
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Water Status */}
                  <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                      <span className="flex items-center gap-1">
                        <Droplet size={11} className="text-cyan-400" /> Water:
                      </span>
                      <span>Every {plant.waterFrequencyDays}d</span>
                    </div>
                    <span
                      className={`font-semibold text-xs ${
                        waterStatus.isOverdue
                          ? 'text-red-400'
                          : waterStatus.isToday
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {waterStatus.text}
                    </span>
                    <button
                      onClick={() => handleWaterPlant(plant.id)}
                      className="mt-2 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={11} />
                      <span>Water Now</span>
                    </button>
                  </div>

                  {/* Fertilize Status */}
                  <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-400" /> Feed:
                      </span>
                      <span>Every {plant.fertilizeFrequencyDays}d</span>
                    </div>
                    <span
                      className={`font-semibold text-xs ${
                        fertStatus.isOverdue
                          ? 'text-red-400'
                          : fertStatus.isToday
                          ? 'text-amber-400'
                          : 'text-[var(--text-main)]'
                      }`}
                    >
                      {fertStatus.text}
                    </span>
                    <button
                      onClick={() => handleFertilizePlant(plant.id)}
                      className="mt-2 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={11} />
                      <span>Feed Now</span>
                    </button>
                  </div>
                </div>

                {/* Notes & Scripture Connection */}
                {plant.notes && (
                  <p className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-main)] p-2 rounded-xl border border-[var(--border-subtle)]">
                    {plant.notes}
                  </p>
                )}

                {plant.scriptureLink && (
                  <div className="text-[11px] font-scripture text-amber-500/90 italic flex items-center gap-1.5 pt-0.5">
                    <BookOpen size={12} className="shrink-0" />
                    <span>{plant.scriptureLink}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Plant Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-subtle)] shadow-2xl relative"
              style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X size={16} />
              </button>

              <h3 className="text-lg font-semibold mb-1 text-[var(--text-main)]">
                Add Plant to Tracker
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Set up automated reminders for watering and nourishment.
              </p>

              <form onSubmit={handleAddPlant} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Plant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Living Water Fern, Galilee Olive"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Botanical Species
                  </label>
                  <input
                    type="text"
                    value={newSpecies}
                    onChange={(e) => setNewSpecies(e.target.value)}
                    placeholder="e.g. Ficus lyrata, Olea europaea"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                      Water Frequency (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={newWaterDays}
                      onChange={(e) => setNewWaterDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                      Fertilize Frequency (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={newFertDays}
                      onChange={(e) => setNewFertDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Care Notes / Soil Condition
                  </label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Needs morning sun, dry topsoil before watering"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Save Plant to Tracker
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
