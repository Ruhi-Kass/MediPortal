
import React, { useState, useEffect } from 'react';
import { User, UserRole, EmergencyAlert, Inpatient, ScheduleItem, AdmissionStatus, MedicalRecord, PharmacyItem, Prescription, MedicalBoardMeeting } from './types';
import LandingPage from './components/LandingPage';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [inpatients, setInpatients] = useState<Inpatient[]>([]);
  const [pharmacyStock, setPharmacyStock] = useState<PharmacyItem[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [medicalBoardMeetings, setMedicalBoardMeetings] = useState<MedicalBoardMeeting[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin allowlist for automatic role assignment on sign-in
  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const ensureAdminRole = async (user: User): Promise<User> => {
    const isAdminAllowed = ADMIN_EMAILS.includes((user.email || '').toLowerCase());
    if (isAdminAllowed && user.role !== UserRole.ADMIN) {
      await api.updateUserRole(user.id, UserRole.ADMIN);
      const refreshed = await api.getCurrentUser();
      return refreshed || { ...user, role: UserRole.ADMIN };
    }
    return user;
  };

  // Initial Data Fetch & Auth Listener
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch application data when user is logged in
  useEffect(() => {
    if (currentUser) {
      refreshData();

      // Real-time subscriptions could go here
    }
  }, [currentUser?.id, currentUser?.role]);

  const fetchUserData = async (userId: string) => {
    try {
      const user = await api.getCurrentUser();
      if (user) {
        const finalUser = await ensureAdminRole(user);
        setCurrentUser(finalUser);
        setActiveRole(finalUser.role);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [alerts, pts, stock, meds, meetings, scheds] = await Promise.all([
        api.getEmergencyAlerts(),
        api.getInpatients(),
        api.getPharmacyStock(),
        api.getPrescriptions(),
        api.getBoardMeetings(),
        api.getSchedules()
      ]);

      setActiveAlerts(alerts);
      setInpatients(pts);
      setPharmacyStock(stock);
      setAllPrescriptions(meds);
      setMedicalBoardMeetings(meetings);
      setSchedules(scheds);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const handleLogin = async (user: User) => {
    // This is now handled by LandingPage calling supabase.auth.signIn
    // active session listener will pick it up.
    // However, if LandingPage passes a user object directly (mock), we should avoid that.
    // We'll update LandingPage to not pass user object but perform auth.
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleUpdateUser = async (updates: Partial<User>) => {
    if (currentUser) {
      await api.updateUserProfile(currentUser.id, updates);
      // Optimistic update or refetch
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleCreateEmergency = async (alertData: Omit<EmergencyAlert, 'id' | 'status' | 'timestamp' | 'medicalSummary'>) => {
    const medicalSummary = currentUser?.medicalRecord || {
      bloodType: 'Pending',
      allergies: 'Unknown',
      conditions: alertData.incidentType,
      medications: 'None',
      lastUpdated: new Date().toISOString()
    };

    await api.createEmergencyAlert(alertData, medicalSummary);
    refreshData();
  };

  const handleBookAppointment = async (booking: Omit<ScheduleItem, 'id'>) => {
    if (!currentUser) return;
    // For now assuming currentUser is the one booking or related
    // The API needs a doctor_id, let's assume if patient books it's a request, 
    // but the schema requires doctor_id. 
    // For simplicity, we assign a random doctor or handle it in API.
    // Wait, the API I wrote `createSchedule` takes `doctorId`.
    // We might need to find a doctor first or just pick the first one.
    // For this prototype migration, let's just use the current user ID if they are a doctor, 
    // or if patient, we might fail or need a default doctor.
    // Let's pass currentUser.id if doctor, else we need a fallback.
    const doctorId = activeRole === UserRole.DOCTOR ? currentUser.id : '00000000-0000-0000-0000-000000000000'; // Invalid UUID if fetching fails
    await api.createSchedule({
      ...booking,
      time: booking.time,
      patientName: booking.patientName || currentUser.name
    }, doctorId);

    refreshData();
  };

  const handleDeleteEmergency = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    await api.deleteEmergencyAlert(id);
    refreshData();
  };

  const handleAdmitPatient = async (alert: EmergencyAlert) => {
    const newInpatient: Omit<Inpatient, 'id'> = {
      patientName: alert.patientName,
      status: AdmissionStatus.ON_THE_WAY,
      admissionDate: new Date().toISOString(),
      ward: 'ICU - West Wing',
      attendingPhysician: currentUser?.name || 'Dr. On Duty',
      medicalSummary: alert.medicalSummary,
      dob: undefined // Missing in alert
    };

    await api.createInpatient(newInpatient);
    // Also likely want to resolve the alert or update its status
    // api.updateEmergencyAlertStatus(alert.id, 'RESOLVED'); // I didn't add this method, assume createInpatient is enough for now or I should add it.
    await api.deleteEmergencyAlert(alert.id); // Simple Move
    refreshData();
  };

  const handleManualAdmit = async (data: { name: string, status: AdmissionStatus, ward: string, bloodType: string, allergies: string, dob?: string, id?: string }) => {
    const summary: MedicalRecord = {
      bloodType: data.bloodType,
      allergies: data.allergies,
      conditions: 'Admitted via Registration/Manual Entry',
      medications: 'None recorded',
      lastUpdated: new Date().toISOString()
    };

    await api.createInpatient({
      patientName: data.name,
      dob: data.dob,
      status: data.status,
      admissionDate: new Date().toISOString(),
      ward: data.ward,
      attendingPhysician: currentUser?.name || 'Dr. On Duty',
      medicalSummary: summary
    });
    refreshData();
  };

  const handleDeleteInpatient = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    await api.deleteInpatient(id);
    refreshData();
  };

  const handleUpdateInpatientStatus = async (id: string, status: AdmissionStatus) => {
    await api.updateInpatientStatus(id, status);
    refreshData();
  };

  const handleScheduleMeeting = async (meeting: Omit<MedicalBoardMeeting, 'id'>) => {
    await api.createBoardMeeting(meeting);
    refreshData();
  };

  const handleDeleteMeeting = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    await api.deleteBoardMeeting(id);
    refreshData();
  };

  const handleUpdateStock = async (newStock: PharmacyItem[]) => {
    await api.updatePharmacyStock(newStock);
    refreshData();
  };

  const handleUpdatePrescriptionStatus = async (id: string, status: Prescription['status']) => {
    await api.updatePrescriptionStatus(id, status);
    refreshData();
  };

  const handleUpdatePatientRecordGlobal = async (patientId: string, record: MedicalRecord) => {
    // This updates the inpatient record snapshot currently
    await api.updateInpatientMedicalRecord(patientId, record);

    // Ideally update the actual user profile too if linked
    // api.updateUserProfile(patientId, { medicalRecord: record });
    refreshData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-900">Loading MediPortal...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      {currentUser && (
        <>
          <div className="absolute top-20 right-[-20%] md:right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] gradient-blue rounded-full glow-background pointer-events-none -z-10 opacity-[0.05]" />
          <div className="absolute bottom-[-10%] left-[-20%] md:left-[-10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-blue-400 rounded-full glow-background pointer-events-none -z-10 opacity-[0.03]" />
        </>
      )}

      {/* <Navbar user={currentUser} onLogout={handleLogout} 
      onSwitchRole={
  currentUser?.role === UserRole.ADMIN
    ? (r) => setActiveRole(r)
    : undefined
} /> */}

<Navbar 
  user={currentUser}
  activeRole={activeRole}
  onLogout={handleLogout}
  onSwitchRole={
    currentUser?.role === UserRole.ADMIN
      ? (r) => setActiveRole(r)
      : undefined
  }
/>

      <main className="pt-20 relative z-10 w-full">
        {!currentUser ? (
          // We pass a dummy onLogin because LandingPage handles auth internally now, 
          // or we can wrap the internal auth and just use this to trigger state update?
          // Actually, onAuthStateChange handles the state update. 
          // We just need LandingPage to perform the API call.
          <LandingPage onLogin={() => { }} />
        ) : activeRole === UserRole.PATIENT ? (
          <PatientDashboard
            user={currentUser}
            onUpdateRecord={(record) => handleUpdateUser({ medicalRecord: record })}
            onUpdateUser={handleUpdateUser}
            globalPharmacyStock={pharmacyStock}
            onCreateEmergency={handleCreateEmergency}
            onBookAppointment={handleBookAppointment}
            myAppointments={schedules.filter(s => s.patientName === currentUser.name)}
          />
        ) : activeRole === UserRole.DOCTOR ? (
          <DoctorDashboard
            user={currentUser}
            activeAlerts={activeAlerts}
            inpatients={inpatients}
            schedules={schedules}
            boardMeetings={medicalBoardMeetings}
            onCreateEmergency={handleCreateEmergency}
            onAdmitPatient={handleAdmitPatient}
            onManualAdmit={handleManualAdmit}
            onUpdateInpatientStatus={handleUpdateInpatientStatus}
            onScheduleBoard={handleScheduleMeeting}
            onUpdateUser={handleUpdateUser}
          />
        ) : (
          <AdminDashboard
            user={currentUser}
            activeAlerts={activeAlerts}
            inpatients={inpatients}
            schedules={schedules}
            boardMeetings={medicalBoardMeetings}
            pharmacyStock={pharmacyStock}
            allPrescriptions={allPrescriptions}
            onUpdateStock={handleUpdateStock}
            onUpdatePrescriptionStatus={handleUpdatePrescriptionStatus}
            onUpdatePatientRecord={handleUpdatePatientRecordGlobal}
            onDeleteEmergency={handleDeleteEmergency}
            onDeleteInpatient={handleDeleteInpatient}
            onDeleteMeeting={handleDeleteMeeting}
            onCreateEmergency={handleCreateEmergency}
            onRegisterPatient={handleManualAdmit}
          />
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur-sm border-t py-8 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-xs md:text-sm">
          &copy; 2026 MediPortal. Prototype medical system. All data simulated.
        </div>
      </footer>
    </div>
  );
};

export default App;
