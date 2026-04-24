// Predictive Analysis Logic

export interface AttendanceStats {
  totalClasses: number;
  attendedClasses: number;
  attendancePercentage: number;
  status: 'Safe' | 'At Risk' | 'Critical';
  classesNeededFor75: number;
}

export const calculateAttendanceStatus = (totalClasses: number, attendedClasses: number): AttendanceStats => {
  const attendancePercentage = totalClasses === 0 ? 100 : (attendedClasses / totalClasses) * 100;
  
  let status: 'Safe' | 'At Risk' | 'Critical' = 'Safe';
  if (attendancePercentage < 75) {
    status = 'Critical';
  } else if (attendancePercentage < 80) {
    status = 'At Risk';
  }

  // Calculate how many consecutive classes needed to reach 75%
  // Formula: (attended + x) / (total + x) = 0.75
  // attended + x = 0.75 * total + 0.75 * x
  // 0.25 * x = 0.75 * total - attended
  // x = (0.75 * total - attended) / 0.25
  
  let classesNeededFor75 = 0;
  if (attendancePercentage < 75) {
    classesNeededFor75 = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
  }

  return {
    totalClasses,
    attendedClasses,
    attendancePercentage: Number(attendancePercentage.toFixed(2)),
    status,
    classesNeededFor75: Math.max(0, classesNeededFor75)
  };
};
