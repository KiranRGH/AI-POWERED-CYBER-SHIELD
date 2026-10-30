import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, Plus, CheckCircle2, XCircle, Clock, 
  ShieldAlert, ShieldCheck, AlertTriangle, Database, Lock, 
  RefreshCw, FileText, UserPlus, Zap
} from 'lucide-react';
import { studentsAttendanceApi, Student, StudentDetailResponse } from '../../api/studentsAttendance';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

// Format: 1 + College Code (e.g. CK) + Year (e.g. 21) + Branch (e.g. CS) + Roll No (e.g. 045)
const USN_REGEX = /^1[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{3}$/;

export const StudentAttendance = () => {
  const { user } = useAuth();
  const isStaff = user?.role?.toUpperCase() === 'SUPERADMIN' || user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ANALYST';
  const currentUserUSN = user?.username?.trim().toUpperCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);

  const isOwnRecord = !!currentUserUSN && selectedStudent?.student.roll_number.toUpperCase() === currentUserUSN;
  const canMarkAttendance = isStaff || isOwnRecord;

  // New Student Form State
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newBranch, setNewBranch] = useState('CS');
  const [newYear, setNewYear] = useState('21');
  const [newCollege, setNewCollege] = useState('CK');
  const [newRollDigit, setNewRollDigit] = useState('');
  const [newSemester, setNewSemester] = useState<number>(6);
  const [newStudyDuration, setNewStudyDuration] = useState<string>('2021 - 2025');

  // Attendance Form State
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [attSubject, setAttSubject] = useState('AI & Cyber Threat Defense');

  // Load initial students list
  const loadStudents = async () => {
    try {
      const data = await studentsAttendanceApi.getStudents();
      setStudentsList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStudents();
    if (!isStaff && currentUserUSN && USN_REGEX.test(currentUserUSN)) {
      handleSearch(currentUserUSN);
    }
  }, []);

  const handleSearch = async (usnToSearch?: string) => {
    const query = (usnToSearch || searchQuery).trim().toUpperCase();
    if (!query) return;

    setLoading(true);
    try {
      const res = await studentsAttendanceApi.getStudentDetails(query);
      setSelectedStudent(res);
      setSearchQuery(query);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Student ${query} not found in database.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillUSN = (college: string, yr: string, br: string, roll: string) => {
    const paddedRoll = roll.padStart(3, '0').slice(-3);
    const generated = `1${college.toUpperCase()}${yr}${br.toUpperCase()}${paddedRoll}`;
    setNewRollNumber(generated);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsn = newRollNumber.trim().toUpperCase();

    if (!USN_REGEX.test(cleanUsn)) {
      toast.error(
        "Invalid Roll Number format! Must be 1(College)(Year)(Branch)(Roll) e.g. 1CK21CS045 " +
        "(1 + College 'CK' + Year '21' + Branch 'CS' + Roll '045')."
      );
      return;
    }

    try {
      await studentsAttendanceApi.createStudent({
        roll_number: cleanUsn,
        full_name: newName.trim(),
        college_code: cleanUsn.slice(1, 3),
        branch: cleanUsn.slice(5, 7),
        year: 2000 + parseInt(cleanUsn.slice(3, 5)),
        semester: Number(newSemester),
        study_duration: newStudyDuration,
      });

      toast.success(`Student ${cleanUsn} added to protected academic database!`);
      setShowAddModal(false);
      setNewRollNumber('');
      setNewName('');
      loadStudents();
      handleSearch(cleanUsn);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      await studentsAttendanceApi.markAttendance(selectedStudent.student.roll_number, {
        status: attStatus,
        subject: attSubject,
      });

      toast.success(`Attendance marked as ${attStatus} for ${selectedStudent.student.roll_number}`);
      setShowMarkModal(false);
      handleSearch(selectedStudent.student.roll_number);
      loadStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record attendance');
    }
  };

  const handleSimulateTamperAttack = async (attackType: string) => {
    if (!selectedStudent) return;
    const usn = selectedStudent.student.roll_number;

    setTamperLoading(true);
    try {
      const res = await studentsAttendanceApi.simulateTamper({
        roll_number: usn,
        attack_type: attackType,
        fake_attacker_ip: '185.220.101.88',
        tampered_status: 'PRESENT',
        malicious_payload: attackType === 'SQL_INJECTION' 
          ? `UNION SELECT * FROM attendance WHERE roll_number='${usn}' OR 1=1; --`
          : `ATTEMPTED_RECORD_HIJACK: status=PRESENT; attacker_bypass=True; target=${usn}`
      });

      if (res.threat_detected) {
        toast.error(
          `🚨 CYBER CRIME BLOCKED: Autonomous Defense intercepted unauthorized ${attackType} on ${usn}! Attacker IP ${res.quarantined_ip} quarantined.`,
          { duration: 8000 }
        );
      }
      handleSearch(usn);
    } catch (err: any) {
      toast.error('Simulation error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTamperLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <GraduationCap className="text-cyan-400" size={28} />
            Academic Student Records & Attendance Protection
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Database protection and third-party cyber tampering detection for student records.
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-cyan-900/20"
            >
              <UserPlus size={16} />
              <span>Add Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Roll Number Format Guide Banner */}
      <div className="bg-gray-800/90 border border-cyan-800/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className="text-cyan-400 mt-1 flex-shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">
              Institutional Roll Number Format: <span className="text-cyan-400 font-mono">1(College)(Year)(Branch)(Roll)</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Example: <code className="text-cyan-300 font-mono font-bold">1CK21CS045</code> = 
              <span className="text-gray-300"> Region 1</span> + 
              <span className="text-gray-300"> College 'CK' (CBIT Kolar)</span> + 
              <span className="text-gray-300"> Year '21'</span> + 
              <span className="text-gray-300"> Branch 'CS'</span> + 
              <span className="text-gray-300"> Roll '045'</span>.
            </p>
          </div>
        </div>

        {/* Quick Student Selection Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400">Quick Select:</span>
          {['1CK21CS045', '1CK21CS012', '1CK22AI019', '1CK23IS007'].map((usn) => (
            <button
              key={usn}
              onClick={() => handleSearch(usn)}
              className={`font-mono px-2.5 py-1 rounded border transition-colors ${
                searchQuery === usn 
                  ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300 font-semibold' 
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-cyan-700'
              }`}
            >
              {usn}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Roll Number e.g. 1CK21CS045 or Student Name..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
            <span>Search Records</span>
          </button>
        </form>
      </div>

      {/* Student Details & Attendance Summary */}
      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Profile Card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800 font-mono">
                    {selectedStudent.student.roll_number}
                  </span>
                  <h2 className="text-xl font-bold text-gray-100 mt-2">
                    {selectedStudent.student.full_name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedStudent.student.college_name}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-cyan-900/30 border border-cyan-700 flex items-center justify-center text-cyan-400 font-bold text-lg">
                  {selectedStudent.student.full_name.charAt(0)}
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-700/60">
                  <span className="text-gray-400">Branch</span>
                  <span className="font-semibold text-gray-200">{selectedStudent.student.branch} Engineering</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700/60">
                  <span className="text-gray-400">Batch Year</span>
                  <span className="text-gray-200">{selectedStudent.student.year}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700/60">
                  <span className="text-gray-400">Semester</span>
                  <span className="text-gray-200">Semester {selectedStudent.student.semester}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700/60">
                  <span className="text-gray-400">Study Duration</span>
                  <span className="text-cyan-400 font-mono font-medium">{selectedStudent.student.study_duration || '2021 - 2025'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700/60">
                  <span className="text-gray-400">Database Protection</span>
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-400 gap-1">
                    <ShieldCheck size={14} /> Zero-Trust Integrity
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              {canMarkAttendance ? (
                <button
                  onClick={() => setShowMarkModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-700 text-cyan-400 border border-cyan-800 rounded-lg text-sm font-medium transition-colors shadow"
                >
                  <Plus size={16} />
                  <span>Mark Today's Attendance</span>
                </button>
              ) : (
                <div className="p-3 bg-gray-900/90 border border-gray-700 rounded-xl text-xs text-gray-400 flex items-start gap-2.5">
                  <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-200 block">Read-Only Student Record</span>
                    Viewing attendance for <span className="font-mono text-cyan-400">{selectedStudent.student.roll_number}</span>. Students can only mark attendance for their own roll number ({currentUserUSN || 'your USN'}).
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Stats & Metrics */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="text-cyan-400" size={18} />
                Attendance Performance
              </h3>

              <div className="text-center my-4">
                <div className="text-4xl font-extrabold text-cyan-400 font-mono">
                  {selectedStudent.stats.attendance_percentage}%
                </div>
                <p className="text-xs text-gray-400 mt-1">Verified Overall Attendance</p>
                <div className="w-full bg-gray-900 rounded-full h-2.5 mt-3 overflow-hidden border border-gray-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedStudent.stats.attendance_percentage >= 75
                        ? 'bg-emerald-500'
                        : selectedStudent.stats.attendance_percentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(selectedStudent.stats.attendance_percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6">
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-center">
                  <span className="text-xs text-gray-400">Present</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{selectedStudent.stats.present}</p>
                </div>
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-center">
                  <span className="text-xs text-gray-400">Absent</span>
                  <p className="text-lg font-bold text-red-400 mt-0.5">{selectedStudent.stats.absent}</p>
                </div>
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-center">
                  <span className="text-xs text-gray-400">Classes</span>
                  <p className="text-lg font-bold text-gray-200 mt-0.5">{selectedStudent.stats.total_classes}</p>
                </div>
              </div>
            </div>

            {/* Attendance Status Banner */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              {selectedStudent.stats.attendance_percentage >= 75 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-2.5">
                  <CheckCircle2 size={16} />
                  <span>Eligible for VTU examinations (Criteria: &gt; 75%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg p-2.5">
                  <AlertTriangle size={16} />
                  <span>Shortage Warning: Attendance is below 75% requirement</span>
                </div>
              )}
            </div>
          </div>

          {/* ⚡ Cyber Crime & Tampering Defense Testbed — Admin & Analyst */}
          {isStaff && (
          <div className="bg-gray-800 rounded-xl border border-red-900/50 p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <ShieldAlert size={20} />
                  Cyber Attack Testbed
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800">
                  Live Defense
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Simulate third-party cyber attacks targeting this student's records to generate real threat datasets and test autonomous auto-defense.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleSimulateTamperAttack('UNAUTHORIZED_MODIFICATION')}
                  disabled={tamperLoading}
                  className="w-full flex items-center justify-between p-3 bg-red-950/30 hover:bg-red-900/40 border border-red-800/60 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-red-300 group-hover:text-red-200">
                      ⚡ Simulate Unauthorized Tampering Attack
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Rogue third-party attempt to forge attendance from Absent to Present
                    </p>
                  </div>
                  <Zap size={16} className="text-red-400 flex-shrink-0" />
                </button>

                <button
                  onClick={() => handleSimulateTamperAttack('SQL_INJECTION')}
                  disabled={tamperLoading}
                  className="w-full flex items-center justify-between p-3 bg-orange-950/30 hover:bg-orange-900/40 border border-orange-800/60 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-orange-300 group-hover:text-orange-200">
                      💥 Simulate SQL Injection Attack
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Injected SQL query attempting to bypass authentication and exfiltrate data
                    </p>
                  </div>
                  <Zap size={16} className="text-orange-400 flex-shrink-0" />
                </button>

                <button
                  onClick={() => handleSimulateTamperAttack('UNAUTHORIZED_DELETION')}
                  disabled={tamperLoading}
                  className="w-full flex items-center justify-between p-3 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/60 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">
                      ⚠️ Simulate Unauthorized Deletion Attack
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Malicious attempt to wipe out academic records from the database
                    </p>
                  </div>
                  <Zap size={16} className="text-purple-400 flex-shrink-0" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700/60 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Threats Thwarted on this USN:</span>
              <span className="font-mono font-bold text-red-400 text-sm">
                {selectedStudent.stats.threats_blocked_count}
              </span>
            </div>
          </div>
          )} {/* end isAdmin testbed */}
        </div>
      )}

      {/* Attendance History & Cyber Crime Logs Table */}
      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance History */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-base font-bold text-gray-100 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-cyan-400" />
              Verified Attendance Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-xs text-gray-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 text-xs">
                  {selectedStudent.attendance_history.length > 0 ? (
                    selectedStudent.attendance_history.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-750">
                        <td className="py-2.5 px-3 font-mono text-gray-300">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-gray-200">{record.subject}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              record.status === 'PRESENT'
                                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'
                                : record.status === 'LATE'
                                ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800'
                                : 'bg-red-900/40 text-red-400 border border-red-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400">
                          {record.is_tampered ? (
                            <span className="text-red-400 font-bold">Tampered (Reverted)</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px]">
                              <ShieldCheck size={13} /> Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No attendance marked yet. Click "Mark Today's Attendance" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty Search State */}
      {!selectedStudent && !loading && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center max-w-2xl mx-auto my-6 shadow-xl">
          <div className="w-16 h-16 bg-cyan-950/80 border border-cyan-800 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Search size={30} />
          </div>
          <h3 className="text-xl font-bold text-gray-100">Search for your USN / Roll Number</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
            Enter your VTU institutional roll number in the search bar above to view attendance records, attendance percentage, and zero-trust verification telemetry.
          </p>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
            <span className="text-xs text-gray-400">Example valid roll numbers:</span>
            {['1CK21CS045', '1CK21CS012', '1CK22AI019', '1CK23IS007'].map((exampleUsn) => (
              <button
                key={exampleUsn}
                onClick={() => handleSearch(exampleUsn)}
                className="font-mono text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-cyan-400 border border-cyan-800 rounded-lg transition-colors"
              >
                {exampleUsn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin & Analyst View: All Students Attendance & Enrollment Roster */}
      {isStaff && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-700 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <GraduationCap className="text-cyan-400" size={20} />
                All Enrolled Students & Attendance Roster ({studentsList.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Complete institutional student database. Inspect records or mark attendance for any roll number.
              </p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={adminStudentSearch}
                onChange={(e) => setAdminStudentSearch(e.target.value)}
                placeholder="Filter by name, USN, branch..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/60 uppercase text-[11px] text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Roll Number (USN)</th>
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">College & Branch</th>
                  <th className="py-3 px-4 font-semibold">Semester</th>
                  <th className="py-3 px-4 font-semibold">Study Duration</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {studentsList
                  .filter(st => {
                    if (!adminStudentSearch) return true;
                    const q = adminStudentSearch.toLowerCase();
                    return st.roll_number.toLowerCase().includes(q) ||
                           st.full_name.toLowerCase().includes(q) ||
                           st.branch.toLowerCase().includes(q);
                  })
                  .map(st => (
                    <tr key={st.id} className="hover:bg-gray-750/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        {st.roll_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-200">
                        {st.full_name}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {st.college_name || 'CBIT Kolar'} • {st.branch} (Batch {st.year})
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        Semester {st.semester}
                      </td>
                      <td className="py-3 px-4 text-cyan-400 font-mono text-xs">
                        {st.study_duration || '2021 - 2025'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              handleSearch(st.roll_number);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 rounded font-medium transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={async () => {
                              await handleSearch(st.roll_number);
                              setShowMarkModal(true);
                            }}
                            className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded font-medium transition-colors"
                          >
                            Mark Attendance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Student */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-xl font-bold text-gray-100 mb-1 flex items-center gap-2">
              <UserPlus className="text-cyan-400" size={22} />
              Register New Student Record
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Add student with Karnataka/VTU institutional roll number format.
            </p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Structured Roll Number Generator */}
              <div className="p-3 bg-gray-900/80 rounded-lg border border-gray-700 space-y-3">
                <label className="block text-xs font-semibold text-cyan-400">
                  Build Roll Number: <span className="font-mono">{newRollNumber || '1CK21CS...'}</span>
                </label>
                
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">College Code</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newCollege}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNewCollege(val);
                        handleAutoFillUSN(val, newYear, newBranch, newRollDigit);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center font-mono text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Admission Yr</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewYear(val);
                        handleAutoFillUSN(newCollege, val, newBranch, newRollDigit);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center font-mono text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Branch</label>
                    <select
                      value={newBranch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewBranch(val);
                        handleAutoFillUSN(newCollege, newYear, val, newRollDigit);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center font-mono text-gray-200"
                    >
                      <option value="CS">CS</option>
                      <option value="IS">IS</option>
                      <option value="AI">AI</option>
                      <option value="EC">EC</option>
                      <option value="ME">ME</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Roll No (3-digit)</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="045"
                      value={newRollDigit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewRollDigit(val);
                        handleAutoFillUSN(newCollege, newYear, newBranch, val);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center font-mono text-gray-200"
                    />
                  </div>
                </div>

                {/* Semester & Study Duration Selection */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Academic Semester</label>
                    <select
                      value={newSemester}
                      onChange={(e) => setNewSemester(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Study Duration</label>
                    <select
                      value={newStudyDuration}
                      onChange={(e) => setNewStudyDuration(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="2021 - 2025">2021 - 2025</option>
                      <option value="2022 - 2026">2022 - 2026</option>
                      <option value="2023 - 2027">2023 - 2027</option>
                      <option value="2024 - 2028">2024 - 2028</option>
                      <option value="2025 - 2029">2025 - 2029</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400">Resulting USN / Roll Number:</label>
                  <input
                    type="text"
                    required
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value.toUpperCase())}
                    placeholder="1CK21CS045"
                    className="w-full bg-gray-800 border border-cyan-700 rounded px-3 py-1.5 text-sm font-mono font-bold text-cyan-300 mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mark Attendance */}
      {showMarkModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-100 mb-1">Mark Attendance</h3>
            <p className="text-xs text-gray-400 mb-4">
              Student: <span className="font-mono text-cyan-400 font-bold">{selectedStudent.student.roll_number}</span> ({selectedStudent.student.full_name})
            </p>

            <form onSubmit={handleMarkAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={attSubject}
                  onChange={(e) => setAttSubject(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'ABSENT', 'LATE'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAttStatus(s)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        attStatus === s
                          ? s === 'PRESENT'
                            ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                            : s === 'ABSENT'
                            ? 'bg-red-900/60 border-red-500 text-red-300'
                            : 'bg-yellow-900/60 border-yellow-500 text-yellow-300'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-750'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium"
                >
                  Submit Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;
