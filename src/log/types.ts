// Logbuch — Datenverträge. Die Tages-JSONs (src/data/log/tag-NN.json) werden von Hand
// geschrieben, die Manifeste (tag-NN.media.json) vom Import-Script erzeugt, index.json vom
// Seiten-Generator. Alles, was die Seiten rendern, kommt aus diesen drei Quellen.

export type StayType = 'zelt' | 'auto' | 'camping' | 'home' | 'hotel' | 'bungalow' | 'hof';
export type Mood = 'autobahn' | 'taiga' | 'arctic' | 'lofoten' | 'fjord' | 'heim';

export interface LogQuote {
  quote: string;
  who?: string;
}

export interface LogDay {
  day: number;
  date: string; // YYYY-MM-DD
  status: 'online' | 'entwurf';
  title: string;
  lead: string;
  place: { name: string; region?: string; lat: number; lng: number };
  mood: Mood;
  /** true oder z. B. "Kp 3" — schaltet das Aurora-Badge */
  aurora?: boolean | string;
  /** Medien-ID des Hero-Bilds (p-0xx oder v-0xx) */
  hero: string;
  /** Kuratierung: diese IDs bleiben im Manifest, erscheinen aber nicht in der Galerie (gleiche Motive, Ausschuss) */
  omit?: string[];
  stats: {
    km: number;
    kmTotal: number;
    drive?: string;
    weather?: string;
    night: { type: StayType; text: string };
  };
  timeline?: { t: string; title: string; text?: string }[];
  story: (string | LogQuote)[];
  captions?: Record<string, string>;
  numbers?: { k: string; v: string }[];
  tomorrow?: string;
  track?: 'planned' | 'gpx' | 'none';
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  orig: string;
  bytes: number;
  /** Foto: Pfad relativ zur Site-Wurzel · Video: absolute Release-URL */
  src: string;
  thumb: string;
  lqip: string;
  w: number;
  h: number;
  taken: string | null;
  takenSource: 'exif' | 'container' | 'mtime' | 'none';
  gps: [number, number] | null;
  camera: string | null;
  /** nur Video */
  size?: number;
  poster?: string;
  duration?: number;
}

export interface MediaManifest {
  day: number;
  stand: string | null;
  items: MediaItem[];
}

export interface LogIndexEntry {
  day: number;
  date: string;
  title: string;
  lead: string;
  place: string;
  lat: number;
  lng: number;
  mood: Mood;
  km: number;
  kmTotal: number;
  night: StayType;
  photos: number;
  videos: number;
  hero: { thumb: string; lqip: string; w: number; h: number };
  url: string;
}

export interface LogIndex {
  stand: string;
  days: LogIndexEntry[];
}
