// NORDLYS — zentrale Konfiguration.
// Hier anpassen: Startdatum, Crew, Auto. Alles andere lebt in src/data/*.json.

export const TRIP = {
  title: 'NORDLYS',
  subline: 'Uster → Lofoten · 16 Tage · 4 Mann · 1 Stelvio',
  startDate: '2026-08-24', // Abfahrt, Europe/Zurich (Format YYYY-MM-DD)
  startTime: '06:00', // geplante Abfahrtszeit
  days: 16,
  timezone: 'Europe/Zurich',

  crew: [
    { name: 'Fabio', role: 'Navigator', line: 'Hält Etappen, Fähren und Moral zusammen. Kennt jede Mautstation beim Vornamen.' },
    { name: 'Michi', role: 'Küchenchef', line: 'Ein Kocher, vier Mägen, null Mitleid. Grosseinkauf ist sein Endgegner.' },
    { name: 'Giannino', role: 'Aurora-Watch', line: 'Weckt dich um 01:30 wegen Kp 3. Und du dankst ihm dafür.' },
    { name: 'Matt', role: 'Camp-Master', line: 'Findet die 150 Meter Abstand auch im Dunkeln. Zelt steht, bevor du fragst.' },
  ],

  car: {
    model: 'Alfa Romeo Stelvio',
    fuel: 'Benzin', // 'Benzin' | 'Diesel' — steuert den Default-Verbrauch im Budget
    roofbox: true,
  },

  origin: { name: 'Uster', lat: 47.3492, lng: 8.7208 },
  target: { name: 'Reine, Lofoten', lat: 67.932, lng: 13.0877 },
};
