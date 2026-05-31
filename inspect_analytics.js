const { createClient } = require('@supabase/supabase-js');
const { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } = require('date-fns');

const supabaseUrl = 'https://qqvzklonfybticckpuvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxODMxMCwiZXhwIjoyMDkwNzk0MzEwfQ.bILed5F0IzIQ2I4Z53LjLAjv9PYkdMup-d1gtYCrApo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const clubId = 'b6d46a66-8497-4ba9-b0c7-eab7dc23d164'; // from club admins / clubs
  const selectedMonth = new Date('2026-05-31T23:22:51+03:00'); // current month
  const standardStartTime = '09:00';

  const { data: attendance } = await supabase
    .from('caddie_attendance')
    .select('caddie_id, date, time_in, time_out, is_absent')
    .eq('club_id', clubId);

  const attendanceRecords = attendance || [];
  console.log('Total attendance records:', attendanceRecords.length);

  const currentMonthRecords = attendanceRecords.filter(r => {
    if (r.is_absent || !r.time_in) return false;
    return r.date.startsWith(format(selectedMonth, 'yyyy-MM'));
  });

  console.log('Current month records:', currentMonthRecords.length);

  const [hThreshold, mThreshold] = standardStartTime.split(':').map(Number);
  let onTimeCount = 0;
  let lateCount = 0;

  currentMonthRecords.forEach(r => {
    if (r.time_in) {
      try {
        const checkInTime = parseISO(r.time_in);
        const h = checkInTime.getHours();
        const m = checkInTime.getMinutes();
        if (h < hThreshold || (h === hThreshold && m <= mThreshold)) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      } catch (_) {
        onTimeCount++;
      }
    }
  });

  console.log('On Time:', onTimeCount);
  console.log('Late:', lateCount);

  const pieData = [
    { name: 'On Time', value: onTimeCount },
    { name: 'Late', value: lateCount }
  ].filter(entry => entry.value > 0);

  console.log('pieData:', pieData);
}

run();
