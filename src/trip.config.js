// NORDLYS — zentrale Konfiguration.
// Hier anpassen: Startdatum, Auto. Die Crew-Akten leben in src/data/crew.json,
// alles andere in src/data/*.json.

export const TRIP = {
  title: 'NORDLYS',
  subline: 'Uster → Lofoten · 16 Tage · 4 Mann · 1 Stelvio',
  startDate: '2026-08-24', // Abfahrt, Europe/Zurich (Format YYYY-MM-DD)
  startTime: '06:00', // geplante Abfahrtszeit
  days: 16,
  timezone: 'Europe/Zurich',

  car: {
    model: 'Alfa Romeo Stelvio',
    fuel: 'Benzin', // 'Benzin' | 'Diesel' — steuert den Default-Verbrauch im Budget
    roofbox: false,
  },

  origin: { name: 'Uster', lat: 47.3492, lng: 8.7208 },
  target: { name: 'Reine, Lofoten', lat: 67.932, lng: 13.0877 },
};
