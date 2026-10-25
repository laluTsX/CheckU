const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const analyzeMobileSchedule = (horarioStr: string) => {
  if (!horarioStr) {
    return { isToday: false, status: 'OTRO_DIA', badgeText: 'Programada' };
  }

  const now = new Date();
  const currentDayName = DIAS_SEMANA[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const cleanSchedule = horarioStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanToday = currentDayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isToday = cleanSchedule.includes(cleanToday);

  const timeMatch = horarioStr.match(/(\d{1,2}:\d{2})\s*(?:-|a|al)\s*(\d{1,2}:\d{2})/i);

  if (!isToday) {
    return { isToday: false, status: 'OTRO_DIA', badgeText: 'Otro día' };
  }

  if (timeMatch) {
    const [_, startStr, endStr] = timeMatch;
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { isToday: true, status: 'EN_CURSO', badgeText: '🟢 En curso ahora' };
    } else if (currentMinutes < startMinutes) {
      return { isToday: true, status: 'PROXIMA_HOY', badgeText: `🟡 Hoy a las ${startStr}` };
    } else {
      return { isToday: true, status: 'FINALIZADA_HOY', badgeText: 'Concluida hoy' };
    }
  }

  return { isToday: true, status: 'PROXIMA_HOY', badgeText: 'Hoy programada' };
};

export default analyzeMobileSchedule;
