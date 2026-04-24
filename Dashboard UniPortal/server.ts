import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendOTP, verifyOTP } from './src/server/auth.js';
import { query } from './src/server/db.js';
import { calculateAttendanceStatus } from './src/server/predictive.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { format, startOfWeek, addDays } from 'date-fns';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Email Alert Helper
  const getTransporter = () => {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    
    if (!user || !pass) return null;
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user, pass },
    });
  };

  // Email Alert Endpoint
  app.post('/api/mail/alert', async (req, res) => {
    const { email, studentName, currentAttendance, requiredSessions, message } = req.body;

    console.log(`[MAIL SYSTEM] Incoming alert request for: ${email}`);
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.error('[MAIL SYSTEM] Transporter failed: SMTP credentials missing.');
        return res.status(400).json({ success: false, error: 'SMTP configuration missing. Update .env file.' });
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || `"UniPortal Academic Alerts" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to: email,
        subject: `Attendance Alert: Recovery Required - ${studentName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
              <h2 style="margin: 0; color: #0f172a;">Attendance Recovery Action Required</h2>
            </div>
            <div style="padding: 30px;">
              <p>Dear ${studentName},</p>
              <p>Your current attendance is at <strong>${currentAttendance}%</strong>. To reach the required 75% threshold, you need to attend at least <strong>${requiredSessions} more sessions</strong> consecutively.</p>
              
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #991b1b; font-size: 14px;">AI Diagnostic Summary:</h3>
                <div style="color: #451a1a; font-size: 14px; line-height: 1.5;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>

              <p style="font-size: 13px; color: #64748b;">Please prioritize your classes to ensure your eligibility for upcoming examinations.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
              University Academic Registry • UniPortal
            </div>
          </div>
        `,
      };

      console.log(`[MAIL SYSTEM] Sending email to ${email}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[MAIL SYSTEM] Successfully dispatched diagnostic alert: ${info.messageId}`);
      res.json({ success: true, message: 'Advanced diagnostic email dispatched.', messageId: info.messageId });
    } catch (error: any) {
      console.error('[MAIL SYSTEM] ERROR DISPATCHING ALERT:', error);
      res.status(500).json({ success: false, error: 'Alert System Failure: Check SMTP credentials.' });
    }
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth Routes
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      await sendOTP(email);
      res.json({ message: 'OTP sent successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
      const result = await verifyOTP(email, otp);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Student Dashboard Routes
  app.get('/api/student/attendance/:studentId', async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const weekOffset = parseInt(req.query.offset as string) || 0;
      const userEmail = req.query.email as string;
      // Use the ACTUAL current date
      const now = new Date();
      const baseDate = addDays(now, weekOffset * 7);

      // Deterministic Mock Names if DB fails - STRICT SYNC with User/Student DB Snapshot
      const mockNames: { [key: string]: string } = {
        // Students Table IDs
        '1': 'Akhtar Raza',
        '2': 'Amit',
        '3': 'Gulshan Baghel',
        '4': 'Nayan',
        '5': 'Rakesh',
        '6': 'Ravi',
        '7': 'Saurabh Raj',
        '8': 'Suresh',
        '9': 'Urkarsh',
        // Users Table IDs (mapping to correct student name)
        '3': 'Akhtar Raza',
        '4': 'Amit',
        '5': 'Gulshan Baghel',
        '6': 'Nayan',
        '7': 'Rakesh',
        '8': 'Ravi',
        '9': 'Saurabh Raj',
        '10': 'Suresh',
        '11': 'Urkarsh',
        '14': 'Akhtar Raza (Faculty)',
        // Enrollment Numbers
        '1001': 'Akhtar Raza',
        '1002': 'Amit',
        '1003': 'Gulshan Baghel',
        '1004': 'Nayan',
        '1005': 'Rakesh',
        '1006': 'Ravi',
        '1007': 'Saurabh Raj',
        '1008': 'Suresh',
        '1009': 'Urkarsh'
      };

      const mockEnrollments: { [key: string]: string } = {
        // Students Table IDs -> Enrollment
        '1': '1001', '2': '1002', '3': '1003', '4': '1004', '5': '1005', 
        '6': '1006', '7': '1007', '8': '1008', '9': '1009',
        // Users Table IDs -> Enrollment
        '3': '1001', '4': '1002', '5': '1003', '6': '1004', '7': '1005',
        '8': '1006', '9': '1007', '10': '1008', '11': '1009'
      };

      let studentData: any = {
        id: studentId,
        name: mockNames[studentId] || `Student #${studentId}`,
        email: `student${studentId}@university.edu`,
        enrollment: mockEnrollments[studentId] || studentId,
        branch: 'Computer Science and Engineering',
        semester: 7,
        status: 'Active'
      };

      // FINAL OVERRIDE: Syncing identities with provided User/Email Database
      const profileOverrides: { [key: string]: { name: string, enrollment: string, id: string } } = {
        'akhtar087650raza@gmail.com': { name: 'Akhtar Raza', enrollment: '1001', id: '3' },
        'amit1002@university.edu': { name: 'Amit', enrollment: '1002', id: '4' },
        'gulshanbaghel46@gmail.com': { name: 'Gulshan Baghel', enrollment: '1003', id: '5' },
        'nayan1004@university.edu': { name: 'Nayan', enrollment: '1004', id: '6' },
        'rakesh1005@university.edu': { name: 'Rakesh', enrollment: '1005', id: '7' },
        'ravi1006@university.edu': { name: 'Ravi', enrollment: '1006', id: '8' },
        'aloksinhatyt@gmail.com': { name: 'Saurabh Raj', enrollment: '1007', id: '9' },
        'suresh1008@university.edu': { name: 'Suresh', enrollment: '1008', id: '10' },
        'urkarsh1009@university.edu': { name: 'Urkarsh', enrollment: '1009', id: '11' }
      };

      if (userEmail && profileOverrides[userEmail]) {
        const override = profileOverrides[userEmail];
        // If the student ID in the URL matches the logged-in user's mapped ID or Enrollment, enforce the correct identity
        if (studentId === override.id || studentId === override.enrollment) {
           studentData.name = override.name;
           studentData.email = userEmail;
           studentData.enrollment = override.enrollment;
           studentData.id = override.id;
        }
      }

      // Dynamic Mock Subjects and Exams based on ID to ensure variety if DB fails
      const idNum = parseInt(studentId) || 1;
      const attSeed = ((idNum * 17) % 35) + 5; // Enhanced variety (Range 5-40 attended of 50)
      
      let detailedSubjects = [
        { id: 1, name: 'Robotics and Intelligent Systems', code: 'CSA061', type: 'PR', instructor: '10343 - Kanderp Narayan Mishra', credits: 3.0, delivered: 50, attended: attSeed, percentage: Math.round((attSeed/50)*100) },
        { id: 2, name: 'Computer Vision', code: 'CSA401', type: 'PR', instructor: '10930 - Dharmendra Kumar', credits: 3.0, delivered: 40, attended: Math.round(attSeed * 0.75), percentage: Math.round((Math.round(attSeed * 0.75)/40)*100) },
        { id: 3, name: 'Development Operations', code: 'OSI401', type: 'PR', instructor: '11070 - Atul Kumar', credits: 2.0, delivered: 100, attended: (70 + (idNum % 15)), percentage: 70 + (idNum % 15) },
        { id: 4, name: 'Flutter for Android Application Development', code: 'CSCR4900', type: 'PR', instructor: '9828 - Mohammad Asim', credits: 2.0, delivered: 30, attended: (15 + (idNum % 10)), percentage: Math.round(((15 + (idNum % 10))/30)*100) },
        { id: 5, name: 'Applications of AIML in healthcare', code: 'CAL402', type: 'PR', instructor: '4813 - Dr Ali Imam Abidi', credits: 3.0, delivered: 50, attended: (30 + (idNum % 12)), percentage: Math.round(((30 + (idNum % 12))/50)*100) },
        { id: 6, name: 'Computer Vision Lab', code: 'CAL401', type: 'PR', instructor: '11160 - Mamta Narwaria', credits: 1.0, delivered: 30, attended: (20 + (idNum % 5)), percentage: Math.round(((20 + (idNum % 5))/30)*100) },
      ];

      // Dynamic Exams based on current date
      const exams = [
        { 
          subject: 'Robotics and Intelligent Systems', 
          code: 'CSA061', 
          date: format(addDays(now, 7 + (idNum % 3)), 'MMMM do, yyyy'),
          room: `Hall ${String.fromCharCode(65 + (idNum % 4))}` // Dynamic Hall (A, B, C, D)
        },
        { 
          subject: 'Computer Vision', 
          code: 'CSA401', 
          date: format(addDays(now, 14 + (idNum % 3)), 'MMMM do, yyyy'),
          room: `Lab ${1 + (idNum % 5)}`
        }
      ];

      let totalDelivered = detailedSubjects.reduce((sum, s) => sum + s.delivered, 0);
      let totalAttended = detailedSubjects.reduce((sum, s) => sum + s.attended, 0);

      if (process.env.DB_HOST || process.env.DATABASE_URL) {
        try {
          const studentIdentifier = req.params.studentId;
          
          // Use specific queries to avoid partial matching mixups
          const studentRes = await query(`
            SELECT s.*, u.email, u.full_name 
            FROM students s 
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = $1::integer 
            OR s.enrollment_number = $2
            LIMIT 1
          `, [isNaN(Number(studentIdentifier)) ? 0 : Number(studentIdentifier), studentIdentifier]);
          
          if (studentRes.rows.length > 0) {
            const s = studentRes.rows[0];
            studentData = {
              id: s.id,
              name: s.full_name || s.name || 'University Student',
              email: s.email || studentData.email,
              enrollment: s.enrollment_number || s.id.toString(),
              branch: s.branch || 'Computer Science and Engineering',
              semester: s.semester || 7,
              gpa: 7.2,
              status: s.status || 'Active'
            };

            // Calculate Real Attendance Stats from DB using ID instead of enrollment string
            const attendanceQuery = `
              SELECT 
                sub.id, 
                sub.name, 
                sub.code, 
                sub.type,
                sub.instructor, 
                sub.credits,
                COUNT(att.id) as delivered,
                COUNT(CASE WHEN att.status = 'Present' THEN 1 END) as attended
              FROM subjects sub
              JOIN enrollments en ON sub.id = en.subject_id
              LEFT JOIN attendance att ON att.student_id = en.student_id
                AND att.session_id IN (SELECT id FROM sessions WHERE subject_id = sub.id)
              WHERE en.student_id = $1
              GROUP BY sub.id, sub.name, sub.code, sub.type, sub.instructor, sub.credits
            `;

            // Attempt to synchronize with database telemetry
            try {
              const attRes = await query(attendanceQuery, [s.id]);
              if (attRes && attRes.rows && attRes.rows.length > 0) {
                const fetchedSubjects = attRes.rows.map(row => {
                  const delivered = parseInt(row.delivered) || 0;
                  const attended = parseInt(row.attended) || 0;
                  return {
                    id: row.id,
                    name: row.name,
                    code: row.code,
                    type: row.type || 'PR',
                    instructor: row.instructor,
                    credits: parseFloat(row.credits) || 0,
                    delivered: delivered === 0 ? 10 : delivered,
                    attended: attended,
                    percentage: delivered > 0 ? Math.round((attended / delivered) * 100) : 0
                  };
                });
                
                if (fetchedSubjects.length > 0) {
                  console.log(`[SYNC] Real-time metrics loaded for student ID: ${s.id}`);
                  detailedSubjects = fetchedSubjects;
                  totalDelivered = detailedSubjects.reduce((sum, sub) => sum + sub.delivered, 0);
                  totalAttended = detailedSubjects.reduce((sum, sub) => sum + sub.attended, 0);
                }
              }
            } catch (attErr) {}
          }
        } catch (dbErr) {}
      }

      const dayWiseGridData = [
        {
          date: format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 0), 'EEE, MMM do'),
          isHoliday: false,
          slots: {
            '09:00 - 10:00': { code: 'CSA061', name: 'Robotics', status: 'P', room: '101', instructor: 'K. N. Mishra' },
            '11:00 - 12:00': { code: 'CSA401', name: 'Computer Vision', status: 'P', room: '102', instructor: 'D. Kumar' }
          }
        },
        {
          date: format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 1), 'EEE, MMM do'),
          isHoliday: false,
          slots: {
            '10:00 - 11:00': { code: 'OSI401', name: 'DevOps', status: 'P', room: 'Lab 1', instructor: 'A. Kumar' },
            '02:00 - 03:00': { code: 'CSCR4900', name: 'Flutter', status: 'A', room: '201', instructor: 'M. Asim' }
          }
        },
        {
          date: format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 2), 'EEE, MMM do'),
          isHoliday: false,
          slots: {
            '09:00 - 10:00': { code: 'CAL402', name: 'AIML Health', status: 'P', room: 'Lab 2', instructor: 'Ali Imam' },
            '01:00 - 02:00': { code: 'CAL401', name: 'CV Lab', status: 'P', room: 'Lab 1', instructor: 'M. Narwaria' }
          }
        },
        {
          date: format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 3), 'EEE, MMM do'),
          isHoliday: false,
          slots: {
            '11:00 - 12:00': { code: 'CSA061', name: 'Robotics', status: 'P', room: '101', instructor: 'K. N. Mishra' }
          }
        },
        {
          date: format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), 4), 'EEE, MMM do'),
          isHoliday: false,
          slots: {
            '11:00 - 12:00': { code: 'CSA061', name: 'Robotics', status: 'P', room: '101', instructor: 'K. N. Mishra' },
            '03:00 - 04:00': { code: 'OSI401', name: 'DevOps', status: 'P', room: 'Lab 1', instructor: 'A. Kumar' }
          }
        }
      ];

      const stats = calculateAttendanceStatus(totalDelivered, totalAttended);
      res.json({
        student: studentData,
        stats,
        detailedSubjects,
        holidays: [
          { id: 1, name: "Seasonal Break", date: format(addDays(now, 5), 'EEEE : do MMM yyyy') },
          { id: 2, name: 'Institutional Holiday', date: format(addDays(now, 12), 'EEEE : do MMM yyyy') },
        ],
        timeSlots: ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 01:00', '01:00 - 02:00', '02:00 - 03:00', '03:00 - 04:00', '04:00 - 05:00'],
        dayWiseGrid: dayWiseGridData,
        exams,
        timetable: [
          { day: 'Today', slots: [
            { time: '09:00 AM', subject: 'Robotics and Intelligent Systems', room: '101', faculty: 'K. N. Mishra' },
            { time: '11:00 AM', subject: 'Computer Vision', room: '102', faculty: 'D. Kumar' },
            { time: '02:00 PM', subject: 'Development Operations', room: 'Lab 1', faculty: 'A. Kumar' },
          ]}
        ],
        notifications: [
          { id: 1, title: 'Fee Payment Due', date: '2 days ago', priority: 'high' },
          { id: 2, title: 'Workshop: AI Ethics', date: '5 days ago', priority: 'low' },
        ]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch student data' });
    }
  });

  // Faculty Dashboard Routes
  app.get('/api/faculty/dashboard', async (req, res) => {
    try {
      // Default sample data (Akhtar Raza)
      let facultyData: any = {
        name: 'Akhtar Raza',
        department: 'Computer Science and Engineering',
        designation: 'Assistant Professor'
      };

      // Try to fetch real faculty data if DB is connected
      let classes = [
        { id: 'CV401', name: 'Computer Vision (L)', students: 9, avgAttendance: 88, nextClass: 'Today, 10:00 AM' },
        { id: 'CV401P', name: 'Computer Vision (P)', students: 9, avgAttendance: 92, nextClass: 'Tomorrow, 02:00 PM' },
      ];

      try {
        if (process.env.DB_HOST || process.env.DATABASE_URL) {
          // Priority 1: Search for Akhtar Raza specifically for the demo
          let facultyRes = await query("SELECT * FROM faculty WHERE name LIKE '%Akhtar Raza%' LIMIT 1");
          
          // Priority 2: If not found, get the first faculty record
          if (facultyRes.rows.length === 0) {
            facultyRes = await query('SELECT * FROM faculty LIMIT 1');
          }

          if (facultyRes.rows.length > 0) {
            const f = facultyRes.rows[0];
            facultyData = {
              name: f.name,
              department: f.department || 'Computer Science and Engineering',
              designation: f.designation || 'Assistant Professor'
            };

            // Fetch Real Classes for this Faculty
            const classesRes = await query(`
              SELECT 
                sub.id, 
                sub.name, 
                sub.code, 
                COUNT(en.student_id) as student_count
              FROM subjects sub
              LEFT JOIN enrollments en ON sub.id = en.subject_id
              WHERE sub.instructor LIKE $1
              GROUP BY sub.id, sub.name, sub.code
            `, [`%${f.name}%`]);

            if (classesRes.rows.length > 0) {
              classes = classesRes.rows.map(row => ({
                id: row.code,
                name: row.name,
                students: parseInt(row.student_count) || 0,
                avgAttendance: 85, // Mock avg
                nextClass: 'Scheduled'
              }));
            }
          }
        }
      } catch (e) {
        console.warn("DB fetch for faculty dashboard failed, using sample data.");
      }

      res.json({
        faculty: facultyData,
        classes,
        atRiskStudents: [
          { id: 3, name: 'Gulshan Baghel', enrollment: '1003', attendance: 74, reason: 'Consecutive Absences' },
          { id: 9, name: 'Urkarsh', enrollment: '1009', attendance: 71, reason: 'Pending Medical Verification' },
        ],
        recentActivity: [
          { id: 1, type: 'attendance', message: 'Attendance marked for CV401', time: '1 hour ago' },
          { id: 2, type: 'leave', message: 'Akhtar Raza requested leave', time: '3 hours ago' },
        ],
        leaveRequests: [
          { id: 1, studentName: 'Akhtar Raza', enrollment: '1001', reason: 'Medical Emergency', startDate: '2026-04-16', endDate: '2026-04-18', status: 'Pending', attachment: 'medical_cert.pdf' },
          { id: 2, studentName: 'Amit', enrollment: '1002', reason: 'Family Event', startDate: '2026-04-20', endDate: '2026-04-21', status: 'Pending', attachment: null },
        ],
        courseMaterials: [
          { id: 1, title: 'Lecture 1: Image Processing Basics', type: 'PDF', size: '3.2 MB', date: '2026-04-01', course: 'CV401' },
          { id: 2, title: 'Lab 1: OpenCV Setup', type: 'PDF', size: '1.5 MB', date: '2026-04-05', course: 'CV401P' },
        ],
        schedule: [
          { day: 'Monday', classes: [{ time: '10:00 AM - 11:00 AM', subject: 'Computer Vision (L)', room: 'Room 402' }] },
          { day: 'Tuesday', classes: [{ time: '02:00 PM - 04:00 PM', subject: 'Computer Vision (P)', room: 'Lab 2' }] },
          { day: 'Wednesday', classes: [{ time: '10:00 AM - 11:00 AM', subject: 'Computer Vision (L)', room: 'Room 402' }] },
          { day: 'Thursday', classes: [{ time: '09:00 AM - 11:00 AM', subject: 'Computer Vision (P)', room: 'Lab 2' }] },
          { day: 'Friday', classes: [{ time: '11:00 AM - 12:00 PM', subject: 'Computer Vision (L)', room: 'Room 402' }] },
        ]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch faculty dashboard data' });
    }
  });

  app.get('/api/faculty/students', async (req, res) => {
    try {
      let studentList = [
        { id: 1, name: 'Akhtar Raza', enrollment: '1001', attendance: 95, status: 'Present' },
        { id: 2, name: 'Amit', enrollment: '1002', attendance: 88, status: 'Present' },
        { id: 3, name: 'Gulshan Baghel', enrollment: '1003', attendance: 74, status: 'Absent' },
        { id: 4, name: 'Nayan', enrollment: '1004', attendance: 92, status: 'Present' },
        { id: 5, name: 'Rakesh', enrollment: '1005', attendance: 85, status: 'Present' },
        { id: 6, name: 'Ravi', enrollment: '1006', attendance: 90, status: 'Present' },
        { id: 7, name: 'Saurabh Raj', enrollment: '1007', attendance: 82, status: 'Present' },
        { id: 8, name: 'Suresh', enrollment: '1008', attendance: 87, status: 'Present' },
        { id: 9, name: 'Urkarsh', enrollment: '1009', attendance: 71, status: 'Late' },
      ];

      try {
        if (process.env.DB_HOST || process.env.DATABASE_URL) {
          const result = await query('SELECT id, name, enrollment FROM students ORDER BY name ASC');
          if (result.rows.length > 0) {
            studentList = result.rows.map(s => ({
              id: s.id,
              name: s.name,
              enrollment: s.enrollment,
              attendance: 85, // Mock attendance
              status: 'Present' // Mock status
            }));
          }
        }
      } catch (e) {
        console.warn("DB fetch for student list failed.");
      }

      res.json(studentList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch student list' });
    }
  });

  // AI Facial Recognition Endpoint
  app.post('/api/attendance/recognize', (req, res) => {
    // In a real app, this would forward the image to a Python/FastAPI microservice
    // e.g., axios.post('http://python-ml-service:8000/recognize', { image: req.body.image })
    
    // Mocking the response
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // Simulate processing delay
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Student recognized and marked present',
        student: { id: 1, name: 'Alice Smith', confidence: 0.98 },
        timetableSlot: { subject: 'Machine Learning', time: '02:00 PM' }
      });
    }, 1000);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
