mapboxgl.accessToken = 'pk.eyJ1Ijoic2hhZG93enJlIiwiYSI6ImNtNmZhbDRzZjAyeTUybHNiOXhnNzh6M2YifQ.Ubtj7ZIWSpWGtiAFSYoCOw';
let map, userMarker, destinationMarker, timerInterval, startTime, distanceWalked = 0;

function initMap() {
  map = new mapboxgl.Map({
    container: 'map', // Map container ID
    style: 'mapbox://styles/mapbox/streets-v11', // Map style
    zoom: 14, // Default zoom level
  });

  // Add Geolocate control
  const geolocate = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showAccuracyCircle: false,
  });

  map.addControl(geolocate);

  // Wait for the user's location
  geolocate.on('geolocate', (e) => {
    const userLocation = [e.coords.longitude, e.coords.latitude];
    map.setCenter(userLocation);

    // Add a marker at the user's location
    if (userMarker) userMarker.remove();
    userMarker = new mapboxgl.Marker()
      .setLngLat(userLocation)
      .addTo(map);

    // Enable the start button once the location is ready
    document.getElementById('start').disabled = false;

    // Draw the area circle initially (for testing)
    const radius = parseInt(document.getElementById('radius').value);
    drawAreaCircle(userLocation, radius);
  });

  // Trigger geolocation after map loads
  map.on('load', () => {
    geolocate.trigger();
  });
}

// Populate radius dropdown
function populateRadiusDropdown() {
  const radiusDropdown = document.getElementById('radius');
  for (let i = 1; i <= 100; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.text = `${i} km`;
    if (i === 5) option.selected = true;
    radiusDropdown.appendChild(option);
  }
}

// Draw a circle representing the area
function drawAreaCircle(center, radiusKm) {
  // Remove existing circle if present
  if (map.getLayer('circle-layer')) map.removeLayer('circle-layer');
  if (map.getSource('circle-source')) map.removeSource('circle-source');

  // Use Turf.js to generate a circle GeoJSON
  const circle = turf.circle(center, radiusKm, {
    steps: 64, // Higher steps = smoother circle
    units: 'kilometers',
  });

  map.addSource('circle-source', {
    type: 'geojson',
    data: circle,
  });

  map.addLayer({
    id: 'circle-layer',
    type: 'fill',
    source: 'circle-source',
    paint: {
      'fill-color': 'blue',
      'fill-opacity': 0.3,
    },
  });
}

// Remove the area circle
function removeAreaCircle() {
  if (map.getLayer('circle-layer')) map.removeLayer('circle-layer');
  if (map.getSource('circle-source')) map.removeSource('circle-source');
}

// Generate a random destination
function generateRandomDestination(center, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  
  // Adjusting bounding box logic to make sure it works for larger radii
  const latOffset = radiusKm / 111.32;  // 1 degree of latitude = 111.32 km
  const lngOffset = radiusKm / (111.32 * Math.cos(center[1] * Math.PI / 180));  // Adjust for longitude

  const minLat = center[1] - latOffset;
  const maxLat = center[1] + latOffset;
  const minLng = center[0] - lngOffset;
  const maxLng = center[0] + lngOffset;

  const randomPoint = turf.randomPoint(1, {
    bbox: [minLng, minLat, maxLng, maxLat],
  }).features[0];

  // Check if point is within the radius, if not, regenerate
  const distance = turf.distance(turf.point(center), randomPoint, { units: 'kilometers' });
  
  return distance <= radiusKm ? randomPoint.geometry.coordinates : generateRandomDestination(center, radiusKm);
}

// Display directions on the map
function displayDirections(start, end) {
  if (map.getLayer('route-layer')) map.removeLayer('route-layer');
  if (map.getSource('route-source')) map.removeSource('route-source');

  const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.join(',')};${end.join(',')}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
  fetch(directionsUrl)
    .then((response) => response.json())
    .then((data) => {
      const route = data.routes[0].geometry;
      map.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: route,
        },
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route-source',
        paint: {
          'line-color': 'red',
          'line-width': 4,
        },
      });
    });
}

// Start tracking
document.getElementById('start').addEventListener('click', () => {
  const radius = parseInt(document.getElementById('radius').value);
  const userLocation = userMarker.getLngLat().toArray();

  // Draw area circle initially
  drawAreaCircle(userLocation, radius);

  // Generate random destination
  const destination = generateRandomDestination(userLocation, radius);

  // Add a marker for the destination
  if (destinationMarker) destinationMarker.remove();
  destinationMarker = new mapboxgl.Marker({ color: 'red' })
    .setLngLat(destination)
    .addTo(map);

  // Display directions
  displayDirections(userLocation, destination);

  // Timer and distance tracking
  startTime = Date.now();
  distanceWalked = 0;
  document.getElementById('distance').textContent = distanceWalked.toFixed(2);

  timerInterval = setInterval(() => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = elapsedTime;
  }, 1000);

  // Hide the area circle after clicking start
  removeAreaCircle();

  // Update button states
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
});

// Stop tracking
document.getElementById('stop').addEventListener('click', () => {
  clearInterval(timerInterval);
  document.getElementById('stop').disabled = true;
  document.getElementById('start').disabled = false;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  populateRadiusDropdown();
  initMap();
});
