export interface ScheduleStatus {
  isToday: boolean;
  status: 'EN_CURSO' | 'PROXIMA_HOY' | 'FINALIZADA_HOY' | 'OTRO_DIA';
  badgeText: string;
  badgeColor: 'green' | 'amber' | 'slate' | 'blue';
  minutosRestantes?: number;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const scheduleHelper = {
  // Available weekdays
  diasDisponibles: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],

  // Standard hour options
  horasDisponibles: [
    '07:00', '07:30',
    '08:00', '08:30',
    '09:00', '09:30',
    '10:00', '10:30',
    '11:00', '11:30',
    '12:00', '12:30',
    '13:00', '13:30',
    '14:00', '14:30',
    '15:00', '15:30',
    '16:00', '16:30',
    '17:00', '17:30',
    '18:00', '18:30',
    '19:00', '19:30',
    '20:00', '20:30',
    '21:00'
  ],

  // Formats defined schedule into permanent, standard string
  formatDefinedSchedule: (dias: string[], horaInicio: string, horaFin: string): string => {
    if (!dias.length || !horaInicio || !horaFin) return '';
    return `${dias.join(', ')} | ${horaInicio} - ${horaFin}`;
  },

  // Analyzes schedule relative to current day and time
  analyzeSchedule: (horarioStr: string): ScheduleStatus => {
    if (!horarioStr) {
      return { isToday: false, status: 'OTRO_DIA', badgeText: 'Programada', badgeColor: 'slate' };
    }

    const now = new Date();
    const currentDayName = DIAS_SEMANA[now.getDay()]; // e.g. "Viernes"
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if current day name appears in schedule
    // Handle variations (e.g. "Miercoles" vs "Miércoles", "Sabado" vs "Sábado")
    const cleanSchedule = horarioStr.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanToday = currentDayName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const isToday = cleanSchedule.includes(cleanToday);

    // Try extracting hours e.g. "08:00 - 10:00" or "08:00 a 10:00"
    const timeMatch = horarioStr.match(/(\d{1,2}:\d{2})\s*(?:-|a|al)\s*(\d{1,2}:\d{2})/i);

    if (!isToday) {
      return {
        isToday: false,
        status: 'OTRO_DIA',
        badgeText: 'Otro día',
        badgeColor: 'slate',
      };
    }

    if (timeMatch) {
      const [_, startStr, endStr] = timeMatch;
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return {
          isToday: true,
          status: 'EN_CURSO',
          badgeText: '🟢 En curso ahora',
          badgeColor: 'green',
        };
      } else if (currentMinutes < startMinutes) {
        const diff = startMinutes - currentMinutes;
        const diffHours = Math.floor(diff / 60);
        const diffMins = diff % 60;
        const timeRemaining = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins} min`;
        return {
          isToday: true,
          status: 'PROXIMA_HOY',
          badgeText: `🟡 Hoy en ${timeRemaining} (${startStr})`,
          badgeColor: 'amber',
          minutosRestantes: diff,
        };
      } else {
        return {
          isToday: true,
          status: 'FINALIZADA_HOY',
          badgeText: 'Concluida hoy',
          badgeColor: 'slate',
        };
      }
    }

    return {
      isToday: true,
      status: 'PROXIMA_HOY',
      badgeText: 'Hoy programada',
      badgeColor: 'blue',
    };
  },
};

export default scheduleHelper;
