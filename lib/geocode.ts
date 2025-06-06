export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
}

export interface GeocodeOptions {
  proximity?: Coordinates;
  limit?: number;
}

// Helper function to calculate distance between coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function geocodeAddress(
  address: string, 
  options: GeocodeOptions = { limit: 5 }
): Promise<GeocodeResult | null> {
  if (!address.trim()) return null;
  
  try {
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    const params = new URLSearchParams({
      q: encodedAddress,
      format: 'json',
      addressdetails: '1',
      limit: (options.limit || 5).toString(),
      namedetails: '1',
      countrycodes: 'us',
      'accept-language': 'en-US',
      dedupe: '1',
      polygon_threshold: '0.1'
    });
    
    // Add proximity bias if coordinates are provided
    if (options.proximity) {
      // Use a smaller viewbox (0.05 degrees ≈ 5.5km) for more relevant local results
      const viewbox = [
        options.proximity.longitude - 0.05, // left
        options.proximity.latitude + 0.05,  // top
        options.proximity.longitude + 0.05, // right
        options.proximity.latitude - 0.05   // bottom
      ].join(',');
      
      params.set('viewbox', viewbox);
      params.set('bounded', '1');
      
      // Add the user's location as the center point for ranking
      params.set('lat', options.proximity.latitude.toString());
      params.set('lon', options.proximity.longitude.toString());
    }
    
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    console.log('Geocoding URL:', url);
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'MinistryTracker/1.0 (your-email@example.com)',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status, response.statusText);
      return null;
    }
    
    let results = await response.json();
    
    if (!results || results.length === 0) {
      console.log('No results found for address:', address);
      return null;
    }
    
    // Always process and sort by distance if we have proximity coordinates
    if (options.proximity) {
      results = results
        .map((result: any) => ({
          ...result,
          distance: calculateDistance(
            options.proximity!.latitude,
            options.proximity!.longitude,
            parseFloat(result.lat),
            parseFloat(result.lon)
          )
        }))
        .sort((a: any, b: any) => a.distance - b.distance);
      
      console.log('Sorted results by distance:', results.map((r: any) => ({
        address: r.display_name,
        distance: r.distance.toFixed(2) + ' km'
      })));
    }
    
    const result = results[0];
    const addressDetails = result.address;
    
    // Construct a well-formatted address
    const addressParts = [
      addressDetails.house_number ? `${addressDetails.house_number} ${addressDetails.road || ''}`.trim() : addressDetails.road,
      addressDetails.city || addressDetails.town || addressDetails.village,
      addressDetails.state,
      addressDetails.postcode
    ].filter(Boolean);
    
    const formattedAddress = addressParts.join(', ');
    
    return {
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      },
      formattedAddress: formattedAddress || address // Fallback to original if formatting fails
    };
  } catch (error) {
    console.error('Error during geocoding:', error);
    return null;
  }
}
