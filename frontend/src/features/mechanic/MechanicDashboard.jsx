import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Wrench, Clock, CheckCircle2, AlertTriangle, User,
  Plus, Trash2, ArrowRight, Eye, ShieldAlert, Sparkles, Check, Search
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, StatCard, Button, Badge, StatusBadge, Drawer,
  Input, Select, Textarea, NumberPlate, EmptyState, Skeleton
} from '../../shared/ui';
import { requestApi, mechanicApi, inventoryApi } from '../../api';

export function MechanicDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Job Detail Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);

  // Available spare parts and grouped options
  const [spareParts, setSpareParts] = useState([]);
  const [jobPartsOptions, setJobPartsOptions] = useState(null);
  const [partSearch, setPartSearch] = useState('');

  // Forms inside drawer
  const [partId, setPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [addingPart, setAddingPart] = useState(false);

  const [labourDesc, setLabourDesc] = useState('');
  const [labourHours, setLabourHours] = useState('1.5');
  const [labourRate, setLabourRate] = useState('500');
  const [labourNotes, setLabourNotes] = useState('');
  const [addingLabour, setAddingLabour] = useState(false);

  const [noPartsUsed, setNoPartsUsed] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await requestApi.list();
      setJobs(res.requests || []);
    } catch {
      toast.error('Failed to load assigned jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await inventoryApi.list();
      setSpareParts(res.parts || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchParts();
  }, []);

  const handleOpenJobDrawer = async (job) => {
    try {
      setJobDetailLoading(true);
      setDrawerOpen(true);
      setPartSearch('');
      setPartId('');
      setPartQty(1);
      const [res, partsRes] = await Promise.all([
        requestApi.getById(job.Request_ID),
        inventoryApi.getMechanicJobOptions(job.Request_ID).catch(() => null)
      ]);
      setSelectedJob(res.request);
      if (partsRes) {
        setJobPartsOptions(partsRes);
        setSpareParts(partsRes.parts || []);
      }
    } catch {
      toast.error('Failed to load job details');
    } finally {
      setJobDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus) => {
    if (!selectedJob) return;
    try {
      await mechanicApi.updateStatus(selectedJob.Request_ID, nextStatus, `Updated to ${nextStatus} by technician`);
      toast.success(`Job status changed to ${nextStatus}`);
      const refreshed = await requestApi.getById(selectedJob.Request_ID);
      setSelectedJob(refreshed.request);
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!partId) {
      toast.error('Please select a spare part');
      return;
    }

    const chosenPart = spareParts.find(p => String(p.Part_ID || p.id) === String(partId));
    if (chosenPart && (chosenPart.Quantity_In_Stock ?? chosenPart.quantity ?? 0) === 0) {
      toast.error('Selected part is out of stock');
      return;
    }
    if (chosenPart && Number(partQty) > (chosenPart.Quantity_In_Stock ?? chosenPart.quantity ?? 0)) {
      toast.error(`Requested quantity (${partQty}) exceeds available stock (${chosenPart.Quantity_In_Stock ?? chosenPart.quantity})`);
      return;
    }

    try {
      setAddingPart(true);
      await mechanicApi.logPart(selectedJob.Request_ID, Number(partId), Number(partQty));
      toast.success('Part added to job and stock deducted');
      setPartId('');
      setPartQty(1);
      const [refreshed, partsRes] = await Promise.all([
        requestApi.getById(selectedJob.Request_ID),
        inventoryApi.getMechanicJobOptions(selectedJob.Request_ID).catch(() => null)
      ]);
      setSelectedJob(refreshed.request);
      if (partsRes) {
        setJobPartsOptions(partsRes);
        setSpareParts(partsRes.parts || []);
      }
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Stock deduction failed');
      // If shortage, refresh to see status change
      if (err.response?.data?.code === 'INSUFFICIENT_STOCK') {
        const refreshed = await requestApi.getById(selectedJob.Request_ID);
        setSelectedJob(refreshed.request);
        fetchJobs();
      }
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (partUsedId) => {
    try {
      await mechanicApi.removePart(selectedJob.Request_ID, partUsedId);
      toast.success('Part removed and stock replenished');
      const [refreshed, partsRes] = await Promise.all([
        requestApi.getById(selectedJob.Request_ID),
        inventoryApi.getMechanicJobOptions(selectedJob.Request_ID).catch(() => null)
      ]);
      setSelectedJob(refreshed.request);
      if (partsRes) {
        setJobPartsOptions(partsRes);
        setSpareParts(partsRes.parts || []);
      }
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove part');
    }
  };

  const handleAddLabour = async (e) => {
    e.preventDefault();
    if (!labourDesc.trim() || !labourHours) {
      toast.error('Description and hours are required');
      return;
    }
    try {
      setAddingLabour(true);
      await mechanicApi.logLabour(selectedJob.Request_ID, {
        description: labourDesc,
        hours: Number(labourHours),
        rate_per_hour: Number(labourRate),
        repair_notes: labourNotes
      });
      toast.success('Labour hours recorded successfully');
      setLabourDesc('');
      setLabourNotes('');
      const refreshed = await requestApi.getById(selectedJob.Request_ID);
      setSelectedJob(refreshed.request);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log labour');
    } finally {
      setAddingLabour(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!selectedJob) return;

    if (!selectedJob.Labour_Entries || selectedJob.Labour_Entries.length === 0) {
      toast.error('At least one labour entry must be logged before completing.');
      return;
    }

    if (!noPartsUsed && (!selectedJob.Parts_Used || selectedJob.Parts_Used.length === 0)) {
      toast.error('Parts must be recorded or check "No parts used" confirmation.');
      return;
    }

    try {
      setCompleting(true);
      const res = await mechanicApi.completeJob(selectedJob.Request_ID, {
        no_parts_used: noPartsUsed,
        discount: 0.0
      });
      toast.success(`Job completed! Invoice ${res.invoice?.Invoice_Number} generated.`);
      setDrawerOpen(false);
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not complete job');
    } finally {
      setCompleting(false);
    }
  };

  // Grouping and filtering
  const activeJobs = jobs.filter(j => ['Assigned', 'In Progress', 'Awaiting Parts'].includes(j.Status));
  const completedJobs = jobs.filter(j => j.Status === 'Completed');

  const filteredJobs = activeTab === 'ALL'
    ? jobs
    : activeTab === 'ACTIVE'
    ? activeJobs
    : jobs.filter(j => j.Status === activeTab);

  return (
    <DashboardLayout
      title="Mechanic Workbench"
      subtitle="Execute authorized work orders, manage spare parts consumption, and complete inspections"
    >
      <div className="space-y-6">
        {/* KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Assigned To Me"
            value={jobs.length}
            subtitle="Total assigned work orders"
            icon={Wrench}
            color="teal"
          />
          <StatCard
            title="Active In-Bay Jobs"
            value={activeJobs.length}
            subtitle="Currently under repair"
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Completed Jobs"
            value={completedJobs.length}
            subtitle="Billed & signed off"
            icon={CheckCircle2}
            color="teal"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'ACTIVE', 'Assigned', 'In Progress', 'Awaiting Parts', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink font-bold shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab === 'ACTIVE' ? `Active Jobs (${activeJobs.length})` : tab}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            title="No assigned jobs found"
            description="You do not have any active service jobs matching this status tab."
            icon={Wrench}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <Card
                key={job.Request_ID}
                hoverEffect
                className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-soft"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      Work Order #{job.Request_ID}
                    </span>
                    <StatusBadge status={job.Status} />
                    {job.Urgency === 'Urgent' && (
                      <Badge variant="rose" size="sm">Urgent Priority</Badge>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      Slot: {job.Slot?.Date} • {job.Slot?.Start_Time}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      {job.Vehicle?.Make} {job.Vehicle?.Model} ({job.Vehicle?.Year})
                    </h4>
                    {job.Vehicle && (
                      <NumberPlate registrationNumber={job.Vehicle.Registration_Number} size="sm" />
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4">
                    <span>Customer: <strong className="text-slate-800 dark:text-slate-200">{job.Customer_Name}</strong> ({job.Customer_Phone})</span>
                    <span>Fuel: <strong>{job.Vehicle?.Fuel_Type}</strong></span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 italic bg-slate-50 dark:bg-slate-850 p-2 rounded-xl">
                    "{job.Problem_Description || "Routine periodic vehicle service"}"
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenJobDrawer(job)}
                    icon={Wrench}
                  >
                    Open Workbench
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MECHANIC JOB DETAIL DRAWER */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="max-w-2xl"
        title={selectedJob ? `Job #${selectedJob.Request_ID} Workbench` : "Job Detail"}
        subtitle={selectedJob ? `${selectedJob.Vehicle?.Make} ${selectedJob.Vehicle?.Model} (${selectedJob.Vehicle?.Registration_Number})` : ""}
      >
        {selectedJob && (
          <div className="space-y-6 pb-8">
            {/* Customer & Vehicle Card */}
            <div className="p-4 rounded-2xl bg-teal-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-300 font-bold uppercase tracking-wider">Vehicle in Bay</p>
                <h4 className="text-lg font-bold">{selectedJob.Vehicle?.Make} {selectedJob.Vehicle?.Model} ({selectedJob.Vehicle?.Year})</h4>
                <p className="text-xs text-teal-200 mt-1">
                  Customer: {selectedJob.Customer_Name} • {selectedJob.Customer_Phone}
                </p>
              </div>
              <StatusBadge status={selectedJob.Status} />
            </div>

            {/* Reported Problem Card (Symptoms, Urgency, Photos) */}
            <div className="p-4 rounded-2xl bg-yellow-tint/20 dark:bg-yellow-signal/5 border border-yellow-signal/30 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-ink dark:text-yellow-signal tracking-wider text-[10px]">
                  Driver Reported Issue
                </span>
                <Badge variant={selectedJob.Urgency === 'Urgent' ? 'rose' : 'teal'} size="sm">
                  {selectedJob.Urgency}
                </Badge>
              </div>

              {selectedJob.Problem_Categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.Problem_Categories.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-yellow-signal text-ink font-bold text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {selectedJob.Problem_Description && (
                <p className="italic text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl">
                  "{selectedJob.Problem_Description}"
                </p>
              )}

              {selectedJob.Attachments?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-yellow-signal/20">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Diagnostic Photos:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedJob.Attachments.map(att => (
                      <a
                        key={att.Attachment_ID}
                        href={requestApi.getAttachmentUrl(selectedJob.Request_ID, att.Attachment_ID)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg overflow-hidden border border-slate-300 aspect-video block"
                      >
                        <img
                          src={requestApi.getAttachmentUrl(selectedJob.Request_ID, att.Attachment_ID)}
                          alt={att.Filename}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LEGAL STATUS ACTION CONTROLS */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Legal Status Transitions
              </span>

              <div className="flex flex-wrap gap-2">
                {selectedJob.Status === 'Assigned' && (
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => handleUpdateStatus('In Progress')}
                  >
                    ▶ Start Work (Move to In Progress)
                  </Button>
                )}

                {selectedJob.Status === 'In Progress' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus('Awaiting Parts')}
                  >
                    ⏸ Mark Awaiting Parts
                  </Button>
                )}

                {selectedJob.Status === 'Awaiting Parts' && (
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => handleUpdateStatus('In Progress')}
                  >
                    ▶ Resume Work (Move to In Progress)
                  </Button>
                )}
              </div>
            </div>

            {/* PARTS USED MANAGER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Spare Parts Used ({selectedJob.Parts_Used?.length || 0})
                </span>
              </div>

              {/* List of used parts */}
              {selectedJob.Parts_Used?.length > 0 ? (
                <div className="space-y-2">
                  {selectedJob.Parts_Used.map(pu => (
                    <div
                      key={pu.ID}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {pu.sku && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              {pu.sku}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">{pu.Part_Name}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] mt-0.5 block">
                          Qty: {pu.Quantity} {pu.unit || 'piece'} × ₹{pu.Unit_Price_At_Time}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">₹{pu.Total_Price.toFixed(2)}</span>
                        {selectedJob.Status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleRemovePart(pu.ID)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Remove part and restore stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No spare parts recorded on this work order yet.</p>
              )}

              {/* Add Part Form */}
              {selectedJob.Status !== 'Completed' && (() => {
                const chosenPartObj = spareParts.find(p => String(p.Part_ID || p.id) === String(partId));
                const searchFilter = (part) => {
                  if (!partSearch.trim()) return true;
                  const q = partSearch.trim().toLowerCase();
                  return (part.Name || part.name || '').toLowerCase().includes(q) ||
                         (part.sku || part.SKU || '').toLowerCase().includes(q);
                };

                const suggestedList = (jobPartsOptions?.suggested_parts || []).filter(searchFilter);
                const categoryGroups = jobPartsOptions?.categories || {};

                return (
                  <form onSubmit={handleAddPart} className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-3">
                    <div className="space-y-2">
                      {/* Search filter for picker */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filter catalog by SKU or component name..."
                          value={partSearch}
                          onChange={e => setPartSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-700 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                            Select Spare Part
                          </label>
                          <select
                            value={partId}
                            onChange={(e) => {
                              setPartId(e.target.value);
                              setPartQty(1);
                            }}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium"
                          >
                            <option value="">-- Choose Spare Part --</option>
                            {/* Suggested for this job */}
                            {suggestedList.length > 0 && (
                              <optgroup label="✨ Suggested For This Job">
                                {suggestedList.map(p => {
                                  const q = p.Quantity_In_Stock ?? p.quantity ?? 0;
                                  const isOut = q === 0;
                                  return (
                                    <option
                                      key={`sug-${p.Part_ID || p.id}`}
                                      value={String(p.Part_ID || p.id)}
                                      disabled={isOut}
                                    >
                                      {isOut ? '[Out of stock] ' : '⭐ '}
                                      {p.sku ? `[${p.sku}] ` : ''}{p.Name || p.name} — ₹{p.Price} / {p.unit || 'piece'} ({q} in stock)
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}

                            {/* Grouped by category */}
                            {Object.entries(categoryGroups).map(([catName, catParts]) => {
                              const filteredCatParts = catParts.filter(searchFilter);
                              if (filteredCatParts.length === 0) return null;
                              return (
                                <optgroup key={catName} label={`📂 ${catName}`}>
                                  {filteredCatParts.map(p => {
                                    const q = p.Quantity_In_Stock ?? p.quantity ?? 0;
                                    const isOut = q === 0;
                                    return (
                                      <option
                                        key={p.Part_ID || p.id}
                                        value={String(p.Part_ID || p.id)}
                                        disabled={isOut}
                                      >
                                        {isOut ? '[Out of stock] ' : ''}
                                        {p.sku ? `[${p.sku}] ` : ''}{p.Name || p.name} — ₹{p.Price} / {p.unit || 'piece'} ({q} in stock)
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            max={chosenPartObj ? (chosenPartObj.Quantity_In_Stock ?? chosenPartObj.quantity ?? 1) : 20}
                            value={partQty}
                            onChange={(e) => setPartQty(e.target.value)}
                          />
                        </div>
                      </div>

                      {chosenPartObj && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl font-mono">
                          <span>
                            Available Stock: <strong className={(chosenPartObj.Quantity_In_Stock ?? chosenPartObj.quantity ?? 0) === 0 ? 'text-red-500' : 'text-emerald-600'}>
                              {chosenPartObj.Quantity_In_Stock ?? chosenPartObj.quantity ?? 0} {chosenPartObj.unit || 'units'}
                            </strong>
                          </span>
                          <span>Unit Price: <strong>₹{chosenPartObj.Price ?? chosenPartObj.price} / {chosenPartObj.unit || 'piece'}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={addingPart}
                        icon={Plus}
                        className="bg-[#065F5B] text-white"
                      >
                        Deduct & Log Part
                      </Button>
                    </div>
                  </form>
                );
              })()}
            </div>

            {/* LABOUR HOURS & NOTES MANAGER */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Labour Hours & Technician Notes ({selectedJob.Labour_Entries?.length || 0})
              </span>

              {/* List of labour entries */}
              {selectedJob.Labour_Entries?.length > 0 ? (
                <div className="space-y-2">
                  {selectedJob.Labour_Entries.map(l => (
                    <div
                      key={l.ID}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{l.Description}</span>
                        <span className="font-mono font-bold">₹{l.Total_Charge.toFixed(2)}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {l.Hours} hrs @ ₹{l.Rate_Per_Hour}/hr
                      </div>
                      {l.Repair_Notes && (
                        <p className="text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                          {l.Repair_Notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No labour logged yet. At least one entry is mandatory.</p>
              )}

              {/* Add Labour Form */}
              {selectedJob.Status !== 'Completed' && (
                <form onSubmit={handleAddLabour} className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-3">
                  <Input
                    label="Labour Task Description"
                    placeholder="e.g. Diagnostic scan & brake rotor calibration"
                    value={labourDesc}
                    onChange={(e) => setLabourDesc(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Hours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={labourHours}
                      onChange={(e) => setLabourHours(e.target.value)}
                      required
                    />
                    <Input
                      label="Hourly Rate (₹)"
                      type="number"
                      value={labourRate}
                      onChange={(e) => setLabourRate(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Repair Notes / Findings"
                    placeholder="Technical observations, torque specs, notes for customer..."
                    value={labourNotes}
                    onChange={(e) => setLabourNotes(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={addingLabour}
                      icon={Plus}
                    >
                      Record Labour
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* COMPLETION TRIGGER SECTION */}
            {selectedJob.Status !== 'Completed' && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      Sign Off & Complete Service Request
                    </h5>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed mt-0.5">
                      Completing the job automatically calculates total labour, spare parts, and 18% GST to generate an itemized invoice for the customer.
                    </p>
                  </div>
                </div>

                {/* No parts confirmation checkbox */}
                {(!selectedJob.Parts_Used || selectedJob.Parts_Used.length === 0) && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 cursor-pointer p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                    <input
                      type="checkbox"
                      checked={noPartsUsed}
                      onChange={(e) => setNoPartsUsed(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Explicitly confirm: "No spare parts were used for this job"</span>
                  </label>
                )}

                <Button
                  variant="primary"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  size="lg"
                  isLoading={completing}
                  onClick={handleCompleteJob}
                  icon={Check}
                >
                  Mark Completed & Generate Invoice
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
