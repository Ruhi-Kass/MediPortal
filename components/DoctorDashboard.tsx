
import React, { useState, useEffect, useMemo } from 'react';
import { User, EmergencyAlert, Inpatient, ScheduleItem, AdmissionStatus, MedicalBoardMeeting } from '../types';
import { 
  MapPin, Bell, CheckCircle, Hospital, User as UserIcon, Activity, Zap, 
  ShieldAlert, Clock, AlertTriangle, ChevronRight, Sparkles, Users, 
  Calendar, ClipboardList, Bed, LogOut, ArrowUpRight, Check, Plus, X, Edit3, 
  Megaphone, UserPlus, Briefcase, Fingerprint, CalendarDays, SortAsc, SortDesc, Filter, UserRound
} from 'lucide-react';

interface DoctorDashboardProps {
  user: User;
  activeAlerts: EmergencyAlert[];
  inpatients: Inpatient[];
  schedules: ScheduleItem[];
  boardMeetings: MedicalBoardMeeting[];
  onResolveAlert?: (id: string) => void;
  onAdmitPatient: (alert: EmergencyAlert) => void;
  onManualAdmit: (data: { name: string, status: AdmissionStatus, ward: string, bloodType: string, allergies: string, dob?: string, id?: string }) => void;
  onUpdateInpatientStatus: (id: string, status: AdmissionStatus) => void;
  onUpdateUser?: (updates: Partial<User>) => void;
  onCreateEmergency: (data: Omit<EmergencyAlert, 'id' | 'status' | 'timestamp' | 'medicalSummary'>) => void;
  onScheduleBoard: (meeting: Omit<MedicalBoardMeeting, 'id'>) => void;
}

type DashboardTab = 'SOS' | 'INPATIENTS' | 'SCHEDULE' | 'BOARD';
type ScheduleSortCriteria = 'TIME' | 'NAME' | 'TYPE';
type ScheduleTypeFilter = 'ALL' | 'CONSULTATION' | 'SURGERY' | 'ROUNDS' | 'BREAK';
type InpatientSortCriteria = 'DATE' | 'NAME';

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ 
  user, activeAlerts, inpatients, schedules, boardMeetings,
  onResolveAlert, onAdmitPatient, onManualAdmit, onUpdateInpatientStatus, 
  onUpdateUser, onCreateEmergency, onScheduleBoard
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('SOS');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [tempName, setTempName] = useState(user.name);
  
  // Census Registry Sort State
  const [inpatientSortBy, setInpatientSortBy] = useState<InpatientSortCriteria>('DATE');
  const [inpatientSortOrder, setInpatientSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Schedule Sort/Filter State
  const [scheduleSortBy, setScheduleSortBy] = useState<ScheduleSortCriteria>('TIME');
  const [scheduleSortOrder, setScheduleSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<ScheduleTypeFilter>('ALL');
  
  // Forms
  const [newPatient, setNewPatient] = useState({ name: '', status: AdmissionStatus.ADMITTED, ward: 'General Ward', bloodType: 'O+', allergies: 'None' });
  const [regPatient, setRegPatient] = useState({ name: '', dob: '', patientId: '' });
  const [emergencyReport, setEmergencyReport] = useState<Omit<EmergencyAlert, 'id' | 'status' | 'timestamp' | 'medicalSummary'>>({ patientName: '', age: '', sex: 'M', incidentType: '', patientId: 'GUEST' });
  const [boardForm, setBoardForm] = useState<Omit<MedicalBoardMeeting, 'id'>>({ title: '', date: '', time: '', specialty: '', participants: [] });

  useEffect(() => {
    setTempName(user.name);
  }, [user.name]);

  const handleProfileSave = () => {
    onUpdateUser?.({ name: tempName });
    setIsProfileEditing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onManualAdmit(newPatient);
    setShowAddPatientModal(false);
    setNewPatient({ name: '', status: AdmissionStatus.ADMITTED, ward: 'General Ward', bloodType: 'O+', allergies: 'None' });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onManualAdmit({
      name: regPatient.name,
      dob: regPatient.dob,
      id: regPatient.patientId,
      status: AdmissionStatus.ADMITTED,
      ward: 'Admission Hub',
      bloodType: 'Unknown',
      allergies: 'None'
    });
    setShowRegisterModal(false);
    setRegPatient({ name: '', dob: '', patientId: '' });
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateEmergency(emergencyReport);
    setShowEmergencyModal(false);
    setEmergencyReport({ patientName: '', age: '', sex: 'M', incidentType: '', patientId: 'GUEST' });
  };

  const handleBoardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onScheduleBoard(boardForm);
    setShowBoardModal(false);
    setBoardForm({ title: '', date: '', time: '', specialty: '', participants: [] });
  };

  const sortedInpatients = useMemo(() => {
    return [...inpatients].sort((a, b) => {
      let comparison = 0;
      if (inpatientSortBy === 'DATE') {
        comparison = new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
      } else {
        comparison = a.patientName.localeCompare(b.patientName);
      }
      return inpatientSortOrder === 'ASC' ? comparison : -comparison;
    });
  }, [inpatients, inpatientSortBy, inpatientSortOrder]);

  // Helper to parse time that may be "HH:MM AM" or "YYYY-MM-DD HH:MM AM"
  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(' ');
    // If includes a date prefix, take the time+modifier starting at index 1
    const time = parts.length >= 3 ? parts[1] : parts[0];
    const modifier = parts.length >= 3 ? parts[2] : parts[1];
    let [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const filteredAndSortedSchedules = useMemo(() => {
    return [...schedules]
      .filter(s => scheduleTypeFilter === 'ALL' || s.type === scheduleTypeFilter)
      .sort((a, b) => {
        let comparison = 0;
        if (scheduleSortBy === 'TIME') {
          comparison = parseTime(a.time) - parseTime(b.time);
        } else if (scheduleSortBy === 'NAME') {
          comparison = (a.patientName || '').localeCompare(b.patientName || '');
        } else if (scheduleSortBy === 'TYPE') {
          comparison = a.type.localeCompare(b.type);
        }
        return scheduleSortOrder === 'ASC' ? comparison : -comparison;
      });
  }, [schedules, scheduleSortBy, scheduleSortOrder, scheduleTypeFilter]);

  const toggleInpatientSort = (criteria: InpatientSortCriteria) => {
    if (inpatientSortBy === criteria) {
      setInpatientSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setInpatientSortBy(criteria);
      setInpatientSortOrder('ASC');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-top-4 duration-700 pb-20">
      
      {/* Modals */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEmergencyModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Megaphone className="text-red-500 w-6 h-6" /> Broadcast Emergency</h3>
            <form onSubmit={handleEmergencySubmit} className="space-y-4">
              <input type="text" placeholder="Patient Name" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={emergencyReport.patientName} onChange={e => setEmergencyReport({...emergencyReport, patientName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Age" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={emergencyReport.age} onChange={e => setEmergencyReport({...emergencyReport, age: e.target.value})} />
                <select className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={emergencyReport.sex} onChange={e => setEmergencyReport({...emergencyReport, sex: e.target.value as any})}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <input type="text" placeholder="Incident Type (e.g. Stroke)" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={emergencyReport.incidentType} onChange={e => setEmergencyReport({...emergencyReport, incidentType: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Emit Signal</button>
            </form>
          </div>
        </div>
      )}

      {showBoardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBoardModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Briefcase className="text-royal-blue w-6 h-6" /> Schedule Board</h3>
            <form onSubmit={handleBoardSubmit} className="space-y-4">
              <input type="text" placeholder="Meeting Title" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={boardForm.title} onChange={e => setBoardForm({...boardForm, title: e.target.value})} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={boardForm.date} onChange={e => setBoardForm({...boardForm, date: e.target.value})} />
                <input type="time" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={boardForm.time} onChange={e => setBoardForm({...boardForm, time: e.target.value})} />
              </div>
              <input type="text" placeholder="Clinical Specialty" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={boardForm.specialty} onChange={e => setBoardForm({...boardForm, specialty: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-royal-blue text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Lock Meeting</button>
            </form>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-royal-blue/60 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 md:mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><UserPlus className="text-royal-blue w-7 h-7 md:w-8 md:h-8" /> Registration</h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Onboard new patient to clinical census.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                <div className="relative">
                  <input type="text" placeholder="Johnathan Doe" required className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-royal-blue transition-all" value={regPatient.name} onChange={e => setRegPatient({...regPatient, name: e.target.value})} />
                  <UserIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                  <div className="relative">
                    <input type="date" required className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-royal-blue transition-all" value={regPatient.dob} onChange={e => setRegPatient({...regPatient, dob: e.target.value})} />
                    <CalendarDays className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Patient ID</label>
                  <div className="relative">
                    <input type="text" placeholder="MP-XXXX" required className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-royal-blue transition-all" value={regPatient.patientId} onChange={e => setRegPatient({...regPatient, patientId: e.target.value})} />
                    <Fingerprint className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 md:py-5 gradient-blue text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                Finalize Enrollment <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddPatientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddPatientModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Bed className="text-royal-blue w-6 h-6" /> Fast-Track Admission</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4 md:space-y-6">
              <input type="text" placeholder="Legal Name" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={newPatient.status} onChange={e => setNewPatient({...newPatient, status: e.target.value as any})}>
                  <option value={AdmissionStatus.ON_THE_WAY}>Expected</option>
                  <option value={AdmissionStatus.ADMITTED}>In-Ward</option>
                </select>
                <input type="text" placeholder="Ward ID" required className="w-full px-5 py-3 md:py-4 rounded-xl bg-slate-50 border border-slate-100 font-bold" value={newPatient.ward} onChange={e => setNewPatient({...newPatient, ward: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 gradient-blue text-white rounded-xl font-black uppercase tracking-widest shadow-xl">Complete Registration</button>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
             <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hospital Command Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">Command Grid</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Station: <span className="text-royal-blue font-bold">ALPHA-7</span> • Attending: <span className="font-bold">Dr. {user.name}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setShowEmergencyModal(true)} className="flex items-center justify-center gap-3 px-6 py-3.5 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-200 hover:scale-105 active:scale-95 transition-all">
            <Megaphone className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Report Emergency</span>
          </button>
          <div className="flex items-center justify-center gap-4 px-6 py-3 bg-royal-blue text-white rounded-2xl shadow-xl shadow-blue-900/20">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
            <div className="flex flex-col items-start">
              <span className="text-[8px] md:text-[9px] font-black text-blue-200 uppercase tracking-widest">Local Time</span>
              <span className="text-xs font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
        <TabButton active={activeTab === 'SOS'} onClick={() => setActiveTab('SOS')} icon={<Bell className="w-4 h-4" />} label="SOS" count={activeAlerts.length} urgent={activeAlerts.length > 0} />
        <TabButton active={activeTab === 'INPATIENTS'} onClick={() => setActiveTab('INPATIENTS')} icon={<Bed className="w-4 h-4" />} label="Census" count={inpatients.length} />
        <TabButton active={activeTab === 'SCHEDULE'} onClick={() => setActiveTab('SCHEDULE')} icon={<Calendar className="w-4 h-4" />} label="Schedule" />
        <TabButton active={activeTab === 'BOARD'} onClick={() => setActiveTab('BOARD')} icon={<Briefcase className="w-4 h-4" />} label="Board" count={boardMeetings.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden group">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => isProfileEditing ? handleProfileSave() : setIsProfileEditing(true)} className={`p-2 rounded-xl transition-all ${isProfileEditing ? 'bg-royal-blue text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-royal-blue'}`}>
                {isProfileEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <UserIcon className="text-royal-blue w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                {isProfileEditing ? (
                  <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full px-2 py-1 rounded-lg bg-slate-50 border border-royal-blue/30 focus:border-royal-blue outline-none font-bold text-xs text-slate-900" />
                ) : (
                  <>
                    <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tight truncate">Dr. {user.name}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest">Medical Staff</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <StatCard title="Active Census" value={inpatients.filter(p => p.status !== AdmissionStatus.DISCHARGED).length} subtitle="In-Ward Patients" color="bg-royal-blue" icon={<Users className="text-white w-5 h-5 md:w-6 md:h-6" />} />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px] md:min-h-[600px]">
            {activeTab === 'SOS' && (
              <div className="divide-y divide-slate-50">
                {activeAlerts.map(alert => <AlertItem key={alert.id} alert={alert} onAdmit={() => onAdmitPatient(alert)} onResolve={() => onResolveAlert?.(alert.id)} />)}
                {activeAlerts.length === 0 && <EmptyState icon={<CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-slate-200" />} title="Feed Clear" description="No active emergencies." />}
              </div>
            )}
            
            {activeTab === 'BOARD' && (
              <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Board Oversight</h3>
                  <button onClick={() => setShowBoardModal(true)} className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-royal-blue hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Schedule Review
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {boardMeetings.map(m => (
                    <div key={m.id} className="p-5 md:p-6 rounded-[1.5rem] md:rounded-3xl bg-slate-50 border border-transparent hover:border-royal-blue/20 hover:bg-white transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2 md:px-3 py-1 bg-blue-100 text-royal-blue rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest">{m.specialty}</span>
                        <span className="text-[10px] font-black text-slate-400">{m.date}</span>
                      </div>
                      <h4 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-2">{m.title}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[1,2,3].map(i => <div key={i} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-200 border-2 border-white" />)}
                        </div>
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400">Board Participants</span>
                      </div>
                    </div>
                  ))}
                  {boardMeetings.length === 0 && <p className="text-slate-400 italic text-sm text-center py-10">No board reviews scheduled.</p>}
                </div>
              </div>
            )}

            {activeTab === 'INPATIENTS' && (
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center flex-wrap gap-3">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Census</h3>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => toggleInpatientSort('DATE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${inpatientSortBy === 'DATE' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <CalendarDays className="w-3 h-3" /> Date
                        {inpatientSortBy === 'DATE' && (inpatientSortOrder === 'ASC' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                      <button 
                        onClick={() => toggleInpatientSort('NAME')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${inpatientSortBy === 'NAME' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <UserRound className="w-3 h-3" /> Name
                        {inpatientSortBy === 'NAME' && (inpatientSortOrder === 'ASC' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => setShowRegisterModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" /> Register
                    </button>
                    <button onClick={() => setShowAddPatientModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-royal-blue text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                      <Bed className="w-3.5 h-3.5" /> Admit
                    </button>
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4">
                  {sortedInpatients.map(p => (
                    <div key={p.id} className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white border border-transparent hover:border-slate-100 transition-all shadow-sm">
                      <div className="flex items-center gap-3 md:gap-4">
                         <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                           <UserIcon className="text-slate-300 w-4 h-4 md:w-5 md:h-5" />
                         </div>
                         <div className="min-w-0">
                          <h5 className="font-black text-slate-900 truncate text-sm md:text-base">{p.patientName}</h5>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id.slice(0,8)}</p>
                            <span className="hidden sm:inline text-slate-300 text-[8px]">•</span>
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ward: {p.ward}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                         <p className="sm:hidden text-[8px] font-bold text-slate-400 uppercase tracking-widest">Adm: {new Date(p.admissionDate).toLocaleDateString()}</p>
                         <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                  {inpatients.length === 0 && (
                    <EmptyState icon={<ClipboardList className="w-10 h-10 md:w-12 md:h-12 text-slate-200" />} title="Census Empty" description="No patients currently registered." />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'SCHEDULE' && (
              <div className="p-6 md:p-8 space-y-8">
                 <div className="flex flex-col gap-6">
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                     <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Clinical Agenda</h3>
                     <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                          <SortAsc className="w-3 h-3" /> Sort By:
                        </span>
                        {(['TIME', 'NAME', 'TYPE'] as ScheduleSortCriteria[]).map(criteria => (
                          <button 
                            key={criteria} 
                            onClick={() => {
                              if (scheduleSortBy === criteria) {
                                setScheduleSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setScheduleSortBy(criteria);
                                setScheduleSortOrder('ASC');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${scheduleSortBy === criteria ? 'bg-royal-blue text-white border-royal-blue shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                          >
                            {criteria}
                            {scheduleSortBy === criteria && (scheduleSortOrder === 'ASC' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                          </button>
                        ))}
                     </div>
                   </div>

                   {/* Filter Buttons Section */}
                   <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                      <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1 px-2">
                        <Filter className="w-3 h-3" /> Filter:
                      </span>
                      {(['ALL', 'CONSULTATION', 'SURGERY', 'ROUNDS', 'BREAK'] as ScheduleTypeFilter[]).map(type => (
                        <button 
                          key={type} 
                          onClick={() => setScheduleTypeFilter(type)}
                          className={`px-3 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${scheduleTypeFilter === type ? 'bg-royal-blue text-white border-royal-blue shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                 </div>

                 <div className="space-y-3 md:space-y-4">
                   {filteredAndSortedSchedules.map(s => (
                     <div key={s.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white transition-all">
                       <div className="flex items-start gap-4">
                         <div className="pt-1.5 flex flex-col items-center flex-shrink-0">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Start</span>
                            <span className="text-[10px] md:text-xs font-black text-royal-blue uppercase tracking-widest">{s.time.split(' ')[0]}</span>
                            <span className="text-[8px] font-black text-royal-blue uppercase">{s.time.split(' ')[1]}</span>
                         </div>
                         <div className="min-w-0">
                           <h4 className="text-base md:text-lg font-black text-slate-900 leading-tight truncate">{s.title}</h4>
                           <div className="flex flex-wrap items-center gap-2 mt-0.5">
                             <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">{s.location}</p>
                             {s.patientName && (
                               <>
                                 <span className="text-slate-300 text-[10px]">•</span>
                                 <p className="text-[10px] md:text-xs font-bold text-royal-blue uppercase tracking-widest truncate">{s.patientName}</p>
                               </>
                             )}
                             {/* Show doctor name if provided on schedule item via parent mapping */}
                             {(s as any).doctorName && (
                               <>
                                 <span className="text-slate-300 text-[10px]">•</span>
                                 <p className="text-[10px] md:text-xs font-medium text-slate-500 truncate">Dr. {(s as any).doctorName}</p>
                               </>
                             )}
                           </div>
                         </div>
                       </div>
                       <span className={`px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest self-start sm:self-center border ${
                         s.type === 'SURGERY' ? 'bg-red-50 text-red-600 border-red-100' : 
                         s.type === 'CONSULTATION' ? 'bg-blue-50 text-royal-blue border-blue-100' :
                         s.type === 'ROUNDS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         'bg-slate-100 text-slate-500 border-slate-200'
                       }`}>
                         {s.type}
                       </span>
                     </div>
                   ))}
                   {filteredAndSortedSchedules.length === 0 && (
                     <EmptyState icon={<Calendar className="w-10 h-10 md:w-12 md:h-12 text-slate-200" />} title="Agenda Empty" description="No scheduled events match the current filters." />
                   )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Components
const TabButton: React.FC<{active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number; urgent?: boolean}> = ({active, onClick, icon, label, count, urgent}) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-white text-royal-blue shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
    {icon} <span>{label}</span>
    {count !== undefined && <span className={`ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full text-[8px] md:text-[10px] ${active ? 'bg-royal-blue text-white' : 'bg-slate-200 text-slate-500'} ${urgent && !active ? 'bg-red-500 text-white animate-pulse' : ''}`}>{count}</span>}
  </button>
);

const StatCard: React.FC<{title: string; value: string | number; subtitle: string; color: string; icon: React.ReactNode}> = ({title, value, subtitle, color, icon}) => (
  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex lg:flex-col items-center lg:items-start gap-4 lg:gap-6 hover:shadow-xl transition-all duration-500 group">
    <div className={`w-12 h-12 md:w-16 md:h-16 ${color} rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 flex-shrink-0`}>{icon}</div>
    <div className="space-y-0.5 lg:space-y-1 min-w-0">
      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter truncate">{value}</p>
      <p className="text-[9px] md:text-[10px] text-slate-400 font-bold truncate">{subtitle}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{status: AdmissionStatus}> = ({status}) => {
  const styles = { [AdmissionStatus.ON_THE_WAY]: "bg-blue-50 text-royal-blue", [AdmissionStatus.ADMITTED]: "bg-emerald-50 text-emerald-600", [AdmissionStatus.DISCHARGED]: "bg-slate-100 text-slate-400" };
  return <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
};

const AlertItem: React.FC<{alert: EmergencyAlert; onAdmit: () => void; onResolve: () => void}> = ({alert, onAdmit, onResolve}) => (
  <div className="p-5 md:p-8 hover:bg-slate-50/80 transition-all group">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0"><Megaphone className="text-red-600 w-6 h-6 md:w-8 md:h-8" /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight truncate">{alert.patientName}</h4>
            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[7px] md:text-[8px] font-black uppercase">URGENT</span>
          </div>
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase mt-0.5 truncate">{alert.age}yr • {alert.sex} • Incident: {alert.incidentType}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onAdmit} className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-royal-blue text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg">Admit</button>
        <button onClick={onResolve} className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-white text-slate-400 border border-slate-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">Clear</button>
      </div>
    </div>
  </div>
);

const EmptyState: React.FC<{icon: React.ReactNode; title: string; description: string}> = ({icon, title, description}) => (
  <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-6">
    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 md:mb-6">{icon}</div>
    <h4 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{title}</h4>
    <p className="text-xs md:text-sm text-slate-500 max-w-[200px] md:max-w-xs mx-auto mt-2 font-medium">{description}</p>
  </div>
);

export default DoctorDashboard;
