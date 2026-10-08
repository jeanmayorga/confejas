export const conferenceDays = [
  {
    id: "viernes-9",
    date: "2026-10-09",
    dayNumber: "09",
    shortTitle: "Viernes 9",
    title: "Viernes 9 de octubre",
    activities: [
      { time: "6:30 – 8:00", title: "Preparación y lectura" },
      { time: "8:00 – 9:00", title: "Desayuno", place: "Comedor" },
      { time: "9:00 – 10:00", title: "Reúnete con tu compañía", place: "Compañía" },
      {
        time: "10:00 – 11:00",
        title: "Presentación de los coordinadores",
        place: "Salón General",
      },
      { time: "11:00 – 11:30", title: "Fotos por compañía", place: "Compañía" },
      {
        time: "11:30 – 13:00",
        title: "Integración de participantes",
        place: "Compañía",
      },
      { time: "13:00 – 14:00", title: "Almuerzo", place: "Comedor" },
      {
        time: "14:00 – 15:30",
        title: "Integración de participantes",
        place: "Salón General",
      },
      {
        time: "15:30 – 17:00",
        title: "Espectáculo de variedades",
        place: "Salón General",
      },
      {
        time: "17:00 – 18:00",
        title: "Integración de participantes",
        place: "Canchas",
      },
      { time: "18:00 – 19:00", title: "Cena", place: "Comedor" },
      { time: "19:00 – 20:00", title: "Preparación para la cena y baile" },
      { time: "20:00 – 00:00", title: "Baile", place: "Salón General" },
      { time: "00:00 – 00:30", title: "Hora de dormir" },
    ],
  },
  {
    id: "sabado-10",
    date: "2026-10-10",
    dayNumber: "10",
    shortTitle: "Sábado 10",
    title: "Sábado 10 de octubre",
    activities: [
      { time: "6:30 – 8:00", title: "Preparación y lectura" },
      { time: "8:30 – 9:30", title: "Desayuno", place: "Comedor" },
      { time: "9:30 – 11:00", title: "Devocional", place: "Salón General" },
      { time: "11:15 – 12:15", title: "Clase de Instituto", place: "Compañía" },
      { time: "12:30 – 13:45", title: "Almuerzo", place: "Comedor" },
      {
        time: "13:45 – 14:15",
        title: "Actividades de integración",
        place: "Compañía",
      },
      {
        time: "14:30 – 15:30",
        title: "Estudio de Ven, Sígueme",
        place: "Compañía",
      },
      { time: "15:30 – 16:30", title: "Pausa activa" },
      { time: "16:30 – 17:30", title: "Tarde de testimonios", place: "Salón General" },
      { time: "17:30 – 18:30", title: "Alistar maletas", place: "Por estacas" },
      { time: "Desde las 18:30", title: "Regreso a casa" },
    ],
  },
] as const;

// Day 0 is preparation for staff and counselors; the public itinerary starts Friday.
export const staffConferenceDays = [
  {
    id: "jueves-8",
    date: "2026-10-08",
    dayNumber: "08",
    shortTitle: "Jueves 8",
    title: "Jueves 8 de octubre",
    activities: [
      { time: "14:00 – 17:00", title: "Viaje del Staff" },
      { time: "17:00 – 17:30", title: "Recorrido General" },
      { time: "17:30 – 18:30", title: "Asignaciones" },
      { time: "18:30 – 19:15", title: "Cena" },
      { time: "19:15 – 20:00", title: "Devocional de Apertura para el Staff" },
      { time: "20:00 – 22:00", title: "Asignaciones" },
      { time: "22:00 – 22:30", title: "Simulacro" },
      { time: "22:30 – 00:00", title: "Recibir Estacas" },
    ],
  },
  ...conferenceDays,
] as const;
