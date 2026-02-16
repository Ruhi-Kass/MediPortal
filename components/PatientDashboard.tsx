
import React, { useState, useRef, useEffect } from 'react';
import { User, MedicalRecord, HistoryItem, Prescription, PharmacyItem, EmergencyAlert, ScheduleItem } from '../types';
import { 
  FileText, MapPin, AlertCircle, Save, Clock, Thermometer, Activity, 
  History, ChevronDown, ChevronUp, BriefcaseMedical, Plus, Trash2, X, 
  AlertTriangle, Camera, RefreshCw, Check, Sparkles, Info, Calendar, 
  ExternalLink, User as UserIcon, Tag, Pill, ShoppingBag, Send, Phone, Map,
  Hospital, Edit3, CalendarDays, ClipboardList, Bookmark, Megaphone, ShieldAlert,
  Stethoscope
} from 'lucide-react';
import { analyzeSymptoms } from '../services/geminiService';
import { api } from '../services/api';

interface PatientDashboardProps {
  user: User;
  onUpdateRecord: (record: MedicalRecord) => void;
  onUpdateUser: (updates: Partial<User>) => void;
  globalPharmacyStock?: PharmacyItem[];
  onCreateEmergency?: (data: Omit<EmergencyAlert, 'id' | 'status' | 'timestamp' | 'medicalSummary'>) => void;
  onBookAppointment?: (booking: Omit<ScheduleItem, 'id'>) => void;
  myAppointments?: ScheduleItem[];
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ 
  user, onUpdateRecord, onUpdateUser, globalPharmacyStock, onCreateEmergency, 
  onBookAppointment, myAppointments 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [tempName, setTempName] = useState(user.name);
  
  // History Form State
  const [newHistory, setNewHistory] = useState({
    event: '',
    date: new Date().toISOString().split('T')[0],
    visitType: 'Consultation',
    details: ''
  });

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM',
    location: 'Main Clinic - Wing A',
    doctorId: '' as string
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Doctors list for booking
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setTempName(user.name);
  }, [user.name]);

  useEffect(() => {
    // Load available doctors
    (async () => {
      try {
        const list = await api.getDoctors();
        setDoctors(list);
        if (list.length > 0) {
          setBookingData(prev => ({ ...prev, doctorId: list[0].id }));
        }
      } catch (e) {
        console.error('Failed to load doctors', e);
      }
    })();
  }, []);

  const handleProfileSave = () => {
    onUpdateUser({ name: tempName });
    setIsProfileEditing(false);
  };

  const [formData, setFormData] = useState<MedicalRecord>(user.medicalRecord || {
    bloodType: 'Unknown',
    allergies: 'None',
    conditions: 'None',
    medications: 'None',
    lastUpdated: new Date().toISOString(),
    medicalHistory: [],
    prescriptions: []
  });

  useEffect(() => {
    if (user.medicalRecord) setFormData(user.medicalRecord);
  }, [user.medicalRecord]);

  const handleSave = () => {
    const updatedTimestamp = new Date().toISOString();
    const updatedRecord = { ...formData, lastUpdated: updatedTimestamp };
    setFormData(updatedRecord);
    onUpdateRecord(updatedRecord);
    setIsEditing(false);
  };

  const handleAddHistory = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...newHistory
    };
    const updatedHistory = [entry, ...(formData.medicalHistory || [])];
    const updatedRecord = { ...formData, medicalHistory: updatedHistory, lastUpdated: new Date().toISOString() };
    setFormData(updatedRecord);
    onUpdateRecord(updatedRecord);
    setShowHistoryModal(false);
    setNewHistory({ event: '', date: new Date().toISOString().split('T')[0], visitType: 'Consultation', details: '' });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onBookAppointment) {
      const prettyTime = `${bookingData.date} ${bookingData.time}`;
      // Send to parent (UI state) for immediate feedback if needed
      onBookAppointment({
        title: bookingData.title,
        time: prettyTime,
        type: 'CONSULTATION',
        patientName: user.name,
        location: bookingData.location
      });
    }

    // Persist to Supabase using services API
    try {
      const prettyTime = `${bookingData.date} ${bookingData.time}`;
      if (!bookingData.doctorId) {
        alert('Please select a doctor');
        return;
      }
      await api.createSchedule(
        {
          title: bookingData.title,
          time: prettyTime,
          type: 'CONSULTATION',
          patientName: user.name,
          location: bookingData.location
        },
        bookingData.doctorId,
        user.id
      );
      setShowBookingModal(false);
      setBookingData({ title: '', date: new Date().toISOString().split('T')[0], time: '09:00 AM', location: 'Main Clinic - Wing A', doctorId: doctors[0]?.id || '' });
    } catch (err) {
      console.error('Failed to create schedule', err);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const handleDeleteHistory = (id: string) => {
    const updatedHistory = (formData.medicalHistory || []).filter(item => item.id !== id);
    const updatedRecord = { ...formData, medicalHistory: updatedHistory, lastUpdated: new Date().toISOString() };
    setFormData(updatedRecord);
    onUpdateRecord(updatedRecord);
  };

  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setIsAnalyzing(true);
    const insight = await analyzeSymptoms(symptoms, formData);
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  const handleConfirmSOS = () => {
    if (onCreateEmergency) {
      onCreateEmergency({
        patientName: user.name,
        patientId: user.id,
        age: 'Self-Reported',
        sex: 'Other',
        incidentType: 'Patient Triggered SOS'
      });
      setShowSOSConfirm(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCameraModal(true);
    } catch (err) {
      alert("Please allow camera access.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 512;
        canvas.height = 512;
        context.translate(512, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, 512, 512);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        onUpdateUser({ photo: photoData });
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        setShowCameraModal(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* SOS Confirmation Modal */}
      {showSOSConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowSOSConfirm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600 w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Emergency Alert</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Are you sure you want to send an emergency alert? <br />
              <span className="text-red-600 font-black">This action cannot be undone.</span>
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmSOS}
                className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Confirm Alert
              </button>
              <button 
                onClick={() => setShowSOSConfirm(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-royal-blue/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowBookingModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Stethoscope className="text-royal-blue w-7 h-7 md:w-8 md:h-8" /> Book Consultation
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Schedule time with our medical team.</p>
              </div>
              <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reason for Visit</label>
                <input required type="text" placeholder="e.g. Chronic Pain Consultation" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={bookingData.title} onChange={e => setBookingData({...bookingData, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preferred Date</label>
                  <input required type="date" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preferred Time</label>
                  <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})}>
                    <option>09:00 AM</option>
                    <option>10:00 AM</option>
                    <option>11:00 AM</option>
                    <option>01:00 PM</option>
                    <option>02:00 PM</option>
                    <option>03:00 PM</option>
                    <option>04:00 PM</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Location</label>
                <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={bookingData.location} onChange={e => setBookingData({...bookingData, location: e.target.value})}>
                  <option>Main Clinic - Wing A</option>
                  <option>Specialist Center - Floor 2</option>
                  <option>Telehealth - Remote Video</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Doctor</label>
                <select
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  value={bookingData.doctorId}
                  onChange={e => setBookingData({ ...bookingData, doctorId: e.target.value })}
                >
                  {doctors.length === 0 && <option value="">No doctors available</option>}
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-5 gradient-blue text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:-translate-y-1 transition-all">
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-royal-blue/90 backdrop-blur-md animate-in fade-in duration-300" />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-square object-cover rounded-2xl md:rounded-3xl mb-6 bg-black" />
            <button onClick={capturePhoto} className="w-full py-3 md:py-4 gradient-blue text-white rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-3">
              <Camera className="w-5 h-5 md:w-6 md:h-6" /> Take Profile Photo
            </button>
            <button onClick={() => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); setShowCameraModal(false); }} className="absolute -top-4 -right-4 bg-white p-2 rounded-full shadow-lg">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* History Entry Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowHistoryModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 md:mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><History className="text-royal-blue w-7 h-7 md:w-8 md:h-8" /> New Entry</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Add a record to your medical timeline.</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddHistory} className="space-y-4 md:space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Event Title</label>
                <input required type="text" placeholder="e.g. Annual Checkup" className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={newHistory.event} onChange={e => setNewHistory({...newHistory, event: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input required type="date" className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={newHistory.date} onChange={e => setNewHistory({...newHistory, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visit Type</label>
                  <select className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={newHistory.visitType} onChange={e => setNewHistory({...newHistory, visitType: e.target.value})}>
                    <option value="Consultation">Consultation</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Lab Test">Lab Test</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medical Details</label>
                <textarea rows={3} placeholder="Summarize your visit..." className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none" value={newHistory.details} onChange={e => setNewHistory({...newHistory, details: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 md:py-5 gradient-blue text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:-translate-y-1 transition-all">
                Append to History
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Profile, SOS, and Symptom Intake */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5 relative overflow-hidden group">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => isProfileEditing ? handleProfileSave() : setIsProfileEditing(true)}
                className={`p-2 rounded-xl transition-all ${isProfileEditing ? 'bg-royal-blue text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-royal-blue'}`}
              >
                {isProfileEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-3xl bg-slate-50 border-4 border-white shadow-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform" onClick={startCamera}>
              {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-6 md:p-8 text-slate-200" />}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>

            <div className="text-center space-y-1">
              {isProfileEditing ? (
                <div className="space-y-2 px-2 md:px-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left px-1">Display Name</label>
                   <input 
                     type="text"
                     value={tempName}
                     onChange={(e) => setTempName(e.target.value)}
                     className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-royal-blue/30 focus:border-royal-blue outline-none text-center font-black text-slate-900"
                   />
                </div>
              ) : (
                <>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">{user.name}</h2>
                  <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{user.email}</p>
                </>
              )}
            </div>
          </div>

          {/* Emergency SOS Button */}
          <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] border border-red-100 shadow-sm overflow-hidden relative group transition-all hover:shadow-xl hover:shadow-red-900/5">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                 <ShieldAlert className="text-red-600 w-5 h-5" />
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-900 tracking-tight">Rapid Response</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Emergency Broadcast</p>
               </div>
             </div>
             <button 
               onClick={() => setShowSOSConfirm(true)}
               className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-red-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
             >
               <span className="absolute inset-0 bg-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></span>
               <Megaphone className="w-5 h-5" /> Trigger SOS
             </button>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Activity className="text-emerald-600 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Symptom Intake</h3>
            </div>
            <form onSubmit={handleSymptomSubmit} className="space-y-4">
              <textarea 
                placeholder="Describe what you are feeling..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={4}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium text-slate-700 resize-none text-sm md:text-base"
              />
              <button 
                type="submit" 
                disabled={isAnalyzing}
                className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analyze Symptoms
              </button>
            </form>
            {aiInsight && (
              <div className="p-4 md:p-5 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in">
                <h5 className="text-[10px] font-black text-royal-blue uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI Guidance</h5>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{aiInsight}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Passport, History, and Appointments */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          
          {/* Appointment Quick Booking & List */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                   <Calendar className="text-royal-blue w-5 h-5 md:w-6 md:h-6" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Appointments</h3>
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Clinical Schedule</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowBookingModal(true)}
                 className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-royal-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:scale-105 transition-all"
               >
                 <Plus className="w-4 h-4" /> Book Consultation
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {myAppointments && myAppointments.length > 0 ? (
                 myAppointments.map(appt => {
                   const timeLabel = (() => {
                     // If time contains a date prefix (our prettyTime), try to extract the clock portion after the date
                     const parts = appt.time.split(' ');
                     if (parts.length >= 3) {
                       // e.g., YYYY-MM-DD 09:00 AM -> show 09:00
                       return parts[1];
                     }
                     // fallback to original split logic
                     return parts[0];
                   })();
                   return (
                     <div key={appt.id} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-white transition-all">
                       <div className="w-10 h-10 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm">
                         <span className="text-[8px] font-black text-slate-400 uppercase">Start</span>
                         <span className="text-[10px] font-black text-royal-blue">{timeLabel}</span>
                       </div>
                       <div className="min-w-0">
                         <h5 className="text-sm font-black text-slate-900 truncate">{appt.title}</h5>
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{appt.location}</p>
                       </div>
                     </div>
                   );
                 })
               ) : (
                 <div className="col-span-2 py-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                   <p className="text-xs text-slate-400 font-medium">No appointments scheduled.</p>
                 </div>
               )}
            </div>
          </div>

          {/* Main Record Card - Clinical Passport */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 gradient-blue rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/10">
                  <FileText className="text-white w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Clinical Passport</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Global Health Status</p>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-royal-blue rounded-full border border-blue-100 animate-in fade-in">
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Last Sync: {new Date(formData.lastUpdated).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`w-full md:w-auto px-6 py-2.5 md:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-royal-blue text-white shadow-lg shadow-blue-900/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {isEditing ? 'Sync Changes' : 'Update Vault'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <RecordField label="Blood Group" value={formData.bloodType} editing={isEditing} icon={<Thermometer className="w-4 h-4" />} onChange={(val) => setFormData({...formData, bloodType: val})} />
              <RecordField label="Active Allergies" value={formData.allergies} editing={isEditing} icon={<AlertCircle className="w-4 h-4" />} onChange={(val) => setFormData({...formData, allergies: val})} />
              <RecordField label="Chronic History" value={formData.conditions} editing={isEditing} icon={<Activity className="w-4 h-4" />} onChange={(val) => setFormData({...formData, conditions: val})} />
              <RecordField label="Daily Maintenance" value={formData.medications} editing={isEditing} icon={<Clock className="w-4 h-4" />} onChange={(val) => setFormData({...formData, medications: val})} />
            </div>
          </div>

          {/* Medical History Section */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10 overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                   <History className="text-royal-blue w-5 h-5 md:w-6 md:h-6" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Medical History</h3>
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Personal Clinical Timeline</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowHistoryModal(true)}
                 className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-royal-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:scale-105 transition-all"
               >
                 <Plus className="w-4 h-4" /> New Entry
               </button>
             </div>

             <div className="space-y-4">
               {formData.medicalHistory && formData.medicalHistory.length > 0 ? (
                 formData.medicalHistory.map((item) => (
                   <div key={item.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl bg-slate-50 border border-transparent hover:border-slate-100 hover:bg-white transition-all group relative">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <h4 className="text-base md:text-lg font-black text-slate-900">{item.event}</h4>
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                              item.visitType === 'Surgery' ? 'bg-red-50 text-red-600 border-red-100' :
                              item.visitType === 'Procedure' ? 'bg-royal-blue/10 text-royal-blue border-royal-blue/10' :
                              item.visitType === 'Vaccination' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {item.visitType}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400">
                            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(item.date).toLocaleDateString()}
                            </div>
                          </div>
                          {item.details && (
                            <p className="text-xs md:text-sm text-slate-500 font-medium mt-3 leading-relaxed border-t border-slate-100 pt-3">{item.details}</p>
                          )}
                       </div>
                       <button 
                        onClick={() => handleDeleteHistory(item.id)}
                        className="self-end md:self-center p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
                        title="Remove Entry"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center space-y-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                      <Bookmark className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
                    </div>
                    <div>
                      <h4 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Timeline Empty</h4>
                      <p className="text-xs md:text-sm text-slate-400 font-medium max-w-[200px] md:max-w-xs mx-auto">Click "New Entry" to start building your record.</p>
                    </div>
                 </div>
               )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Pill className="text-royal-blue w-4 h-4 md:w-5 md:h-5" /></div>
                 <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Active Prescriptions</h3>
               </div>
               <div className="space-y-3">
                 {formData.prescriptions?.map(pr => (
                   <div key={pr.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4 group hover:bg-white hover:border-royal-blue/20 transition-all">
                     <div>
                       <h5 className="font-black text-slate-900 text-sm">{pr.medication}</h5>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{pr.dosage}</p>
                     </div>
                     <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${pr.status === 'READY_FOR_PICKUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-royal-blue'}`}>
                       {pr.status.replace(/_/g, ' ')}
                     </span>
                   </div>
                 ))}
                 {(!formData.prescriptions || formData.prescriptions.length === 0) && <p className="text-xs text-slate-400 italic">No prescriptions found.</p>}
               </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center"><ShoppingBag className="text-slate-400 w-4 h-4 md:w-5 md:h-5" /></div>
                 <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Pharmacy Stock</h3>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 {(globalPharmacyStock || []).slice(0, 4).map(item => (
                   <StockItem key={item.id} name={item.name} available={item.available} />
                 ))}
               </div>
               <button className="w-full py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-royal-blue hover:bg-blue-50 transition-all">View Full Inventory</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const StockItem: React.FC<{name: string; available: boolean}> = ({name, available}) => (
  <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-1">
    <span className="text-[10px] font-black text-slate-900 truncate">{name}</span>
    <span className={`text-[8px] font-black uppercase tracking-widest ${available ? 'text-emerald-500' : 'text-red-400'}`}>
      {available ? 'In Stock' : 'Out'}
    </span>
  </div>
);

const RecordField: React.FC<{label: string; value: string; editing: boolean; icon: React.ReactNode; onChange: (val: string) => void}> = ({ label, value, editing, icon, onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{icon} {label}</label>
    {editing ? (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none font-bold text-sm" />
    ) : (
      <div className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-800 text-sm border border-transparent truncate">{value}</div>
    )}
  </div>
);

export default PatientDashboard;
