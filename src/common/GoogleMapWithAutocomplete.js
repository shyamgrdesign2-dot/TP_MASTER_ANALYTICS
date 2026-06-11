import React, { useEffect, useRef } from 'react';

function loadGoogleMapsApi(apiKey, callback) {
  if (window.google && window.google.maps && window.google.maps.places) {
    callback();
    return;
  }
  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    existingScript.onload = callback;
    return;
  }
  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
}

function parseAddressComponents(components, formatted_address) {
  const result = {
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    address1: '',
    address2: '',
    locality: '',
    formatted_address: formatted_address || '',
  };
  for (const component of components) {
    const type = component.types[0];
    switch (type) {
      case 'street_number':
        result.street = component.long_name + ' ' + result.street;
        break;
      case 'route':
        result.street += component.short_name;
        break;
      case 'locality':
        result.city = component.long_name;
        result.locality = component.long_name;
        break;
      case 'administrative_area_level_1':
        result.state = component.short_name;
        break;
      case 'country':
        result.country = component.long_name;
        break;
      case 'postal_code':
        result.postalCode = component.long_name;
        break;
      case 'sublocality_level_1':
        result.address2 = component.long_name;
        break;
      default:
        break;
    }
  }
  result.address1 = result.street;
  return result;
}

const GoogleMapWithAutocomplete = ({
  apiKey,
  defaultCenter = { lat: 40.749933, lng: -73.98633 },
  defaultZoom = 13,
  onPlaceSelect,
  mapHeight = 400,
  mapWidth = '100%',
  placeholder = 'Search for a place...',
  hideMap = false,
  value = '',
}) => {
  const mapRef = useRef(null);
  const inputRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerRef = useRef(null);
  const googleMapRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMapsApi(apiKey, () => {
      if (!window.google || (!hideMap && !mapRef.current) || !inputRef.current) return;
      
      // Set the input value if provided
      if (inputRef.current && value) {
        inputRef.current.value = value;
      }
      // Create map only if not hidden
      if (!hideMap) {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          mapTypeControl: false,
        });
        // Create info window
        infoWindowRef.current = new window.google.maps.InfoWindow();
        // Create marker
        markerRef.current = new window.google.maps.Marker({
          map: googleMapRef.current,
          anchorPoint: new window.google.maps.Point(0, -29),
        });
      }
      // Create autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
        strictBounds: false,
      });
      // Bind autocomplete to map's bounds if map is shown
      if (!hideMap && googleMapRef.current) {
        autocompleteRef.current.bindTo('bounds', googleMapRef.current);
      }
      // Place changed listener
      autocompleteRef.current.addListener('place_changed', () => {
        if (!hideMap) {
          infoWindowRef.current.close();
          markerRef.current.setVisible(false);
        }
        const place = autocompleteRef.current.getPlace();
        if (!place.geometry || !place.geometry.location) {
          window.alert("No details available for input: '" + place.name + "'");
          return;
        }
        // Center/zoom map and marker if map is shown
        if (!hideMap && googleMapRef.current) {
          if (place.geometry.viewport) {
            googleMapRef.current.fitBounds(place.geometry.viewport);
          } else {
            googleMapRef.current.setCenter(place.geometry.location);
            googleMapRef.current.setZoom(17);
          }
          markerRef.current.setPosition(place.geometry.location);
          markerRef.current.setVisible(true);
          // Info window
          const infoContent = `<div><strong id="place-name">${place.name || ''}</strong><br/><span id="place-address">${place.formatted_address || ''}</span></div>`;
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(googleMapRef.current, markerRef.current);
        }
        // Parse address and lat/lng for API
        const parsed = parseAddressComponents(place.address_components || [], place.formatted_address);
        // Defensive lat/lng extraction
        const lat = place.geometry && place.geometry.location
          ? (typeof place.geometry.location.lat === 'function'
              ? place.geometry.location.lat()
              : place.geometry.location.lat)
          : null;
        const lng = place.geometry && place.geometry.location
          ? (typeof place.geometry.location.lng === 'function'
              ? place.geometry.location.lng()
              : place.geometry.location.lng)
          : null;
        const googleMapsLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '';
        const googleLocation = {
          lat,
          lng,
          address: {
            state: parsed.state,
            city: parsed.city,
            street: parsed.address1,
            zip: parsed.postalCode,
            formatted: parsed.formatted_address,
            googleMapsLink
          }
        };
        if (onPlaceSelect) onPlaceSelect(place, googleLocation);
      });
    });
    // Cleanup
    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
    };
  }, [apiKey, defaultCenter, defaultZoom, onPlaceSelect, hideMap, value]);

  return (
    <div style={{ width: mapWidth }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        style={{ width: '100%', padding: 14, fontSize: 16, marginBottom: 8, borderRadius: 11, border: '1px solid #ccc' }}
      />
      {!hideMap && (
        <div
          ref={mapRef}
          style={{ width: '100%', height: mapHeight, borderRadius: 8, border: '1px solid #eee' }}
        />
      )}
    </div>
  );
};

export default GoogleMapWithAutocomplete; 