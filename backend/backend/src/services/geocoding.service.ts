import axios from 'axios';

export interface LocationSuggestion {
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
  importance?: number;
  source: 'nominatim' | 'municipal_directory';
}

// Pre-indexed high-accuracy municipal reference locations in Bengaluru
const MUNICIPAL_REFERENCE_LOCATIONS: Array<{
  keywords: string[];
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
}> = [
  {
    keywords: ['indiranagar', 'indira nagar', '100 feet road', 'cmh road', 'defense colony', 'ward 74'],
    name: 'Indiranagar',
    displayName: 'Indiranagar, Bengaluru, Karnataka 560038, India',
    latitude: 12.9784,
    longitude: 77.6408,
    type: 'suburb'
  },
  {
    keywords: ['mg road', 'm.g. road', 'mahatma gandhi road', 'trinity', 'brigade road', 'ward 14'],
    name: 'MG Road',
    displayName: 'Mahatma Gandhi Road, Central Bengaluru, Karnataka 560001, India',
    latitude: 12.9756,
    longitude: 77.6066,
    type: 'commercial'
  },
  {
    keywords: ['koramangala', 'kora', 'sony world', '80 feet road', 'ward 151'],
    name: 'Koramangala',
    displayName: 'Koramangala, Bengaluru, Karnataka 560034, India',
    latitude: 12.9352,
    longitude: 77.6245,
    type: 'suburb'
  },
  {
    keywords: ['jayanagar', 'jaya nagar', '4th block', 'ward 153'],
    name: 'Jayanagar',
    displayName: 'Jayanagar, Bengaluru, Karnataka 560011, India',
    latitude: 12.9308,
    longitude: 77.5838,
    type: 'suburb'
  },
  {
    keywords: ['whitefield', 'itpl', 'hope farm', 'kadugodi', 'ward 84'],
    name: 'Whitefield',
    displayName: 'Whitefield, Bengaluru, Karnataka 560066, India',
    latitude: 12.9698,
    longitude: 77.7500,
    type: 'tech_hub'
  },
  {
    keywords: ['hsr', 'hsr layout', 'sector 1', 'sector 4', 'ward 174'],
    name: 'HSR Layout',
    displayName: 'HSR Layout, Bengaluru, Karnataka 560102, India',
    latitude: 12.9121,
    longitude: 77.6446,
    type: 'suburb'
  },
  {
    keywords: ['malleshwaram', 'malleswaram', 'sampige road', 'ward 45'],
    name: 'Malleshwaram',
    displayName: 'Malleshwaram, Bengaluru, Karnataka 560003, India',
    latitude: 13.0031,
    longitude: 77.5643,
    type: 'suburb'
  },
  {
    keywords: ['hebbal', 'manyata', 'hebbal flyover', 'ward 7'],
    name: 'Hebbal',
    displayName: 'Hebbal, Bengaluru, Karnataka 560024, India',
    latitude: 13.0358,
    longitude: 77.5970,
    type: 'suburb'
  },
  {
    keywords: ['rajajinagar', 'rajaji nagar', 'isckon', 'ward 98'],
    name: 'Rajajinagar',
    displayName: 'Rajajinagar, Bengaluru, Karnataka 560010, India',
    latitude: 12.9982,
    longitude: 77.5530,
    type: 'suburb'
  },
  {
    keywords: ['electronic city', 'ecity', 'infosys', 'ward 192'],
    name: 'Electronic City',
    displayName: 'Electronic City Phase 1, Bengaluru, Karnataka 560100, India',
    latitude: 12.8452,
    longitude: 77.6602,
    type: 'tech_hub'
  },
  {
    keywords: ['central ward', 'cubbon park', 'vidhana soudha', 'ward 101'],
    name: 'Central Ward / City Center',
    displayName: 'Central Administrative Ward, Bengaluru, Karnataka 560001, India',
    latitude: 12.9716,
    longitude: 77.5946,
    type: 'administrative'
  },
  {
    keywords: ['ulsoor', 'halasuru', 'someshwara', 'ward 81'],
    name: 'Ulsoor / Halasuru',
    displayName: 'Halasuru (Ulsoor), Bengaluru, Karnataka 560008, India',
    latitude: 12.9818,
    longitude: 77.6254,
    type: 'suburb'
  },
  {
    keywords: ['bellandur', 'outer ring road', 'ecospace', 'ward 150'],
    name: 'Bellandur',
    displayName: 'Bellandur, Outer Ring Road, Bengaluru, Karnataka 560103, India',
    latitude: 12.9304,
    longitude: 77.6784,
    type: 'suburb'
  },
  {
    keywords: ['marathahalli', 'marathalli', 'bridge', 'ward 85'],
    name: 'Marathahalli',
    displayName: 'Marathahalli, Bengaluru, Karnataka 560037, India',
    latitude: 12.9591,
    longitude: 77.6974,
    type: 'suburb'
  },
  {
    keywords: ['btm', 'btm layout', 'tavarekere', 'ward 176'],
    name: 'BTM Layout',
    displayName: 'BTM Layout 2nd Stage, Bengaluru, Karnataka 560076, India',
    latitude: 12.9166,
    longitude: 77.6101,
    type: 'suburb'
  }
];

// Simple in-memory LRU-like cache
const cache = new Map<string, { timestamp: number; data: LocationSuggestion[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export class GeocodingService {
  /**
   * Search locations with Nominatim OpenStreetMap + Municipal Directory fallback
   */
  async searchLocations(query: string, limit = 5): Promise<LocationSuggestion[]> {
    const cleanQuery = (query || '').trim().toLowerCase();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    // Check cache
    const cached = cache.get(cleanQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // 1. Check Municipal Reference Locations
    const directoryMatches: LocationSuggestion[] = [];
    for (const ref of MUNICIPAL_REFERENCE_LOCATIONS) {
      if (ref.keywords.some(k => cleanQuery.includes(k) || k.includes(cleanQuery))) {
        directoryMatches.push({
          displayName: ref.displayName,
          name: ref.name,
          latitude: ref.latitude,
          longitude: ref.longitude,
          type: ref.type,
          importance: 0.95,
          source: 'municipal_directory'
        });
      }
    }

    // 2. Query Nominatim OpenStreetMap
    let nominatimResults: LocationSuggestion[] = [];
    try {
      // Append city if not mentioned to prioritize local city context
      const searchQuery = cleanQuery.includes('bengaluru') || cleanQuery.includes('bangalore')
        ? cleanQuery
        : `${cleanQuery}, Bengaluru, India`;

      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: searchQuery,
          limit,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'CivicOS-SmartCity-Platform/1.0',
          'Accept-Language': 'en',
        },
        timeout: 4000,
      });

      if (Array.isArray(res.data) && res.data.length > 0) {
        nominatimResults = res.data.map((item: any) => ({
          displayName: item.display_name,
          name: item.name || item.display_name.split(',')[0],
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          type: item.type || item.class || 'place',
          importance: item.importance || 0.7,
          source: 'nominatim' as const,
        }));
      }
    } catch (err: any) {
      console.warn('[GeocodingService] Nominatim query failed or timed out:', err.message);
    }

    // 3. Merge results (Directory matches first, then unique Nominatim results)
    const combined: LocationSuggestion[] = [...directoryMatches];
    nominatimResults.forEach(nom => {
      // Avoid duplicate coordinates (within ~200 meters)
      const isDuplicate = combined.some(c =>
        Math.abs(c.latitude - nom.latitude) < 0.002 &&
        Math.abs(c.longitude - nom.longitude) < 0.002
      );
      if (!isDuplicate) {
        combined.push(nom);
      }
    });

    const finalResults = combined.slice(0, limit);
    cache.set(cleanQuery, { timestamp: Date.now(), data: finalResults });
    return finalResults;
  }

  /**
   * Reverse geocode coordinates to human-readable address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{
    displayName: string;
    locality: string;
    ward?: string;
  }> {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'CivicOS-SmartCity-Platform/1.0',
          'Accept-Language': 'en',
        },
        timeout: 4000,
      });

      if (res.data) {
        const addr = res.data.address || {};
        const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || 'Bengaluru Urban';
        const ward = addr.city_district || addr.suburb || 'Central Ward';
        return {
          displayName: res.data.display_name || `${locality}, Bengaluru`,
          locality,
          ward,
        };
      }
    } catch (err: any) {
      console.warn('[GeocodingService] Reverse geocoding failed:', err.message);
    }

    // Fallback based on closest reference location
    let closest = MUNICIPAL_REFERENCE_LOCATIONS[0];
    let minDiff = Infinity;
    for (const ref of MUNICIPAL_REFERENCE_LOCATIONS) {
      const diff = Math.hypot(ref.latitude - latitude, ref.longitude - longitude);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ref;
      }
    }

    return {
      displayName: `Near ${closest.name}, Bengaluru`,
      locality: closest.name,
      ward: 'Ward 14',
    };
  }
}

export const geocodingService = new GeocodingService();
