import { ENV } from "./config.js";
import verifiedPanos from "./verified_panos.json" with { type: "json" };

export interface PickedLocation {
  imageId: string;
  lat: number;
  lng: number;
}

interface Region {
  name: string;
  lat: number;
  lng: number;
  spanLat: number;
  spanLng: number;
}

// Curated areas with good Mapillary coverage. Coords are region centers;
// a random point is picked inside each span.
const REGIONS: Region[] = [
  // =========================================================================
  // --- UNITED STATES (ALL 50 STATES + TERRITORIES) ---
  // =========================================================================
  // Pacific & West Coast
  { name: "San Francisco & Bay Area, California, USA", lat: 37.77, lng: -122.42, spanLat: 0.3, spanLng: 0.3 },
  { name: "Los Angeles & Orange County, California, USA", lat: 34.05, lng: -118.25, spanLat: 0.4, spanLng: 0.4 },
  { name: "San Diego & La Jolla, California, USA", lat: 32.71, lng: -117.16, spanLat: 0.3, spanLng: 0.3 },
  { name: "San Jose & Silicon Valley, California, USA", lat: 37.33, lng: -121.89, spanLat: 0.25, spanLng: 0.25 },
  { name: "Sacramento & Central Valley, California, USA", lat: 38.58, lng: -121.49, spanLat: 0.25, spanLng: 0.25 },
  { name: "Lake Tahoe & Sierra Nevada, California, USA", lat: 39.09, lng: -120.03, spanLat: 0.2, spanLng: 0.2 },
  { name: "Seattle & Puget Sound, Washington, USA", lat: 47.6, lng: -122.33, spanLat: 0.3, spanLng: 0.3 },
  { name: "Spokane, Washington, USA", lat: 47.65, lng: -117.42, spanLat: 0.2, spanLng: 0.2 },
  { name: "Portland & Willamette Valley, Oregon, USA", lat: 45.52, lng: -122.68, spanLat: 0.25, spanLng: 0.25 },
  { name: "Eugene & Oregon Coast, Oregon, USA", lat: 44.05, lng: -123.08, spanLat: 0.2, spanLng: 0.2 },
  { name: "Honolulu & Oahu, Hawaii, USA", lat: 21.3, lng: -157.85, spanLat: 0.2, spanLng: 0.2 },
  { name: "Maui & Big Island, Hawaii, USA", lat: 20.79, lng: -156.33, spanLat: 0.25, spanLng: 0.25 },
  { name: "Anchorage & Kenai, Alaska, USA", lat: 61.21, lng: -149.9, spanLat: 0.2, spanLng: 0.2 },
  { name: "Fairbanks & Denali Highway, Alaska, USA", lat: 64.83, lng: -147.71, spanLat: 0.25, spanLng: 0.25 },
  { name: "Juneau (Inside Passage), Alaska, USA", lat: 58.3, lng: -134.41, spanLat: 0.15, spanLng: 0.15 },

  // Mountain & Southwest
  { name: "Phoenix & Scottsdale, Arizona, USA", lat: 33.45, lng: -112.07, spanLat: 0.35, spanLng: 0.35 },
  { name: "Tucson & Sonoran Desert, Arizona, USA", lat: 32.22, lng: -110.97, spanLat: 0.25, spanLng: 0.25 },
  { name: "Flagstaff & Grand Canyon, Arizona, USA", lat: 35.19, lng: -111.65, spanLat: 0.2, spanLng: 0.2 },
  { name: "Las Vegas & Red Rock, Nevada, USA", lat: 36.17, lng: -115.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Reno & Lake Tahoe, Nevada, USA", lat: 39.52, lng: -119.81, spanLat: 0.2, spanLng: 0.2 },
  { name: "Denver & Front Range, Colorado, USA", lat: 39.74, lng: -104.99, spanLat: 0.3, spanLng: 0.3 },
  { name: "Colorado Springs & Pikes Peak, Colorado, USA", lat: 38.83, lng: -104.82, spanLat: 0.2, spanLng: 0.2 },
  { name: "Aspen & Rocky Mountains, Colorado, USA", lat: 39.19, lng: -106.81, spanLat: 0.2, spanLng: 0.2 },
  { name: "Salt Lake City & Wasatch Range, Utah, USA", lat: 40.76, lng: -111.89, spanLat: 0.25, spanLng: 0.25 },
  { name: "Moab & Red Rocks (Arches / Zion), Utah, USA", lat: 38.57, lng: -109.54, spanLat: 0.2, spanLng: 0.2 },
  { name: "Albuquerque & Rio Grande, New Mexico, USA", lat: 35.09, lng: -106.65, spanLat: 0.25, spanLng: 0.25 },
  { name: "Santa Fe & Taos, New Mexico, USA", lat: 35.68, lng: -105.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Boise & Treasure Valley, Idaho, USA", lat: 43.61, lng: -116.2, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bozeman & Yellowstone Highway, Montana, USA", lat: 45.67, lng: -111.04, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jackson Hole & Grand Tetons, Wyoming, USA", lat: 43.47, lng: -110.76, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cheyenne, Wyoming, USA", lat: 41.13, lng: -104.82, spanLat: 0.15, spanLng: 0.15 },

  // South & Texas
  { name: "Austin & Texas Hill Country, Texas, USA", lat: 30.27, lng: -97.74, spanLat: 0.3, spanLng: 0.3 },
  { name: "Dallas & Fort Worth, Texas, USA", lat: 32.78, lng: -96.8, spanLat: 0.35, spanLng: 0.35 },
  { name: "Houston & Gulf Coast, Texas, USA", lat: 29.76, lng: -95.37, spanLat: 0.35, spanLng: 0.35 },
  { name: "San Antonio & River Walk, Texas, USA", lat: 29.42, lng: -98.49, spanLat: 0.3, spanLng: 0.3 },
  { name: "El Paso & Franklin Mountains, Texas, USA", lat: 31.76, lng: -106.48, spanLat: 0.2, spanLng: 0.2 },
  { name: "Miami & Biscayne Bay, Florida, USA", lat: 25.76, lng: -80.19, spanLat: 0.3, spanLng: 0.3 },
  { name: "Orlando & Theme Parks, Florida, USA", lat: 28.54, lng: -81.38, spanLat: 0.25, spanLng: 0.25 },
  { name: "Tampa & St. Petersburg, Florida, USA", lat: 27.95, lng: -82.46, spanLat: 0.25, spanLng: 0.25 },
  { name: "Jacksonville & Atlantic Coast, Florida, USA", lat: 30.33, lng: -81.65, spanLat: 0.3, spanLng: 0.3 },
  { name: "Key West & Florida Keys, Florida, USA", lat: 24.56, lng: -81.78, spanLat: 0.1, spanLng: 0.1 },
  { name: "Atlanta & Buckhead, Georgia, USA", lat: 33.75, lng: -84.39, spanLat: 0.3, spanLng: 0.3 },
  { name: "Savannah (Historic District), Georgia, USA", lat: 32.08, lng: -81.09, spanLat: 0.15, spanLng: 0.15 },
  { name: "New Orleans (French Quarter), Louisiana, USA", lat: 29.95, lng: -90.07, spanLat: 0.2, spanLng: 0.2 },
  { name: "Baton Rouge, Louisiana, USA", lat: 30.45, lng: -91.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nashville (Music City), Tennessee, USA", lat: 36.16, lng: -86.78, spanLat: 0.25, spanLng: 0.25 },
  { name: "Memphis & Beale Street, Tennessee, USA", lat: 35.15, lng: -90.05, spanLat: 0.25, spanLng: 0.25 },
  { name: "Charlotte, North Carolina, USA", lat: 35.22, lng: -80.84, spanLat: 0.25, spanLng: 0.25 },
  { name: "Raleigh & Research Triangle, North Carolina, USA", lat: 35.77, lng: -78.63, spanLat: 0.25, spanLng: 0.25 },
  { name: "Asheville & Blue Ridge Parkway, North Carolina, USA", lat: 35.59, lng: -82.55, spanLat: 0.2, spanLng: 0.2 },
  { name: "Charleston (Historic Harbor), South Carolina, USA", lat: 32.77, lng: -79.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Birmingham, Alabama, USA", lat: 33.52, lng: -86.81, spanLat: 0.2, spanLng: 0.2 },
  { name: "Little Rock, Arkansas, USA", lat: 34.74, lng: -92.28, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jackson & Mississippi Delta, Mississippi, USA", lat: 32.29, lng: -90.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Louisville & Churchill Downs, Kentucky, USA", lat: 38.25, lng: -85.75, spanLat: 0.2, spanLng: 0.2 },
  { name: "Oklahoma City & Bricktown, Oklahoma, USA", lat: 35.46, lng: -97.51, spanLat: 0.25, spanLng: 0.25 },

  // Midwest & Great Lakes
  { name: "Chicago & Loop, Illinois, USA", lat: 41.88, lng: -87.63, spanLat: 0.3, spanLng: 0.3 },
  { name: "Detroit & Motor City, Michigan, USA", lat: 42.33, lng: -83.05, spanLat: 0.3, spanLng: 0.3 },
  { name: "Grand Rapids & Lake Michigan, Michigan, USA", lat: 42.96, lng: -85.66, spanLat: 0.2, spanLng: 0.2 },
  { name: "Minneapolis & St. Paul (Twin Cities), Minnesota, USA", lat: 44.98, lng: -93.27, spanLat: 0.25, spanLng: 0.25 },
  { name: "Indianapolis & Speedway, Indiana, USA", lat: 39.76, lng: -86.15, spanLat: 0.25, spanLng: 0.25 },
  { name: "Columbus, Ohio, USA", lat: 39.96, lng: -83.0, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cleveland & Lake Erie, Ohio, USA", lat: 41.5, lng: -81.69, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cincinnati & Ohio River, Ohio, USA", lat: 39.1, lng: -84.51, spanLat: 0.25, spanLng: 0.25 },
  { name: "Milwaukee & Lake Michigan, Wisconsin, USA", lat: 43.03, lng: -87.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Madison, Wisconsin, USA", lat: 43.07, lng: -89.4, spanLat: 0.15, spanLng: 0.15 },
  { name: "St. Louis & Gateway Arch, Missouri, USA", lat: 38.63, lng: -90.2, spanLat: 0.25, spanLng: 0.25 },
  { name: "Kansas City, Missouri, USA", lat: 39.1, lng: -94.58, spanLat: 0.25, spanLng: 0.25 },
  { name: "Des Moines, Iowa, USA", lat: 41.58, lng: -93.62, spanLat: 0.2, spanLng: 0.2 },
  { name: "Omaha, Nebraska, USA", lat: 41.25, lng: -95.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Wichita, Kansas, USA", lat: 37.68, lng: -97.33, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sioux Falls, South Dakota, USA", lat: 43.54, lng: -96.73, spanLat: 0.15, spanLng: 0.15 },
  { name: "Fargo, North Dakota, USA", lat: 46.87, lng: -96.78, spanLat: 0.15, spanLng: 0.15 },

  // Northeast & Mid-Atlantic
  { name: "New York City (Manhattan / Brooklyn), New York, USA", lat: 40.71, lng: -74.0, spanLat: 0.3, spanLng: 0.3 },
  { name: "Buffalo & Niagara Falls, New York, USA", lat: 42.88, lng: -78.87, spanLat: 0.2, spanLng: 0.2 },
  { name: "Boston & Cambridge, Massachusetts, USA", lat: 42.36, lng: -71.06, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cape Cod & Martha's Vineyard, Massachusetts, USA", lat: 41.66, lng: -70.3, spanLat: 0.2, spanLng: 0.2 },
  { name: "Philadelphia & Center City, Pennsylvania, USA", lat: 39.95, lng: -75.16, spanLat: 0.25, spanLng: 0.25 },
  { name: "Pittsburgh & Three Rivers, Pennsylvania, USA", lat: 40.44, lng: -79.99, spanLat: 0.25, spanLng: 0.25 },
  { name: "Washington DC (National Mall / Capitol), USA", lat: 38.9, lng: -77.04, spanLat: 0.25, spanLng: 0.25 },
  { name: "Baltimore & Inner Harbor, Maryland, USA", lat: 39.29, lng: -76.61, spanLat: 0.2, spanLng: 0.2 },
  { name: "Providence & Newport, Rhode Island, USA", lat: 41.82, lng: -71.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hartford & New Haven, Connecticut, USA", lat: 41.76, lng: -72.68, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jersey City & Hoboken, New Jersey, USA", lat: 40.72, lng: -74.04, spanLat: 0.15, spanLng: 0.15 },
  { name: "Portland & Coastal Maine, Maine, USA", lat: 43.66, lng: -70.25, spanLat: 0.2, spanLng: 0.2 },
  { name: "Manchester & White Mountains, New Hampshire, USA", lat: 42.99, lng: -71.45, spanLat: 0.2, spanLng: 0.2 },
  { name: "Burlington & Lake Champlain, Vermont, USA", lat: 44.47, lng: -73.21, spanLat: 0.15, spanLng: 0.15 },
  { name: "Richmond, Virginia, USA", lat: 37.54, lng: -77.43, spanLat: 0.2, spanLng: 0.2 },
  { name: "Virginia Beach & Norfolk, Virginia, USA", lat: 36.85, lng: -75.97, spanLat: 0.2, spanLng: 0.2 },
  { name: "Charleston & Appalachia, West Virginia, USA", lat: 38.34, lng: -81.63, spanLat: 0.2, spanLng: 0.2 },
  { name: "Wilmington, Delaware, USA", lat: 39.74, lng: -75.54, spanLat: 0.15, spanLng: 0.15 },
  { name: "San Juan & Old San Juan, Puerto Rico, USA", lat: 18.46, lng: -66.11, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ponce & South Coast, Puerto Rico, USA", lat: 18.01, lng: -66.61, spanLat: 0.15, spanLng: 0.15 },
  { name: "St. Thomas & St. John, US Virgin Islands, USA", lat: 18.33, lng: -64.92, spanLat: 0.1, spanLng: 0.1 },
  { name: "Agana & Tumon Bay, Guam, USA", lat: 13.47, lng: 144.75, spanLat: 0.15, spanLng: 0.15 },

  // =========================================================================
  // --- CANADA (ALL 10 PROVINCES + 3 TERRITORIES) ---
  // =========================================================================
  { name: "Toronto & GTA, Ontario, Canada", lat: 43.65, lng: -79.38, spanLat: 0.3, spanLng: 0.3 },
  { name: "Ottawa & Parliament Hill, Ontario, Canada", lat: 45.42, lng: -75.69, spanLat: 0.25, spanLng: 0.25 },
  { name: "Hamilton & Niagara Peninsula, Ontario, Canada", lat: 43.25, lng: -79.87, spanLat: 0.2, spanLng: 0.2 },
  { name: "Montreal & Old Port, Quebec, Canada", lat: 45.5, lng: -73.57, spanLat: 0.3, spanLng: 0.3 },
  { name: "Quebec City & Old Quebec, Quebec, Canada", lat: 46.81, lng: -71.21, spanLat: 0.2, spanLng: 0.2 },
  { name: "Vancouver & Burrard Inlet, British Columbia, Canada", lat: 49.28, lng: -123.12, spanLat: 0.25, spanLng: 0.25 },
  { name: "Victoria & Vancouver Island, British Columbia, Canada", lat: 48.43, lng: -123.36, spanLat: 0.2, spanLng: 0.2 },
  { name: "Whistler & Sea-to-Sky Highway, British Columbia, Canada", lat: 50.11, lng: -122.95, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kelowna & Okanagan Valley, British Columbia, Canada", lat: 49.89, lng: -119.49, spanLat: 0.2, spanLng: 0.2 },
  { name: "Calgary & Bow River, Alberta, Canada", lat: 51.04, lng: -114.07, spanLat: 0.3, spanLng: 0.3 },
  { name: "Edmonton & North Saskatchewan, Alberta, Canada", lat: 53.54, lng: -113.49, spanLat: 0.25, spanLng: 0.25 },
  { name: "Banff & Jasper Canadian Rockies, Alberta, Canada", lat: 51.18, lng: -115.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Winnipeg & The Forks, Manitoba, Canada", lat: 49.89, lng: -97.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Saskatoon & South Saskatchewan, Saskatchewan, Canada", lat: 52.13, lng: -106.67, spanLat: 0.2, spanLng: 0.2 },
  { name: "Regina, Saskatchewan, Canada", lat: 50.45, lng: -104.61, spanLat: 0.2, spanLng: 0.2 },
  { name: "Halifax & Coastal Maritimes, Nova Scotia, Canada", lat: 44.65, lng: -63.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "St. John's & Avalon Peninsula, Newfoundland, Canada", lat: 47.56, lng: -52.71, spanLat: 0.15, spanLng: 0.15 },
  { name: "Fredericton & Moncton, New Brunswick, Canada", lat: 45.96, lng: -66.64, spanLat: 0.2, spanLng: 0.2 },
  { name: "Charlottetown & Red Sands, Prince Edward Island, Canada", lat: 46.24, lng: -63.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Whitehorse & Alaska Highway, Yukon, Canada", lat: 60.72, lng: -135.05, spanLat: 0.15, spanLng: 0.15 },
  { name: "Yellowknife & Great Slave Lake, NWT, Canada", lat: 62.45, lng: -114.37, spanLat: 0.15, spanLng: 0.15 },

  // =========================================================================
  // --- MEXICO & CENTRAL AMERICA ---
  // =========================================================================
  { name: "Mexico City (Zocalo / Reforma), Mexico", lat: 19.43, lng: -99.13, spanLat: 0.3, spanLng: 0.3 },
  { name: "Guadalajara & Zapopan, Jalisco, Mexico", lat: 20.67, lng: -103.35, spanLat: 0.25, spanLng: 0.25 },
  { name: "Monterrey & Cerro de la Silla, Nuevo Leon, Mexico", lat: 25.68, lng: -100.31, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cancun & Riviera Maya, Quintana Roo, Mexico", lat: 21.16, lng: -86.85, spanLat: 0.25, spanLng: 0.25 },
  { name: "Tulum & Cozumel, Quintana Roo, Mexico", lat: 20.21, lng: -87.46, spanLat: 0.2, spanLng: 0.2 },
  { name: "Merida (Chichen Itza Highway), Yucatan, Mexico", lat: 20.97, lng: -89.62, spanLat: 0.2, spanLng: 0.2 },
  { name: "Puebla & Cholula, Puebla, Mexico", lat: 19.04, lng: -98.2, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tijuana & Rosarito, Baja California, Mexico", lat: 32.51, lng: -117.03, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cabo San Lucas & La Paz, Baja California Sur, Mexico", lat: 22.89, lng: -109.91, spanLat: 0.2, spanLng: 0.2 },
  { name: "Oaxaca (Monte Alban), Oaxaca, Mexico", lat: 17.07, lng: -96.73, spanLat: 0.2, spanLng: 0.2 },
  { name: "San Cristobal de las Casas, Chiapas, Mexico", lat: 16.73, lng: -92.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Queretaro (Historic Aqueduct), Queretaro, Mexico", lat: 20.59, lng: -100.39, spanLat: 0.2, spanLng: 0.2 },
  { name: "Guanajuato & San Miguel de Allende, Guanajuato, Mexico", lat: 21.01, lng: -101.25, spanLat: 0.2, spanLng: 0.2 },
  { name: "Veracruz & Gulf Coast, Veracruz, Mexico", lat: 19.17, lng: -96.13, spanLat: 0.2, spanLng: 0.2 },
  { name: "Puerto Vallarta & Banderas Bay, Jalisco, Mexico", lat: 20.65, lng: -105.22, spanLat: 0.15, spanLng: 0.15 },
  { name: "San Jose & Central Valley, Costa Rica", lat: 9.93, lng: -84.08, spanLat: 0.2, spanLng: 0.2 },
  { name: "La Fortuna & Arenal Volcano, Costa Rica", lat: 10.47, lng: -84.64, spanLat: 0.15, spanLng: 0.15 },
  { name: "Panama City (Skyline & Casco Viejo), Panama", lat: 8.98, lng: -79.52, spanLat: 0.2, spanLng: 0.2 },
  { name: "Guatemala City, Guatemala", lat: 14.63, lng: -90.51, spanLat: 0.25, spanLng: 0.25 },
  { name: "Antigua Guatemala (Volcanoes), Guatemala", lat: 14.56, lng: -90.73, spanLat: 0.1, spanLng: 0.1 },
  { name: "Lake Atitlan (Panajachel), Guatemala", lat: 14.74, lng: -91.15, spanLat: 0.15, spanLng: 0.15 },
  { name: "Belize City & Caye Caulker, Belize", lat: 17.5, lng: -88.19, spanLat: 0.15, spanLng: 0.15 },
  { name: "San Salvador, El Salvador", lat: 13.69, lng: -89.22, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tegucigalpa & Roatan, Honduras", lat: 14.07, lng: -87.19, spanLat: 0.2, spanLng: 0.2 },
  { name: "Managua & Granada, Nicaragua", lat: 12.13, lng: -86.25, spanLat: 0.2, spanLng: 0.2 },

  // Caribbean
  { name: "Santo Domingo (Zona Colonial), Dominican Republic", lat: 18.48, lng: -69.93, spanLat: 0.25, spanLng: 0.25 },
  { name: "Punta Cana & Bavaro, Dominican Republic", lat: 18.56, lng: -68.37, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kingston & Blue Mountains, Jamaica", lat: 18.01, lng: -76.79, spanLat: 0.2, spanLng: 0.2 },
  { name: "Montego Bay & Negril, Jamaica", lat: 18.47, lng: -77.92, spanLat: 0.15, spanLng: 0.15 },
  { name: "Nassau & Paradise Island, Bahamas", lat: 25.04, lng: -77.35, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bridgetown & Platinum Coast, Barbados", lat: 13.1, lng: -59.62, spanLat: 0.15, spanLng: 0.15 },
  { name: "Port of Spain & Maracas Bay, Trinidad & Tobago", lat: 10.66, lng: -61.51, spanLat: 0.15, spanLng: 0.15 },
  { name: "Willemstad (Handelskade), Curacao", lat: 12.12, lng: -68.93, spanLat: 0.15, spanLng: 0.15 },
  { name: "Oranjestad & Eagle Beach, Aruba", lat: 12.52, lng: -70.03, spanLat: 0.12, spanLng: 0.12 },
  { name: "Castries & The Pitons, Saint Lucia", lat: 14.01, lng: -60.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Fort-de-France, Martinique", lat: 14.61, lng: -61.07, spanLat: 0.15, spanLng: 0.15 },
  { name: "Pointe-a-Pitre, Guadeloupe", lat: 16.24, lng: -61.53, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hamilton & St. George, Bermuda", lat: 32.29, lng: -64.78, spanLat: 0.1, spanLng: 0.1 },

  // =========================================================================
  // --- SOUTH AMERICA ---
  // =========================================================================
  // Brazil (All 5 Macro-Regions)
  { name: "Sao Paulo (Paulista / Ibirapuera), Brazil", lat: -23.55, lng: -46.63, spanLat: 0.4, spanLng: 0.4 },
  { name: "Rio de Janeiro (Copacabana / Corcovado), Brazil", lat: -22.91, lng: -43.17, spanLat: 0.35, spanLng: 0.35 },
  { name: "Brasilia (Monumental Axis), Brazil", lat: -15.79, lng: -47.88, spanLat: 0.3, spanLng: 0.3 },
  { name: "Curitiba (Jardim Botanico), Parana, Brazil", lat: -25.42, lng: -49.27, spanLat: 0.25, spanLng: 0.25 },
  { name: "Porto Alegre & Guaiba, Rio Grande do Sul, Brazil", lat: -30.03, lng: -51.23, spanLat: 0.25, spanLng: 0.25 },
  { name: "Florianopolis (Island Beaches), Santa Catarina, Brazil", lat: -27.59, lng: -48.55, spanLat: 0.2, spanLng: 0.2 },
  { name: "Belo Horizonte & Pampulha, Minas Gerais, Brazil", lat: -19.92, lng: -43.94, spanLat: 0.25, spanLng: 0.25 },
  { name: "Salvador (Pelourinho / Barra), Bahia, Brazil", lat: -12.97, lng: -38.51, spanLat: 0.25, spanLng: 0.25 },
  { name: "Recife & Olinda Coast, Pernambuco, Brazil", lat: -8.05, lng: -34.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Fortaleza & Praia de Iracema, Ceara, Brazil", lat: -3.73, lng: -38.52, spanLat: 0.25, spanLng: 0.25 },
  { name: "Manaus & Amazon Rainforest, Amazonas, Brazil", lat: -3.11, lng: -60.02, spanLat: 0.25, spanLng: 0.25 },
  { name: "Belem & Guajara Bay, Para, Brazil", lat: -1.45, lng: -48.5, spanLat: 0.2, spanLng: 0.2 },
  { name: "Goiania & Central Plateau, Goias, Brazil", lat: -16.68, lng: -49.26, spanLat: 0.25, spanLng: 0.25 },
  { name: "Foz do Iguacu (Waterfalls), Parana, Brazil", lat: -25.54, lng: -54.58, spanLat: 0.15, spanLng: 0.15 },
  { name: "Vitoria & Vila Velha, Espirito Santo, Brazil", lat: -20.31, lng: -40.33, spanLat: 0.2, spanLng: 0.2 },
  { name: "Natal & Ponta Negra, Rio Grande do Norte, Brazil", lat: -5.79, lng: -35.2, spanLat: 0.2, spanLng: 0.2 },

  // Argentina, Uruguay & Paraguay
  { name: "Buenos Aires (Palermo / Puerto Madero), Argentina", lat: -34.6, lng: -58.38, spanLat: 0.35, spanLng: 0.35 },
  { name: "Cordoba & Sierras de Cordoba, Argentina", lat: -31.42, lng: -64.18, spanLat: 0.25, spanLng: 0.25 },
  { name: "Rosario & Parana River, Santa Fe, Argentina", lat: -32.95, lng: -60.64, spanLat: 0.2, spanLng: 0.2 },
  { name: "Mendoza (Wine Country & Andes), Argentina", lat: -32.89, lng: -68.84, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bariloche & Nahuel Huapi, Patagonia, Argentina", lat: -41.13, lng: -71.31, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ushuaia & Beagle Channel, Tierra del Fuego, Argentina", lat: -54.8, lng: -68.3, spanLat: 0.15, spanLng: 0.15 },
  { name: "Salta & Quebrada de Cafayate, Argentina", lat: -24.78, lng: -65.41, spanLat: 0.2, spanLng: 0.2 },
  { name: "Mar del Plata & Atlantic Coast, Argentina", lat: -38.0, lng: -57.55, spanLat: 0.2, spanLng: 0.2 },
  { name: "San Miguel de Tucuman, Argentina", lat: -26.82, lng: -65.22, spanLat: 0.2, spanLng: 0.2 },
  { name: "Neuquen & Limay River, Patagonia, Argentina", lat: -38.95, lng: -68.05, spanLat: 0.2, spanLng: 0.2 },
  { name: "Montevideo (Rambla & Ciudad Vieja), Uruguay", lat: -34.9, lng: -56.16, spanLat: 0.2, spanLng: 0.2 },
  { name: "Punta del Este & Mansa Beach, Uruguay", lat: -34.96, lng: -54.94, spanLat: 0.15, spanLng: 0.15 },
  { name: "Colonia del Sacramento, Uruguay", lat: -34.47, lng: -57.84, spanLat: 0.1, spanLng: 0.1 },
  { name: "Asuncion & Costanera, Paraguay", lat: -25.26, lng: -57.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ciudad del Este (Iguazu Border), Paraguay", lat: -25.51, lng: -54.61, spanLat: 0.15, spanLng: 0.15 },

  // Andean Nations (Chile, Peru, Colombia, Ecuador, Bolivia)
  { name: "Santiago & Costanera, Chile", lat: -33.45, lng: -70.67, spanLat: 0.3, spanLng: 0.3 },
  { name: "Valparaiso & Vina del Mar, Chile", lat: -33.04, lng: -71.61, spanLat: 0.15, spanLng: 0.15 },
  { name: "Antofagasta & Atacama Desert Highway, Chile", lat: -23.65, lng: -70.4, spanLat: 0.2, spanLng: 0.2 },
  { name: "San Pedro de Atacama & Moon Valley, Chile", lat: -22.91, lng: -68.2, spanLat: 0.15, spanLng: 0.15 },
  { name: "Puerto Montt & Chiloe Island, Chile", lat: -41.47, lng: -72.94, spanLat: 0.2, spanLng: 0.2 },
  { name: "Punta Arenas & Strait of Magellan, Chile", lat: -53.16, lng: -70.91, spanLat: 0.15, spanLng: 0.15 },
  { name: "Concepcion & Biobio, Chile", lat: -36.82, lng: -73.04, spanLat: 0.2, spanLng: 0.2 },
  { name: "La Serena & Elqui Valley, Chile", lat: -29.9, lng: -71.25, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lima (Miraflores & Barranco), Peru", lat: -12.05, lng: -77.04, spanLat: 0.3, spanLng: 0.3 },
  { name: "Cusco (Plaza de Armas & Sacred Valley), Peru", lat: -13.53, lng: -71.96, spanLat: 0.15, spanLng: 0.15 },
  { name: "Arequipa & Misti Volcano, Peru", lat: -16.4, lng: -71.53, spanLat: 0.2, spanLng: 0.2 },
  { name: "Trujillo & Chan Chan, Peru", lat: -8.11, lng: -79.03, spanLat: 0.15, spanLng: 0.15 },
  { name: "Puno & Lake Titicaca, Peru", lat: -15.84, lng: -70.02, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bogota (Monserrate & Chapinero), Colombia", lat: 4.71, lng: -74.07, spanLat: 0.3, spanLng: 0.3 },
  { name: "Medellin (El Poblado & Metrocable), Colombia", lat: 6.24, lng: -75.58, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cartagena (Walled City & Bocagrande), Colombia", lat: 10.39, lng: -75.48, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cali & Valle del Cauca, Colombia", lat: 3.45, lng: -76.53, spanLat: 0.2, spanLng: 0.2 },
  { name: "Barranquilla & Caribbean Coast, Colombia", lat: 10.96, lng: -74.79, spanLat: 0.2, spanLng: 0.2 },
  { name: "Santa Marta & Tayrona Coast, Colombia", lat: 11.24, lng: -74.2, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bucaramanga & Chicamocha, Colombia", lat: 7.12, lng: -73.12, spanLat: 0.2, spanLng: 0.2 },
  { name: "Quito (Old Town & Pichincha), Ecuador", lat: -0.18, lng: -78.46, spanLat: 0.2, spanLng: 0.2 },
  { name: "Guayaquil & Malecon 2000, Ecuador", lat: -2.18, lng: -79.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cuenca & Tomebamba River, Ecuador", lat: -2.9, lng: -79.0, spanLat: 0.15, spanLng: 0.15 },
  { name: "La Paz & Illimani Mountain, Bolivia", lat: -16.5, lng: -68.15, spanLat: 0.2, spanLng: 0.2 },
  { name: "Santa Cruz de la Sierra, Bolivia", lat: -17.8, lng: -63.18, spanLat: 0.25, spanLng: 0.25 },
  { name: "Sucre (Constitutional Capital), Bolivia", lat: -19.03, lng: -65.25, spanLat: 0.15, spanLng: 0.15 },

  // =========================================================================
  // --- WESTERN & NORTHERN EUROPE ---
  // =========================================================================
  // United Kingdom & Ireland
  { name: "London (Westminster / Tower Bridge), England, UK", lat: 51.5, lng: -0.12, spanLat: 0.3, spanLng: 0.3 },
  { name: "Manchester & Salford Quays, England, UK", lat: 53.48, lng: -2.24, spanLat: 0.25, spanLng: 0.25 },
  { name: "Birmingham & West Midlands, England, UK", lat: 52.48, lng: -1.89, spanLat: 0.25, spanLng: 0.25 },
  { name: "Liverpool & Albert Dock, England, UK", lat: 53.4, lng: -2.99, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bristol & Clifton Suspension Bridge, England, UK", lat: 51.45, lng: -2.58, spanLat: 0.2, spanLng: 0.2 },
  { name: "Oxford & Thames Valley, England, UK", lat: 51.75, lng: -1.25, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cambridge & River Cam, England, UK", lat: 52.2, lng: 0.12, spanLat: 0.15, spanLng: 0.15 },
  { name: "Newcastle & Tyne Bridge, England, UK", lat: 54.97, lng: -1.61, spanLat: 0.2, spanLng: 0.2 },
  { name: "Leeds & Yorkshire Dales, England, UK", lat: 53.8, lng: -1.55, spanLat: 0.25, spanLng: 0.25 },
  { name: "Brighton & South Coast, England, UK", lat: 50.82, lng: -0.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Edinburgh (Royal Mile / Castle), Scotland, UK", lat: 55.95, lng: -3.19, spanLat: 0.2, spanLng: 0.2 },
  { name: "Glasgow & River Clyde, Scotland, UK", lat: 55.86, lng: -4.25, spanLat: 0.2, spanLng: 0.2 },
  { name: "Inverness & Scottish Highlands, Scotland, UK", lat: 57.47, lng: -4.22, spanLat: 0.2, spanLng: 0.2 },
  { name: "Aberdeen & North Sea, Scotland, UK", lat: 57.14, lng: -2.09, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cardiff & Millennium Bay, Wales, UK", lat: 51.48, lng: -3.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Swansea & Gower Peninsula, Wales, UK", lat: 51.62, lng: -3.94, spanLat: 0.15, spanLng: 0.15 },
  { name: "Belfast & Titanic Quarter, Northern Ireland, UK", lat: 54.59, lng: -5.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dublin (Temple Bar / Liffey), Ireland", lat: 53.35, lng: -6.26, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cork & River Lee, Ireland", lat: 51.89, lng: -8.47, spanLat: 0.15, spanLng: 0.15 },
  { name: "Galway & Wild Atlantic Way, Ireland", lat: 53.27, lng: -9.05, spanLat: 0.15, spanLng: 0.15 },
  { name: "Limerick & Shannon River, Ireland", lat: 52.66, lng: -8.62, spanLat: 0.15, spanLng: 0.15 },
  { name: "Douglas, Isle of Man", lat: 54.15, lng: -4.48, spanLat: 0.1, spanLng: 0.1 },
  { name: "St. Helier, Jersey, Channel Islands", lat: 49.18, lng: -2.1, spanLat: 0.1, spanLng: 0.1 },

  // France & Monaco
  { name: "Paris (Eiffel / Seine), Île-de-France, France", lat: 48.86, lng: 2.35, spanLat: 0.3, spanLng: 0.3 },
  { name: "Lyon & Rhône River, Auvergne-Rhône-Alpes, France", lat: 45.76, lng: 4.83, spanLat: 0.2, spanLng: 0.2 },
  { name: "Marseille & Vieux-Port, PACA, France", lat: 43.3, lng: 5.37, spanLat: 0.25, spanLng: 0.25 },
  { name: "Nice & Promenade des Anglais, French Riviera, France", lat: 43.71, lng: 7.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cannes & Antibes, French Riviera, France", lat: 43.55, lng: 7.01, spanLat: 0.15, spanLng: 0.15 },
  { name: "Monaco & Monte Carlo", lat: 43.73, lng: 7.42, spanLat: 0.08, spanLng: 0.08 },
  { name: "Bordeaux & Garonne, Nouvelle-Aquitaine, France", lat: 44.83, lng: -0.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Toulouse & Canal du Midi, Occitanie, France", lat: 43.6, lng: 1.44, spanLat: 0.2, spanLng: 0.2 },
  { name: "Strasbourg & Petite France, Grand Est, France", lat: 48.57, lng: 7.75, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lille & Grand Place, Hauts-de-France, France", lat: 50.62, lng: 3.05, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nantes & Loire Valley, Pays de la Loire, France", lat: 47.21, lng: -1.55, spanLat: 0.2, spanLng: 0.2 },
  { name: "Rennes & Saint-Malo, Brittany, France", lat: 48.11, lng: -1.67, spanLat: 0.2, spanLng: 0.2 },
  { name: "Montpellier & Mediterranean, Occitanie, France", lat: 43.61, lng: 3.87, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rouen & Normandy Cliffs, Normandy, France", lat: 49.44, lng: 1.09, spanLat: 0.2, spanLng: 0.2 },
  { name: "Grenoble & French Alps, France", lat: 45.18, lng: 5.72, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ajaccio & Bastia, Corsica Island, France", lat: 41.92, lng: 8.73, spanLat: 0.2, spanLng: 0.2 },

  // Germany (All 16 Federal States)
  { name: "Berlin (Brandenburg Gate / Spree), Germany", lat: 52.52, lng: 13.4, spanLat: 0.3, spanLng: 0.3 },
  { name: "Hamburg & Elbe River, Germany", lat: 53.55, lng: 9.99, spanLat: 0.25, spanLng: 0.25 },
  { name: "Munich & Marienplatz, Bavaria, Germany", lat: 48.14, lng: 11.58, spanLat: 0.25, spanLng: 0.25 },
  { name: "Nuremberg & Franconia, Bavaria, Germany", lat: 49.45, lng: 11.07, spanLat: 0.2, spanLng: 0.2 },
  { name: "Frankfurt & Main River, Hesse, Germany", lat: 50.11, lng: 8.68, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cologne & Rhine Cathedral, NRW, Germany", lat: 50.93, lng: 6.96, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dusseldorf & Rhine Promenade, NRW, Germany", lat: 51.22, lng: 6.77, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dortmund & Ruhr Valley, NRW, Germany", lat: 51.51, lng: 7.46, spanLat: 0.2, spanLng: 0.2 },
  { name: "Stuttgart & Black Forest, Baden-Württemberg, Germany", lat: 48.77, lng: 9.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Heidelberg & Neckar River, Baden-Württemberg, Germany", lat: 49.4, lng: 8.68, spanLat: 0.15, spanLng: 0.15 },
  { name: "Freiburg (Black Forest), Baden-Württemberg, Germany", lat: 47.99, lng: 7.84, spanLat: 0.15, spanLng: 0.15 },
  { name: "Dresden & Elbe Valley, Saxony, Germany", lat: 51.05, lng: 13.73, spanLat: 0.2, spanLng: 0.2 },
  { name: "Leipzig, Saxony, Germany", lat: 51.33, lng: 12.37, spanLat: 0.2, spanLng: 0.2 },
  { name: "Hanover, Lower Saxony, Germany", lat: 52.37, lng: 9.73, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bremen & Weser River, Germany", lat: 53.07, lng: 8.8, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kiel & Baltic Coast, Schleswig-Holstein, Germany", lat: 54.32, lng: 10.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rostock & Warnemunde, Mecklenburg-Vorpommern, Germany", lat: 54.09, lng: 12.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Erfurt & Weimar, Thuringia, Germany", lat: 50.98, lng: 11.03, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mainz & Rhine Valley, Rhineland-Palatinate, Germany", lat: 49.99, lng: 8.27, spanLat: 0.15, spanLng: 0.15 },
  { name: "Saarbrucken, Saarland, Germany", lat: 49.23, lng: 6.99, spanLat: 0.15, spanLng: 0.15 },
  { name: "Potsdam, Brandenburg, Germany", lat: 52.39, lng: 13.06, spanLat: 0.15, spanLng: 0.15 },
  { name: "Magdeburg, Saxony-Anhalt, Germany", lat: 52.12, lng: 11.62, spanLat: 0.15, spanLng: 0.15 },

  // Benelux & Alpine
  { name: "Amsterdam & Canals, North Holland, Netherlands", lat: 52.37, lng: 4.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Rotterdam & Erasmus Bridge, South Holland, Netherlands", lat: 51.92, lng: 4.48, spanLat: 0.2, spanLng: 0.2 },
  { name: "The Hague (Peace Palace), South Holland, Netherlands", lat: 52.07, lng: 4.3, spanLat: 0.15, spanLng: 0.15 },
  { name: "Utrecht (Dom Tower), Utrecht, Netherlands", lat: 52.09, lng: 5.12, spanLat: 0.15, spanLng: 0.15 },
  { name: "Eindhoven & Brainport, North Brabant, Netherlands", lat: 51.44, lng: 5.47, spanLat: 0.15, spanLng: 0.15 },
  { name: "Groningen, Netherlands", lat: 53.22, lng: 6.56, spanLat: 0.15, spanLng: 0.15 },
  { name: "Maastricht, Limburg, Netherlands", lat: 50.85, lng: 5.69, spanLat: 0.15, spanLng: 0.15 },
  { name: "Brussels (Grand Place / Atomium), Belgium", lat: 50.85, lng: 4.35, spanLat: 0.2, spanLng: 0.2 },
  { name: "Antwerp & Diamond District, Flanders, Belgium", lat: 51.21, lng: 4.4, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ghent & Gravensteen, Flanders, Belgium", lat: 51.05, lng: 3.73, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bruges (Venice of the North), Flanders, Belgium", lat: 51.2, lng: 3.22, spanLat: 0.1, spanLng: 0.1 },
  { name: "Liege & Meuse River, Wallonia, Belgium", lat: 50.63, lng: 5.57, spanLat: 0.15, spanLng: 0.15 },
  { name: "Luxembourg City (Alzette Gorge), Luxembourg", lat: 49.61, lng: 6.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Zurich & Lake Zurich, Switzerland", lat: 47.38, lng: 8.54, spanLat: 0.2, spanLng: 0.2 },
  { name: "Geneva & Jet d'Eau, Switzerland", lat: 46.2, lng: 6.14, spanLat: 0.15, spanLng: 0.15 },
  { name: "Basel & Rhine Triangle, Switzerland", lat: 47.55, lng: 7.58, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bern (Old Town Aare), Switzerland", lat: 46.94, lng: 7.44, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lucerne & Chapel Bridge, Switzerland", lat: 47.05, lng: 8.3, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lausanne & Lake Geneva, Vaud, Switzerland", lat: 46.52, lng: 6.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lugano & Lake Lugano, Ticino, Switzerland", lat: 46.0, lng: 8.95, spanLat: 0.15, spanLng: 0.15 },
  { name: "Zermatt & Matterhorn, Valais, Switzerland", lat: 45.97, lng: 7.74, spanLat: 0.1, spanLng: 0.1 },
  { name: "St. Moritz & Engadin, Graubünden, Switzerland", lat: 46.49, lng: 9.83, spanLat: 0.1, spanLng: 0.1 },
  { name: "Vaduz & Alpine Valley, Liechtenstein", lat: 47.14, lng: 9.52, spanLat: 0.1, spanLng: 0.1 },
  { name: "Vienna (Ringstrasse / Hofburg), Austria", lat: 48.21, lng: 16.37, spanLat: 0.25, spanLng: 0.25 },
  { name: "Salzburg & Hohensalzburg, Austria", lat: 47.8, lng: 13.05, spanLat: 0.15, spanLng: 0.15 },
  { name: "Innsbruck (Nordkette Alps), Tyrol, Austria", lat: 47.26, lng: 11.4, spanLat: 0.15, spanLng: 0.15 },
  { name: "Graz & Mur River, Styria, Austria", lat: 47.07, lng: 15.43, spanLat: 0.15, spanLng: 0.15 },
  { name: "Linz & Danube River, Upper Austria", lat: 48.3, lng: 14.28, spanLat: 0.15, spanLng: 0.15 },
  { name: "Klagenfurt & Worthersee, Carinthia, Austria", lat: 46.62, lng: 14.3, spanLat: 0.15, spanLng: 0.15 },

  // Nordics, Baltics & Arctic
  { name: "Copenhagen (Nyhavn / Tivoli), Denmark", lat: 55.68, lng: 12.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Aarhus & Jutland, Denmark", lat: 56.16, lng: 10.2, spanLat: 0.15, spanLng: 0.15 },
  { name: "Odense & Funen, Denmark", lat: 55.4, lng: 10.38, spanLat: 0.15, spanLng: 0.15 },
  { name: "Aalborg, Denmark", lat: 57.04, lng: 9.92, spanLat: 0.15, spanLng: 0.15 },
  { name: "Stockholm (Gamla Stan / Archipelago), Sweden", lat: 59.33, lng: 18.07, spanLat: 0.3, spanLng: 0.3 },
  { name: "Gothenburg & West Coast, Sweden", lat: 57.7, lng: 11.97, spanLat: 0.2, spanLng: 0.2 },
  { name: "Malmo & Oresund, Sweden", lat: 55.6, lng: 13.0, spanLat: 0.15, spanLng: 0.15 },
  { name: "Uppsala & Fyris River, Sweden", lat: 59.85, lng: 17.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kiruna & Swedish Lapland, Sweden", lat: 67.85, lng: 20.22, spanLat: 0.15, spanLng: 0.15 },
  { name: "Oslo & Oslofjord, Norway", lat: 59.91, lng: 10.75, spanLat: 0.25, spanLng: 0.25 },
  { name: "Bergen (Bryggen / Western Fjords), Norway", lat: 60.39, lng: 5.32, spanLat: 0.15, spanLng: 0.15 },
  { name: "Trondheim & Nidaros, Norway", lat: 63.43, lng: 10.39, spanLat: 0.15, spanLng: 0.15 },
  { name: "Stavanger (Preikestolen / Lysefjord), Norway", lat: 58.97, lng: 5.73, spanLat: 0.15, spanLng: 0.15 },
  { name: "Tromso (Arctic Aurora Capital), Norway", lat: 69.64, lng: 18.95, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lofoten Islands (Reine / Svolvaer), Norway", lat: 68.23, lng: 14.56, spanLat: 0.2, spanLng: 0.2 },
  { name: "Longyearbyen, Svalbard, Arctic Norway", lat: 78.22, lng: 15.63, spanLat: 0.08, spanLng: 0.08 },
  { name: "Helsinki (Senate Square / Harbour), Finland", lat: 60.17, lng: 24.94, spanLat: 0.25, spanLng: 0.25 },
  { name: "Tampere & Lake Nasijarvi, Finland", lat: 61.49, lng: 23.78, spanLat: 0.15, spanLng: 0.15 },
  { name: "Turku & Archipelago, Finland", lat: 60.45, lng: 22.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Oulu & Bothnian Bay, Finland", lat: 65.01, lng: 25.47, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rovaniemi (Santa Claus Village / Lapland), Finland", lat: 66.5, lng: 25.72, spanLat: 0.15, spanLng: 0.15 },
  { name: "Reykjavik & Faxafloi, Iceland", lat: 64.14, lng: -21.94, spanLat: 0.2, spanLng: 0.2 },
  { name: "Akureyri & Eyjafjordur, North Iceland", lat: 65.68, lng: -18.1, spanLat: 0.15, spanLng: 0.15 },
  { name: "Vik & South Coast Black Sand, Iceland", lat: 63.41, lng: -19.0, spanLat: 0.12, spanLng: 0.12 },
  { name: "Torshavn & Streymoy, Faroe Islands", lat: 62.01, lng: -6.77, spanLat: 0.1, spanLng: 0.1 },
  { name: "Nuuk & Fjord, Greenland", lat: 64.18, lng: -51.72, spanLat: 0.1, spanLng: 0.1 },
  { name: "Tallinn (Old Town / Baltic Sea), Estonia", lat: 59.43, lng: 24.75, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tartu, Estonia", lat: 58.37, lng: 26.72, spanLat: 0.15, spanLng: 0.15 },
  { name: "Riga (Old Town / Daugava), Latvia", lat: 56.95, lng: 24.1, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jurmala & Gulf of Riga, Latvia", lat: 56.96, lng: 23.77, spanLat: 0.15, spanLng: 0.15 },
  { name: "Vilnius (Gediminas / Old Town), Lithuania", lat: 54.68, lng: 25.28, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kaunas & Nemunas River, Lithuania", lat: 54.89, lng: 23.9, spanLat: 0.15, spanLng: 0.15 },
  { name: "Klaipeda & Curonian Spit, Lithuania", lat: 55.7, lng: 21.14, spanLat: 0.15, spanLng: 0.15 },

  // =========================================================================
  // --- SOUTHERN & EASTERN EUROPE ---
  // =========================================================================
  // Spain & Portugal
  { name: "Madrid (Gran Via / Retiro), Spain", lat: 40.42, lng: -3.7, spanLat: 0.3, spanLng: 0.3 },
  { name: "Barcelona (Sagrada Familia / Ramblas), Catalonia, Spain", lat: 41.39, lng: 2.17, spanLat: 0.25, spanLng: 0.25 },
  { name: "Seville (Plaza de Espana), Andalusia, Spain", lat: 37.38, lng: -5.98, spanLat: 0.2, spanLng: 0.2 },
  { name: "Valencia (City of Arts & Sciences), Spain", lat: 39.47, lng: -0.37, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bilbao & Guggenheim, Basque Country, Spain", lat: 43.26, lng: -2.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "San Sebastian & La Concha, Basque Country, Spain", lat: 43.31, lng: -1.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Malaga & Costa del Sol, Andalusia, Spain", lat: 36.72, lng: -4.42, spanLat: 0.2, spanLng: 0.2 },
  { name: "Granada (Alhambra), Andalusia, Spain", lat: 37.17, lng: -3.59, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cordoba & Mezquita, Andalusia, Spain", lat: 37.88, lng: -4.77, spanLat: 0.15, spanLng: 0.15 },
  { name: "Zaragoza & Ebro River, Aragon, Spain", lat: 41.65, lng: -0.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Santiago de Compostela & Galicia, Spain", lat: 42.88, lng: -8.54, spanLat: 0.15, spanLng: 0.15 },
  { name: "Palma de Mallorca & Balearic Islands, Spain", lat: 39.56, lng: 2.65, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ibiza & Formentera, Balearic Islands, Spain", lat: 38.9, lng: 1.43, spanLat: 0.15, spanLng: 0.15 },
  { name: "Tenerife & Teide Volcano, Canary Islands, Spain", lat: 28.29, lng: -16.62, spanLat: 0.3, spanLng: 0.3 },
  { name: "Gran Canaria (Las Palmas / Maspalomas), Canary Islands, Spain", lat: 28.12, lng: -15.43, spanLat: 0.25, spanLng: 0.25 },
  { name: "Lisbon (Alfama / Belem), Portugal", lat: 38.72, lng: -9.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Sintra & Cascais Coast, Portugal", lat: 38.8, lng: -9.38, spanLat: 0.15, spanLng: 0.15 },
  { name: "Porto & Douro River, Portugal", lat: 41.15, lng: -8.62, spanLat: 0.2, spanLng: 0.2 },
  { name: "Braga & Guimaraes, North Portugal", lat: 41.55, lng: -8.42, spanLat: 0.15, spanLng: 0.15 },
  { name: "Coimbra (Historic University), Portugal", lat: 40.2, lng: -8.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Faro & Lagos (Algarve Cliffs), Portugal", lat: 37.01, lng: -7.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Funchal & Levadas, Madeira Island, Portugal", lat: 32.65, lng: -16.91, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ponta Delgada & Sete Cidades, Azores, Portugal", lat: 37.74, lng: -25.67, spanLat: 0.15, spanLng: 0.15 },
  { name: "Andorra la Vella & Pyrenees, Andorra", lat: 42.5, lng: 1.52, spanLat: 0.1, spanLng: 0.1 },
  { name: "Gibraltar & The Rock", lat: 36.14, lng: -5.35, spanLat: 0.05, spanLng: 0.05 },

  // Italy, San Marino & Malta
  { name: "Rome (Colosseum / Vatican), Lazio, Italy", lat: 41.9, lng: 12.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Milan (Duomo / Navigli), Lombardy, Italy", lat: 45.46, lng: 9.19, spanLat: 0.25, spanLng: 0.25 },
  { name: "Venice (Grand Canal / St. Mark's), Veneto, Italy", lat: 45.44, lng: 12.32, spanLat: 0.15, spanLng: 0.15 },
  { name: "Florence (Ponte Vecchio / Duomo), Tuscany, Italy", lat: 43.77, lng: 11.25, spanLat: 0.2, spanLng: 0.2 },
  { name: "Siena & Chianti Hills, Tuscany, Italy", lat: 43.32, lng: 11.33, spanLat: 0.15, spanLng: 0.15 },
  { name: "Naples & Mount Vesuvius, Campania, Italy", lat: 40.85, lng: 14.26, spanLat: 0.25, spanLng: 0.25 },
  { name: "Amalfi Coast & Positano, Campania, Italy", lat: 40.63, lng: 14.6, spanLat: 0.12, spanLng: 0.12 },
  { name: "Turin & Alps, Piedmont, Italy", lat: 45.07, lng: 7.68, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bologna & Emilia-Romagna, Italy", lat: 44.49, lng: 11.34, spanLat: 0.2, spanLng: 0.2 },
  { name: "Genoa & Portofino Coast, Liguria, Italy", lat: 44.4, lng: 8.93, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cinque Terre (Monterosso / Riomaggiore), Liguria, Italy", lat: 44.14, lng: 9.68, spanLat: 0.1, spanLng: 0.1 },
  { name: "Verona & Lake Garda, Veneto, Italy", lat: 45.43, lng: 10.99, spanLat: 0.2, spanLng: 0.2 },
  { name: "Lake Como & Bellagio, Lombardy, Italy", lat: 45.98, lng: 9.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bari & Alberobello Trulli, Puglia, Italy", lat: 41.12, lng: 16.87, spanLat: 0.2, spanLng: 0.2 },
  { name: "Palermo & Mondello, Sicily, Italy", lat: 38.11, lng: 13.36, spanLat: 0.2, spanLng: 0.2 },
  { name: "Catania & Mount Etna, Sicily, Italy", lat: 37.5, lng: 15.08, spanLat: 0.2, spanLng: 0.2 },
  { name: "Taormina & Syracuse, Sicily, Italy", lat: 37.85, lng: 15.28, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cagliari & Costa Smeralda, Sardinia, Italy", lat: 39.22, lng: 9.12, spanLat: 0.25, spanLng: 0.25 },
  { name: "San Marino & Mount Titano", lat: 43.93, lng: 12.45, spanLat: 0.08, spanLng: 0.08 },
  { name: "Valletta & Grand Harbour, Malta", lat: 35.89, lng: 14.51, spanLat: 0.1, spanLng: 0.1 },
  { name: "Gozo Island & Victoria, Malta", lat: 36.04, lng: 14.24, spanLat: 0.08, spanLng: 0.08 },

  // Central, Eastern & Balkan Europe
  { name: "Warsaw (Old Town / Vistula), Mazovia, Poland", lat: 52.23, lng: 21.01, spanLat: 0.3, spanLng: 0.3 },
  { name: "Krakow (Main Square / Wawel), Lesser Poland", lat: 50.06, lng: 19.94, spanLat: 0.2, spanLng: 0.2 },
  { name: "Gdansk & Sopot (Baltic Sea), Pomerania, Poland", lat: 54.35, lng: 18.64, spanLat: 0.2, spanLng: 0.2 },
  { name: "Wroclaw & Odra Bridges, Lower Silesia, Poland", lat: 51.1, lng: 17.03, spanLat: 0.2, spanLng: 0.2 },
  { name: "Poznan, Greater Poland, Poland", lat: 52.4, lng: 16.92, spanLat: 0.2, spanLng: 0.2 },
  { name: "Katowice & Silesian Metropolis, Poland", lat: 50.26, lng: 19.02, spanLat: 0.2, spanLng: 0.2 },
  { name: "Zakopane & Tatra Mountains, Poland", lat: 49.29, lng: 19.95, spanLat: 0.12, spanLng: 0.12 },
  { name: "Prague (Charles Bridge / Castle), Czechia", lat: 50.08, lng: 14.44, spanLat: 0.25, spanLng: 0.25 },
  { name: "Brno & Spilberk Castle, Moravia, Czechia", lat: 49.19, lng: 16.6, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ostrava, Moravian-Silesian, Czechia", lat: 49.83, lng: 18.28, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cesky Krumlov, South Bohemia, Czechia", lat: 48.81, lng: 14.31, spanLat: 0.1, spanLng: 0.1 },
  { name: "Bratislava (Danube & Castle), Slovakia", lat: 48.14, lng: 17.1, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kosice & High Tatras, Slovakia", lat: 48.71, lng: 21.25, spanLat: 0.15, spanLng: 0.15 },
  { name: "Budapest (Parliament / Danube), Hungary", lat: 47.5, lng: 19.04, spanLat: 0.25, spanLng: 0.25 },
  { name: "Lake Balaton & Tihany, Hungary", lat: 46.91, lng: 17.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Debrecen, Hungary", lat: 47.53, lng: 21.62, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bucharest (Palace of Parliament), Romania", lat: 44.43, lng: 26.1, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cluj-Napoca & Transylvania, Romania", lat: 46.77, lng: 23.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Brasov & Bran Castle (Transylvania), Romania", lat: 45.65, lng: 25.6, spanLat: 0.15, spanLng: 0.15 },
  { name: "Sibiu & Transfagarasan Highway, Romania", lat: 45.79, lng: 24.15, spanLat: 0.15, spanLng: 0.15 },
  { name: "Constanta & Black Sea Beaches, Romania", lat: 44.18, lng: 28.65, spanLat: 0.15, spanLng: 0.15 },
  { name: "Sofia & Vitosha Mountain, Bulgaria", lat: 42.69, lng: 23.32, spanLat: 0.2, spanLng: 0.2 },
  { name: "Plovdiv (Ancient Roman Theatre), Bulgaria", lat: 42.14, lng: 24.74, spanLat: 0.15, spanLng: 0.15 },
  { name: "Varna & Golden Sands, Black Sea, Bulgaria", lat: 43.21, lng: 27.91, spanLat: 0.15, spanLng: 0.15 },
  { name: "Burgas & Sunny Beach, Black Sea, Bulgaria", lat: 42.5, lng: 27.46, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ljubljana (Castle & Triple Bridge), Slovenia", lat: 46.05, lng: 14.5, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lake Bled & Julian Alps, Slovenia", lat: 46.36, lng: 14.09, spanLat: 0.1, spanLng: 0.1 },
  { name: "Zagreb (Ban Jelacic / Upper Town), Croatia", lat: 45.81, lng: 15.98, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dubrovnik (Old City Walls), Croatia", lat: 42.65, lng: 18.09, spanLat: 0.1, spanLng: 0.1 },
  { name: "Split (Diocletian's Palace), Croatia", lat: 43.51, lng: 16.44, spanLat: 0.15, spanLng: 0.15 },
  { name: "Zadar & Plitvice Lakes National Park, Croatia", lat: 44.11, lng: 15.23, spanLat: 0.2, spanLng: 0.2 },
  { name: "Rijeka & Istria Peninsula, Croatia", lat: 45.32, lng: 14.44, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sarajevo (Bascarsija / Miljacka), Bosnia", lat: 43.85, lng: 18.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mostar (Old Bridge), Bosnia", lat: 43.34, lng: 17.81, spanLat: 0.1, spanLng: 0.1 },
  { name: "Belgrade (Kalemegdan / Danube), Serbia", lat: 44.78, lng: 20.44, spanLat: 0.25, spanLng: 0.25 },
  { name: "Novi Sad & Petrovaradin, Serbia", lat: 45.26, lng: 19.83, spanLat: 0.15, spanLng: 0.15 },
  { name: "Podgorica, Montenegro", lat: 42.43, lng: 19.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kotor Bay & Budva Riviera, Montenegro", lat: 42.42, lng: 18.77, spanLat: 0.1, spanLng: 0.1 },
  { name: "Tirana (Skanderbeg Square), Albania", lat: 41.32, lng: 19.81, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sarande & Albanian Riviera, Albania", lat: 39.87, lng: 20.0, spanLat: 0.15, spanLng: 0.15 },
  { name: "Skopje (Stone Bridge / Vardar), North Macedonia", lat: 41.99, lng: 21.42, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ohrid & Lake Ohrid, North Macedonia", lat: 41.11, lng: 20.8, spanLat: 0.1, spanLng: 0.1 },
  { name: "Pristina, Kosovo", lat: 42.66, lng: 21.16, spanLat: 0.15, spanLng: 0.15 },
  { name: "Chisinau, Moldova", lat: 47.01, lng: 28.86, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kyiv, Ukraine", lat: 50.45, lng: 30.52, spanLat: 0.25, spanLng: 0.25 },
  { name: "Lviv, Ukraine", lat: 49.84, lng: 24.03, spanLat: 0.2, spanLng: 0.2 },

  // Greece & Cyprus
  { name: "Athens (Acropolis / Plaka), Attica, Greece", lat: 37.98, lng: 23.73, spanLat: 0.25, spanLng: 0.25 },
  { name: "Thessaloniki & White Tower, Central Macedonia, Greece", lat: 40.64, lng: 22.94, spanLat: 0.2, spanLng: 0.2 },
  { name: "Heraklion & Knossos, Crete, Greece", lat: 35.33, lng: 25.13, spanLat: 0.2, spanLng: 0.2 },
  { name: "Chania & Balos Lagoon, Crete, Greece", lat: 35.51, lng: 24.01, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rhodes (Medieval Old Town), Dodecanese, Greece", lat: 36.43, lng: 28.22, spanLat: 0.15, spanLng: 0.15 },
  { name: "Santorini (Oia & Caldera), Cyclades, Greece", lat: 36.39, lng: 25.46, spanLat: 0.1, spanLng: 0.1 },
  { name: "Mykonos Town, Cyclades, Greece", lat: 37.44, lng: 25.32, spanLat: 0.1, spanLng: 0.1 },
  { name: "Corfu Town & Ionian Coast, Greece", lat: 39.62, lng: 19.92, spanLat: 0.15, spanLng: 0.15 },
  { name: "Patras & Rio-Antirrio Bridge, Peloponnese, Greece", lat: 38.24, lng: 21.73, spanLat: 0.15, spanLng: 0.15 },
  { name: "Meteora & Kalabaka Monasteries, Greece", lat: 39.71, lng: 21.62, spanLat: 0.1, spanLng: 0.1 },
  { name: "Nicosia (Ledra Street), Cyprus", lat: 35.18, lng: 33.38, spanLat: 0.15, spanLng: 0.15 },
  { name: "Limassol & Marina Promenade, Cyprus", lat: 34.68, lng: 33.04, spanLat: 0.15, spanLng: 0.15 },
  { name: "Paphos & Coral Bay, Cyprus", lat: 34.77, lng: 32.42, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ayia Napa & Cape Greco, Cyprus", lat: 34.98, lng: 34.0, spanLat: 0.1, spanLng: 0.1 },

  // =========================================================================
  // --- ASIA ---
  // =========================================================================
  // Japan (All 8 Regions & Major Prefectures)
  { name: "Tokyo (Shinjuku / Shibuya / Ginza), Japan", lat: 35.68, lng: 139.69, spanLat: 0.4, spanLng: 0.4 },
  { name: "Yokohama & Minato Mirai, Kanagawa, Japan", lat: 35.44, lng: 139.63, spanLat: 0.25, spanLng: 0.25 },
  { name: "Osaka (Dotonbori / Umeda), Japan", lat: 34.69, lng: 135.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Kyoto (Gion / Arashiyama), Japan", lat: 35.01, lng: 135.77, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nagoya & Sakae, Aichi, Japan", lat: 35.18, lng: 136.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Sapporo & Odori Park, Hokkaido, Japan", lat: 43.06, lng: 141.35, spanLat: 0.25, spanLng: 0.25 },
  { name: "Otaru & Hakodate, Hokkaido, Japan", lat: 41.76, lng: 140.73, spanLat: 0.2, spanLng: 0.2 },
  { name: "Fukuoka & Tenjin, Kyushu, Japan", lat: 33.59, lng: 130.4, spanLat: 0.2, spanLng: 0.2 },
  { name: "Hiroshima (Peace Park & Miyajima), Japan", lat: 34.38, lng: 132.45, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sendai & Matsushima Bay, Miyagi, Japan", lat: 38.26, lng: 140.86, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kobe & Mount Rokko, Hyogo, Japan", lat: 34.69, lng: 135.19, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nara (Deer Park / Todai-ji), Japan", lat: 34.68, lng: 135.8, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kanazawa & Kenrokuen, Ishikawa, Japan", lat: 36.56, lng: 136.65, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mount Fuji & Kawaguchiko, Yamanashi, Japan", lat: 35.5, lng: 138.76, spanLat: 0.15, spanLng: 0.15 },
  { name: "Naha & Kokusai Dori, Okinawa Island, Japan", lat: 26.21, lng: 127.68, spanLat: 0.15, spanLng: 0.15 },

  // South Korea, Taiwan, Hong Kong, Macau
  { name: "Seoul (Gangnam / Myeongdong / Han River), South Korea", lat: 37.57, lng: 126.98, spanLat: 0.3, spanLng: 0.3 },
  { name: "Busan (Haeundae / Gwangalli Beach), South Korea", lat: 35.18, lng: 129.08, spanLat: 0.25, spanLng: 0.25 },
  { name: "Incheon & Songdo International City, South Korea", lat: 37.45, lng: 126.7, spanLat: 0.25, spanLng: 0.25 },
  { name: "Daegu, South Korea", lat: 35.87, lng: 128.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Daejeon (Science City), South Korea", lat: 36.35, lng: 127.38, spanLat: 0.2, spanLng: 0.2 },
  { name: "Gwangju, South Korea", lat: 35.15, lng: 126.85, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jeju Island (Hallasan / Volcanic Coast), South Korea", lat: 33.49, lng: 126.53, spanLat: 0.25, spanLng: 0.25 },
  { name: "Hong Kong (Victoria Harbour / Central / Kowloon)", lat: 22.32, lng: 114.17, spanLat: 0.25, spanLng: 0.25 },
  { name: "Macau (Cotai Strip / Ruins of St. Paul's)", lat: 22.19, lng: 113.54, spanLat: 0.1, spanLng: 0.1 },
  { name: "Taipei (Taipei 101 / Ximending), Taiwan", lat: 25.03, lng: 121.57, spanLat: 0.25, spanLng: 0.25 },
  { name: "Kaohsiung (Love River / Lotus Pond), Taiwan", lat: 22.62, lng: 120.3, spanLat: 0.2, spanLng: 0.2 },
  { name: "Taichung & Gaomei Wetlands, Taiwan", lat: 24.14, lng: 120.67, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tainan (Historic Temples), Taiwan", lat: 22.99, lng: 120.21, spanLat: 0.2, spanLng: 0.2 },
  { name: "Hualien & Taroko Gorge, Taiwan", lat: 23.98, lng: 121.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Yilan & Pacific Coast, Taiwan", lat: 24.75, lng: 121.75, spanLat: 0.15, spanLng: 0.15 },

  // Southeast Asia
  { name: "Singapore (Marina Bay / Orchard / Gardens by the Bay)", lat: 1.35, lng: 103.82, spanLat: 0.3, spanLng: 0.3 },
  { name: "Bangkok (Chao Phraya / Sukhumvit), Thailand", lat: 13.76, lng: 100.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Chiang Mai & Doi Suthep, North Thailand", lat: 18.79, lng: 98.98, spanLat: 0.2, spanLng: 0.2 },
  { name: "Phuket (Patong Beach / Old Town), South Thailand", lat: 7.88, lng: 98.39, spanLat: 0.2, spanLng: 0.2 },
  { name: "Pattaya & Jomtien Coast, East Thailand", lat: 12.92, lng: 100.88, spanLat: 0.15, spanLng: 0.15 },
  { name: "Krabi & Railay Beach, South Thailand", lat: 8.08, lng: 98.9, spanLat: 0.15, spanLng: 0.15 },
  { name: "Koh Samui Island, Thailand", lat: 9.53, lng: 99.93, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hua Hin & Gulf Coast, Thailand", lat: 12.56, lng: 99.95, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kuala Lumpur (Petronas Towers / Bukit Bintang), Malaysia", lat: 3.14, lng: 101.69, spanLat: 0.3, spanLng: 0.3 },
  { name: "Penang (George Town Street Art), Malaysia", lat: 5.41, lng: 100.33, spanLat: 0.2, spanLng: 0.2 },
  { name: "Johor Bahru & Iskandar, Malaysia", lat: 1.49, lng: 103.74, spanLat: 0.2, spanLng: 0.2 },
  { name: "Malacca (Dutch Square / Jonker Street), Malaysia", lat: 2.18, lng: 102.25, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ipoh & Perak Cave Temples, Malaysia", lat: 4.59, lng: 101.09, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kota Kinabalu & Mount Kinabalu, Sabah, Borneo, Malaysia", lat: 5.98, lng: 116.07, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kuching & Sarawak River, Borneo, Malaysia", lat: 1.55, lng: 110.35, spanLat: 0.15, spanLng: 0.15 },
  { name: "Jakarta (Monas / Sudirman CBD), Java, Indonesia", lat: -6.21, lng: 106.85, spanLat: 0.35, spanLng: 0.35 },
  { name: "Surabaya & Madura Bridge, East Java, Indonesia", lat: -7.25, lng: 112.75, spanLat: 0.25, spanLng: 0.25 },
  { name: "Bandung (Tea Plantations), West Java, Indonesia", lat: -6.91, lng: 107.6, spanLat: 0.25, spanLng: 0.25 },
  { name: "Bali (Ubud Rice Terraces / Seminyak Beach), Indonesia", lat: -8.5, lng: 115.2, spanLat: 0.3, spanLng: 0.3 },
  { name: "Yogyakarta (Borobudur / Malioboro), Central Java, Indonesia", lat: -7.79, lng: 110.36, spanLat: 0.2, spanLng: 0.2 },
  { name: "Medan & Lake Toba, North Sumatra, Indonesia", lat: 3.59, lng: 98.67, spanLat: 0.25, spanLng: 0.25 },
  { name: "Makassar & South Sulawesi, Indonesia", lat: -5.14, lng: 119.43, spanLat: 0.2, spanLng: 0.2 },
  { name: "Lombok Island & Mount Rinjani, Indonesia", lat: -8.58, lng: 116.11, spanLat: 0.2, spanLng: 0.2 },
  { name: "Manila (BGC / Makati / Intramuros), Luzon, Philippines", lat: 14.59, lng: 120.98, spanLat: 0.3, spanLng: 0.3 },
  { name: "Cebu City & Mactan Island, Visayas, Philippines", lat: 10.31, lng: 123.89, spanLat: 0.2, spanLng: 0.2 },
  { name: "Davao City & Mount Apo, Mindanao, Philippines", lat: 7.19, lng: 125.45, spanLat: 0.25, spanLng: 0.25 },
  { name: "Baguio & Cordillera Mountains, Luzon, Philippines", lat: 16.4, lng: 120.59, spanLat: 0.15, spanLng: 0.15 },
  { name: "Iloilo City & Panay, Visayas, Philippines", lat: 10.72, lng: 122.56, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hanoi (Hoan Kiem Lake / Old Quarter), North Vietnam", lat: 21.02, lng: 105.83, spanLat: 0.25, spanLng: 0.25 },
  { name: "Ho Chi Minh City (District 1 / Saigon River), South Vietnam", lat: 10.82, lng: 106.63, spanLat: 0.3, spanLng: 0.3 },
  { name: "Da Nang & Dragon Bridge, Central Vietnam", lat: 16.05, lng: 108.2, spanLat: 0.2, spanLng: 0.2 },
  { name: "Hoi An (Ancient Town), Central Vietnam", lat: 15.88, lng: 108.33, spanLat: 0.12, spanLng: 0.12 },
  { name: "Nha Trang & Cam Ranh Coast, Vietnam", lat: 12.23, lng: 109.19, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hue (Imperial City / Perfume River), Vietnam", lat: 16.46, lng: 107.59, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ha Long Bay & Cat Ba, North Vietnam", lat: 20.95, lng: 107.08, spanLat: 0.15, spanLng: 0.15 },
  { name: "Phnom Penh & Tonle Sap River, Cambodia", lat: 11.55, lng: 104.92, spanLat: 0.2, spanLng: 0.2 },
  { name: "Siem Reap & Angkor Wat Temples, Cambodia", lat: 13.36, lng: 103.86, spanLat: 0.15, spanLng: 0.15 },
  { name: "Vientiane & Patuxai, Laos", lat: 17.97, lng: 102.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Luang Prabang & Mekong River, Laos", lat: 19.88, lng: 102.13, spanLat: 0.1, spanLng: 0.1 },
  { name: "Bandar Seri Begawan, Brunei", lat: 4.9, lng: 114.94, spanLat: 0.15, spanLng: 0.15 },

  // South Asia (India All States & Zones, Sri Lanka, Nepal, Bangladesh, Bhutan)
  { name: "New Delhi (India Gate & Connaught Place), Delhi, India", lat: 28.61, lng: 77.2, spanLat: 0.3, spanLng: 0.3 },
  { name: "Gurgaon & Cyber City, Haryana, India", lat: 28.45, lng: 77.02, spanLat: 0.2, spanLng: 0.2 },
  { name: "Noida & Expressway, Uttar Pradesh, India", lat: 28.53, lng: 77.39, spanLat: 0.2, spanLng: 0.2 },
  { name: "Agra & Taj Mahal, Uttar Pradesh, India", lat: 27.17, lng: 78.0, spanLat: 0.15, spanLng: 0.15 },
  { name: "Varanasi & Ghats of Ganga, Uttar Pradesh, India", lat: 25.31, lng: 82.97, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lucknow & Gomti Riverfront, Uttar Pradesh, India", lat: 26.84, lng: 80.94, spanLat: 0.2, spanLng: 0.2 },
  { name: "Amritsar & Golden Temple, Punjab, India", lat: 31.63, lng: 74.87, spanLat: 0.15, spanLng: 0.15 },
  { name: "Chandigarh & Rock Garden, India", lat: 30.73, lng: 76.77, spanLat: 0.15, spanLng: 0.15 },
  { name: "Shimla & Mall Road, Himachal Pradesh, India", lat: 31.1, lng: 77.17, spanLat: 0.15, spanLng: 0.15 },
  { name: "Manali & Rohtang Pass, Himachal Pradesh, India", lat: 32.24, lng: 77.18, spanLat: 0.15, spanLng: 0.15 },
  { name: "Dharamshala & McLeod Ganj, Himachal Pradesh, India", lat: 32.21, lng: 76.32, spanLat: 0.12, spanLng: 0.12 },
  { name: "Leh & Nubra Valley, Ladakh, India", lat: 34.15, lng: 77.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Srinagar & Dal Lake, Jammu & Kashmir, India", lat: 34.08, lng: 74.79, spanLat: 0.2, spanLng: 0.2 },
  { name: "Rishikesh & Haridwar (Ganga), Uttarakhand, India", lat: 30.08, lng: 78.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Dehradun & Mussoorie Hills, Uttarakhand, India", lat: 30.31, lng: 78.03, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mumbai (Marine Drive & Gateway of India), Maharashtra, India", lat: 18.92, lng: 72.83, spanLat: 0.35, spanLng: 0.35 },
  { name: "Pune & Sahyadri Hills, Maharashtra, India", lat: 18.52, lng: 73.85, spanLat: 0.25, spanLng: 0.25 },
  { name: "Nagpur & Zero Mile, Maharashtra, India", lat: 21.14, lng: 79.08, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ahmedabad & Sabarmati Riverfront, Gujarat, India", lat: 23.02, lng: 72.57, spanLat: 0.25, spanLng: 0.25 },
  { name: "Surat & Diamond City, Gujarat, India", lat: 21.17, lng: 72.83, spanLat: 0.2, spanLng: 0.2 },
  { name: "Vadodara & Laxmi Vilas Palace, Gujarat, India", lat: 22.3, lng: 73.18, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rann of Kutch (White Desert), Gujarat, India", lat: 23.83, lng: 69.83, spanLat: 0.25, spanLng: 0.25 },
  { name: "Jaipur (Pink City / Hawa Mahal), Rajasthan, India", lat: 26.91, lng: 75.78, spanLat: 0.25, spanLng: 0.25 },
  { name: "Udaipur & Lake Pichola, Rajasthan, India", lat: 24.58, lng: 73.71, spanLat: 0.15, spanLng: 0.15 },
  { name: "Jodhpur (Blue City & Mehrangarh), Rajasthan, India", lat: 26.23, lng: 73.02, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jaisalmer & Thar Desert Dunes, Rajasthan, India", lat: 26.91, lng: 70.9, spanLat: 0.2, spanLng: 0.2 },
  { name: "Pushkar & Holy Lake, Rajasthan, India", lat: 26.48, lng: 74.55, spanLat: 0.12, spanLng: 0.12 },
  { name: "Bhopal & Upper Lake, Madhya Pradesh, India", lat: 23.25, lng: 77.41, spanLat: 0.2, spanLng: 0.2 },
  { name: "Indore & Sarafa, Madhya Pradesh, India", lat: 22.71, lng: 75.85, spanLat: 0.2, spanLng: 0.2 },
  { name: "Gwalior Fort, Madhya Pradesh, India", lat: 26.21, lng: 78.17, spanLat: 0.15, spanLng: 0.15 },
  { name: "Khajuraho Temples, Madhya Pradesh, India", lat: 24.83, lng: 79.91, spanLat: 0.12, spanLng: 0.12 },
  { name: "Panaji & North Goa Beaches, Goa, India", lat: 15.49, lng: 73.82, spanLat: 0.15, spanLng: 0.15 },
  { name: "Margao & South Goa Coast, Goa, India", lat: 15.28, lng: 73.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bengaluru (Silicon Valley & Cubbon Park), Karnataka, India", lat: 12.97, lng: 77.59, spanLat: 0.35, spanLng: 0.35 },
  { name: "Mysuru & Mysore Palace, Karnataka, India", lat: 12.29, lng: 76.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hampi (Vijayanagara UNESCO), Karnataka, India", lat: 15.33, lng: 76.46, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mangaluru & Coastal Karnataka, India", lat: 12.91, lng: 74.85, spanLat: 0.15, spanLng: 0.15 },
  { name: "Coorg / Kodagu (Coffee Hills), Karnataka, India", lat: 12.33, lng: 75.8, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hyderabad (Charminar & HITEC City), Telangana, India", lat: 17.38, lng: 78.48, spanLat: 0.3, spanLng: 0.3 },
  { name: "Visakhapatnam & RK Beach, Andhra Pradesh, India", lat: 17.68, lng: 83.21, spanLat: 0.2, spanLng: 0.2 },
  { name: "Vijayawada & Krishna River, Andhra Pradesh, India", lat: 16.5, lng: 80.64, spanLat: 0.15, spanLng: 0.15 },
  { name: "Tirupati & Tirumala Hills, Andhra Pradesh, India", lat: 13.62, lng: 79.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Chennai (Marina Beach & OMR), Tamil Nadu, India", lat: 13.08, lng: 80.27, spanLat: 0.3, spanLng: 0.3 },
  { name: "Coimbatore & Western Ghats, Tamil Nadu, India", lat: 11.01, lng: 76.95, spanLat: 0.2, spanLng: 0.2 },
  { name: "Madurai & Meenakshi Temple, Tamil Nadu, India", lat: 9.92, lng: 78.11, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kanyakumari & Cape Comorin, Tamil Nadu, India", lat: 8.08, lng: 77.53, spanLat: 0.1, spanLng: 0.1 },
  { name: "Ooty & Nilgiri Tea Hills, Tamil Nadu, India", lat: 11.41, lng: 76.69, spanLat: 0.15, spanLng: 0.15 },
  { name: "Puducherry (French Quarter & Promenade), India", lat: 11.94, lng: 79.8, spanLat: 0.12, spanLng: 0.12 },
  { name: "Kochi & Fort Kochi, Kerala, India", lat: 9.93, lng: 76.26, spanLat: 0.2, spanLng: 0.2 },
  { name: "Thiruvananthapuram & Kovalam, Kerala, India", lat: 8.52, lng: 76.93, spanLat: 0.2, spanLng: 0.2 },
  { name: "Alappuzha & Kerala Backwaters, Kerala, India", lat: 9.49, lng: 76.33, spanLat: 0.15, spanLng: 0.15 },
  { name: "Munnar & Tea Terraces, Kerala, India", lat: 10.08, lng: 77.05, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kozhikode & Malabar Coast, Kerala, India", lat: 11.25, lng: 75.78, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kolkata (Howrah Bridge & Victoria Memorial), West Bengal, India", lat: 22.57, lng: 88.36, spanLat: 0.3, spanLng: 0.3 },
  { name: "Darjeeling & Himalayan Toy Train, West Bengal, India", lat: 27.04, lng: 88.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Siliguri & Dooars Foothills, West Bengal, India", lat: 26.72, lng: 88.42, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bhubaneswar & Temple City, Odisha, India", lat: 20.29, lng: 85.82, spanLat: 0.2, spanLng: 0.2 },
  { name: "Puri & Konark Sun Temple, Odisha, India", lat: 19.81, lng: 85.83, spanLat: 0.15, spanLng: 0.15 },
  { name: "Patna & River Ganga, Bihar, India", lat: 25.59, lng: 85.13, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bodh Gaya (Mahabodhi Temple), Bihar, India", lat: 24.69, lng: 84.99, spanLat: 0.1, spanLng: 0.1 },
  { name: "Ranchi & Waterfalls, Jharkhand, India", lat: 23.34, lng: 85.3, spanLat: 0.2, spanLng: 0.2 },
  { name: "Raipur, Chhattisgarh, India", lat: 21.25, lng: 81.62, spanLat: 0.2, spanLng: 0.2 },
  { name: "Guwahati & Brahmaputra, Assam, India", lat: 26.14, lng: 91.73, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kaziranga National Park (Rhinos), Assam, India", lat: 26.57, lng: 93.17, spanLat: 0.2, spanLng: 0.2 },
  { name: "Shillong (Scotland of the East), Meghalaya, India", lat: 25.57, lng: 91.89, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cherrapunji & Living Root Bridges, Meghalaya, India", lat: 25.27, lng: 91.73, spanLat: 0.12, spanLng: 0.12 },
  { name: "Gangtok & Kanchenjunga, Sikkim, India", lat: 27.33, lng: 88.61, spanLat: 0.15, spanLng: 0.15 },
  { name: "Imphal & Loktak Lake, Manipur, India", lat: 24.81, lng: 93.93, spanLat: 0.15, spanLng: 0.15 },
  { name: "Aizawl & Mizo Hills, Mizoram, India", lat: 23.72, lng: 92.71, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kohima & Naga Hills, Nagaland, India", lat: 25.67, lng: 94.1, spanLat: 0.15, spanLng: 0.15 },
  { name: "Agartala, Tripura, India", lat: 23.83, lng: 91.28, spanLat: 0.15, spanLng: 0.15 },
  { name: "Itanagar, Arunachal Pradesh, India", lat: 27.08, lng: 93.6, spanLat: 0.15, spanLng: 0.15 },
  { name: "Port Blair & Havelock, Andaman & Nicobar, India", lat: 11.62, lng: 92.72, spanLat: 0.2, spanLng: 0.2 },
  { name: "Colombo (Galle Face Green), Sri Lanka", lat: 6.92, lng: 79.86, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kandy (Temple of the Tooth), Sri Lanka", lat: 7.29, lng: 80.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Galle (Dutch Fort), South Sri Lanka", lat: 6.05, lng: 80.21, spanLat: 0.12, spanLng: 0.12 },
  { name: "Sigiriya (Lion Rock Fortress), Sri Lanka", lat: 7.95, lng: 80.76, spanLat: 0.12, spanLng: 0.12 },
  { name: "Ella (Nine Arch Bridge), Sri Lanka", lat: 6.86, lng: 81.04, spanLat: 0.12, spanLng: 0.12 },
  { name: "Kathmandu (Durbar Square), Nepal", lat: 27.71, lng: 85.32, spanLat: 0.15, spanLng: 0.15 },
  { name: "Pokhara & Annapurna Himalayas, Nepal", lat: 28.21, lng: 83.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mount Everest Region (Namche Bazaar / Lukla), Nepal", lat: 27.8, lng: 86.71, spanLat: 0.15, spanLng: 0.15 },
  { name: "Dhaka & Buriganga River, Bangladesh", lat: 23.81, lng: 90.41, spanLat: 0.25, spanLng: 0.25 },
  { name: "Chittagong & Bay of Bengal, Bangladesh", lat: 22.35, lng: 91.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cox's Bazar (World's Longest Beach), Bangladesh", lat: 21.42, lng: 91.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Thimphu & Paro Taktsang (Tiger's Nest), Bhutan", lat: 27.47, lng: 89.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Punakha Dzong, Bhutan", lat: 27.58, lng: 89.86, spanLat: 0.12, spanLng: 0.12 },
  { name: "Almaty (Medeu & Tien Shan), Kazakhstan", lat: 43.22, lng: 76.85, spanLat: 0.25, spanLng: 0.25 },
  { name: "Astana (Baiterek Tower), Kazakhstan", lat: 51.16, lng: 71.47, spanLat: 0.25, spanLng: 0.25 },
  { name: "Shymkent & Turkistan, South Kazakhstan", lat: 42.32, lng: 69.59, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tashkent (Chorsu / Amir Timur), Uzbekistan", lat: 41.29, lng: 69.24, spanLat: 0.25, spanLng: 0.25 },
  { name: "Samarkand (Registan Square), Uzbekistan", lat: 39.65, lng: 66.97, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bukhara (Po-i-Kalyan Silk Road), Uzbekistan", lat: 39.77, lng: 64.42, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bishkek & Ala-Archa, Kyrgyzstan", lat: 42.87, lng: 74.59, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tbilisi (Old Town & Narikala), Georgia", lat: 41.71, lng: 44.82, spanLat: 0.2, spanLng: 0.2 },
  { name: "Batumi (Black Sea Boulevard), Georgia", lat: 41.61, lng: 41.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Yerevan (Cascade & Mount Ararat), Armenia", lat: 40.17, lng: 44.51, spanLat: 0.2, spanLng: 0.2 },
  { name: "Baku (Flame Towers & Caspian Coast), Azerbaijan", lat: 40.4, lng: 49.86, spanLat: 0.25, spanLng: 0.25 },
  { name: "Ulaanbaatar & Steppe, Mongolia", lat: 47.92, lng: 106.92, spanLat: 0.2, spanLng: 0.2 },

  // =========================================================================
  // --- MIDDLE EAST & TURKEY ---
  // =========================================================================
  // Turkey (All 7 Regions)
  { name: "Istanbul (Hagia Sophia / Bosphorus), Marmara, Turkey", lat: 41.01, lng: 28.98, spanLat: 0.3, spanLng: 0.3 },
  { name: "Ankara (Anitkabir), Central Anatolia, Turkey", lat: 39.93, lng: 32.85, spanLat: 0.25, spanLng: 0.25 },
  { name: "Izmir & Aegean Promenade, Turkey", lat: 38.42, lng: 27.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Antalya & Mediterranean Turquoise Coast, Turkey", lat: 36.89, lng: 30.71, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bursa & Uludag Mountain, Turkey", lat: 40.18, lng: 29.06, spanLat: 0.2, spanLng: 0.2 },
  { name: "Cappadocia (Goreme Hot Air Balloons), Turkey", lat: 38.64, lng: 34.82, spanLat: 0.2, spanLng: 0.2 },
  { name: "Trabzon & Sumela Monastery, Black Sea, Turkey", lat: 41.0, lng: 39.71, spanLat: 0.15, spanLng: 0.15 },
  { name: "Bodrum & Marmaris Marina, Aegean, Turkey", lat: 37.03, lng: 27.43, spanLat: 0.15, spanLng: 0.15 },
  { name: "Gaziantep & Zeugma, Southeast Turkey", lat: 37.06, lng: 37.38, spanLat: 0.2, spanLng: 0.2 },
  { name: "Konya (Mevlana Rumi), Central Turkey", lat: 37.87, lng: 32.48, spanLat: 0.2, spanLng: 0.2 },

  // Arabian Peninsula & Levant
  { name: "Dubai (Burj Khalifa / Palm Jumeirah), UAE", lat: 25.2, lng: 55.27, spanLat: 0.3, spanLng: 0.3 },
  { name: "Abu Dhabi (Corniche / Louvre), UAE", lat: 24.45, lng: 54.38, spanLat: 0.25, spanLng: 0.25 },
  { name: "Sharjah & Ajman, UAE", lat: 25.35, lng: 55.42, spanLat: 0.2, spanLng: 0.2 },
  { name: "Ras Al Khaimah & Jebel Jais, UAE", lat: 25.79, lng: 55.98, spanLat: 0.2, spanLng: 0.2 },
  { name: "Doha (The Pearl / Souq Waqif), Qatar", lat: 25.28, lng: 51.53, spanLat: 0.2, spanLng: 0.2 },
  { name: "Riyadh (Kingdom Centre / Diriyah), Saudi Arabia", lat: 24.71, lng: 46.67, spanLat: 0.35, spanLng: 0.35 },
  { name: "Jeddah (Red Sea Corniche / Al-Balad), Saudi Arabia", lat: 21.54, lng: 39.17, spanLat: 0.3, spanLng: 0.3 },
  { name: "AlUla (Hegra UNESCO Tombs), Saudi Arabia", lat: 26.61, lng: 37.92, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dammam & Khobar (Arabian Gulf), Saudi Arabia", lat: 26.42, lng: 50.1, spanLat: 0.25, spanLng: 0.25 },
  { name: "Abha & Asir Green Mountains, Saudi Arabia", lat: 18.22, lng: 42.5, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kuwait City & Kuwait Towers, Kuwait", lat: 29.37, lng: 47.97, spanLat: 0.2, spanLng: 0.2 },
  { name: "Manama & Bahrain Bay, Bahrain", lat: 26.22, lng: 50.58, spanLat: 0.15, spanLng: 0.15 },
  { name: "Muscat & Muttrah Corniche, Oman", lat: 23.58, lng: 58.4, spanLat: 0.25, spanLng: 0.25 },
  { name: "Salalah & Dhofar Coast, Oman", lat: 17.01, lng: 54.09, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nizwa Fort & Jebel Akhdar, Oman", lat: 22.93, lng: 57.53, spanLat: 0.15, spanLng: 0.15 },
  { name: "Amman (Citadel & Roman Theatre), Jordan", lat: 31.94, lng: 35.92, spanLat: 0.2, spanLng: 0.2 },
  { name: "Petra (Treasury) & Wadi Rum Desert, Jordan", lat: 30.32, lng: 35.44, spanLat: 0.2, spanLng: 0.2 },
  { name: "Aqaba & Red Sea Coral Reefs, Jordan", lat: 29.53, lng: 35.0, spanLat: 0.15, spanLng: 0.15 },
  { name: "Tel Aviv (Promenade & Jaffa Port), Israel", lat: 32.09, lng: 34.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jerusalem (Old City / Western Wall)", lat: 31.76, lng: 35.21, spanLat: 0.2, spanLng: 0.2 },
  { name: "Haifa & Bahai Gardens, Israel", lat: 32.79, lng: 34.98, spanLat: 0.15, spanLng: 0.15 },

  // =========================================================================
  // --- AFRICA ---
  // =========================================================================
  // North Africa
  { name: "Cairo (Nile River & Tahrir), Egypt", lat: 30.04, lng: 31.24, spanLat: 0.3, spanLng: 0.3 },
  { name: "Giza (Great Pyramid & Sphinx), Egypt", lat: 29.98, lng: 31.13, spanLat: 0.15, spanLng: 0.15 },
  { name: "Alexandria (Corniche & Library), Egypt", lat: 31.2, lng: 29.91, spanLat: 0.25, spanLng: 0.25 },
  { name: "Luxor (Valley of the Kings / Karnak), Egypt", lat: 25.68, lng: 32.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Aswan & Nile Cataracts, Egypt", lat: 24.08, lng: 32.89, spanLat: 0.15, spanLng: 0.15 },
  { name: "Hurghada & Sharm El Sheikh (Red Sea), Egypt", lat: 27.25, lng: 33.81, spanLat: 0.25, spanLng: 0.25 },
  { name: "Casablanca & Hassan II Mosque, Morocco", lat: 33.57, lng: -7.59, spanLat: 0.25, spanLng: 0.25 },
  { name: "Marrakech (Jemaa el-Fnaa / Medina), Morocco", lat: 31.62, lng: -7.98, spanLat: 0.2, spanLng: 0.2 },
  { name: "Rabat & Hassan Tower, Morocco", lat: 34.02, lng: -6.83, spanLat: 0.2, spanLng: 0.2 },
  { name: "Fez (Chouara Tannery), Morocco", lat: 34.03, lng: -5.0, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tangier & Cape Spartel, Morocco", lat: 35.75, lng: -5.83, spanLat: 0.2, spanLng: 0.2 },
  { name: "Chefchaouen (The Blue Pearl), Morocco", lat: 35.17, lng: -5.26, spanLat: 0.1, spanLng: 0.1 },
  { name: "Agadir & Taghazout Coast, Morocco", lat: 30.42, lng: -9.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tunis & Ancient Carthage, Tunisia", lat: 36.81, lng: 10.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sousse & Monastir, Tunisia", lat: 35.82, lng: 10.63, spanLat: 0.15, spanLng: 0.15 },
  { name: "Algiers & Bay of Algiers, Algeria", lat: 36.75, lng: 3.05, spanLat: 0.25, spanLng: 0.25 },
  { name: "Oran, Algeria", lat: 35.69, lng: -0.63, spanLat: 0.2, spanLng: 0.2 },

  // Sub-Saharan & Southern Africa
  { name: "Johannesburg & Sandton, Gauteng, South Africa", lat: -26.2, lng: 28.05, spanLat: 0.35, spanLng: 0.35 },
  { name: "Cape Town (Table Mountain & Waterfront), Western Cape, South Africa", lat: -33.92, lng: 18.42, spanLat: 0.35, spanLng: 0.35 },
  { name: "Cape Point & Cape Peninsula, South Africa", lat: -34.35, lng: 18.49, spanLat: 0.15, spanLng: 0.15 },
  { name: "Durban & Golden Mile, KwaZulu-Natal, South Africa", lat: -29.85, lng: 31.02, spanLat: 0.25, spanLng: 0.25 },
  { name: "Pretoria (Union Buildings), South Africa", lat: -25.74, lng: 28.19, spanLat: 0.25, spanLng: 0.25 },
  { name: "Port Elizabeth & Garden Route, Eastern Cape, South Africa", lat: -33.96, lng: 25.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bloemfontein, Free State, South Africa", lat: -29.11, lng: 26.21, spanLat: 0.2, spanLng: 0.2 },
  { name: "Windhoek & Central Highlands, Namibia", lat: -22.56, lng: 17.06, spanLat: 0.2, spanLng: 0.2 },
  { name: "Swakopmund & Walvis Bay, Skeleton Coast, Namibia", lat: -22.68, lng: 14.53, spanLat: 0.15, spanLng: 0.15 },
  { name: "Gaborone, Botswana", lat: -24.65, lng: 25.9, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nairobi (CBD & National Park), Kenya", lat: -1.29, lng: 36.82, spanLat: 0.3, spanLng: 0.3 },
  { name: "Mombasa & Diani Beach, Kenya", lat: -4.04, lng: 39.66, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dar es Salaam (Indian Ocean Coast), Tanzania", lat: -6.79, lng: 39.28, spanLat: 0.25, spanLng: 0.25 },
  { name: "Zanzibar (Stone Town / Nungwi Beach), Tanzania", lat: -6.16, lng: 39.2, spanLat: 0.2, spanLng: 0.2 },
  { name: "Arusha & Mount Kilimanjaro Gateway, Tanzania", lat: -3.36, lng: 36.68, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kampala & Lake Victoria, Uganda", lat: 0.34, lng: 32.58, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kigali & Clean City Hills, Rwanda", lat: -1.94, lng: 30.06, spanLat: 0.2, spanLng: 0.2 },
  { name: "Addis Ababa & Entoto Mountain, Ethiopia", lat: 9.03, lng: 38.74, spanLat: 0.25, spanLng: 0.25 },
  { name: "Accra & Gulf of Guinea, Ghana", lat: 5.6, lng: -0.18, spanLat: 0.25, spanLng: 0.25 },
  { name: "Kumasi, Ashanti, Ghana", lat: 6.68, lng: -1.62, spanLat: 0.2, spanLng: 0.2 },
  { name: "Lagos (Victoria Island / Lekki), Nigeria", lat: 6.52, lng: 3.37, spanLat: 0.35, spanLng: 0.35 },
  { name: "Abuja (Aso Rock / Central Area), Nigeria", lat: 9.07, lng: 7.39, spanLat: 0.25, spanLng: 0.25 },
  { name: "Dakar & Almadies Peninsula, Senegal", lat: 14.71, lng: -17.46, spanLat: 0.2, spanLng: 0.2 },
  { name: "Abidjan & Ebrie Lagoon, Ivory Coast", lat: 5.36, lng: -4.0, spanLat: 0.25, spanLng: 0.25 },
  { name: "Port Louis & Le Morne, Mauritius", lat: -20.16, lng: 57.5, spanLat: 0.2, spanLng: 0.2 },
  { name: "Saint-Denis & Piton de la Fournaise, Reunion Island", lat: -20.88, lng: 55.45, spanLat: 0.2, spanLng: 0.2 },
  { name: "Antananarivo, Madagascar", lat: -18.87, lng: 47.5, spanLat: 0.2, spanLng: 0.2 },

  // =========================================================================
  // --- OCEANIA & PACIFIC ISLANDS ---
  // =========================================================================
  // Australia (All States & Territories)
  { name: "Sydney (Opera House / Harbour Bridge / Bondi), NSW, Australia", lat: -33.87, lng: 151.21, spanLat: 0.4, spanLng: 0.4 },
  { name: "Melbourne (Yarra River / St Kilda), Victoria, Australia", lat: -37.81, lng: 144.96, spanLat: 0.35, spanLng: 0.35 },
  { name: "Great Ocean Road (Twelve Apostles), Victoria, Australia", lat: -38.66, lng: 143.1, spanLat: 0.2, spanLng: 0.2 },
  { name: "Brisbane & South Bank, Queensland, Australia", lat: -27.47, lng: 153.03, spanLat: 0.3, spanLng: 0.3 },
  { name: "Gold Coast (Surfers Paradise), Queensland, Australia", lat: -28.01, lng: 153.4, spanLat: 0.25, spanLng: 0.25 },
  { name: "Cairns & Great Barrier Reef Gateway, Queensland, Australia", lat: -16.91, lng: 145.77, spanLat: 0.2, spanLng: 0.2 },
  { name: "Perth (Swan River / Kings Park / Cottesloe), Western Australia", lat: -31.95, lng: 115.86, spanLat: 0.3, spanLng: 0.3 },
  { name: "Adelaide & Barossa Valley, South Australia", lat: -34.92, lng: 138.6, spanLat: 0.25, spanLng: 0.25 },
  { name: "Canberra & Lake Burley Griffin, ACT, Australia", lat: -35.28, lng: 149.13, spanLat: 0.2, spanLng: 0.2 },
  { name: "Hobart & Mount Wellington, Tasmania, Australia", lat: -42.88, lng: 147.32, spanLat: 0.2, spanLng: 0.2 },
  { name: "Darwin & Mindil Beach, Northern Territory, Australia", lat: -12.46, lng: 130.84, spanLat: 0.2, spanLng: 0.2 },
  { name: "Alice Springs & Red Centre Outback, Australia", lat: -23.69, lng: 133.88, spanLat: 0.15, spanLng: 0.15 },

  // New Zealand & Pacific
  { name: "Auckland (Waitemata Harbour / Sky Tower), New Zealand", lat: -36.85, lng: 174.76, spanLat: 0.3, spanLng: 0.3 },
  { name: "Wellington (Mount Victoria / Oriental Bay), New Zealand", lat: -41.29, lng: 174.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Christchurch & Canterbury Plains, South Island, New Zealand", lat: -43.53, lng: 172.63, spanLat: 0.2, spanLng: 0.2 },
  { name: "Queenstown & Lake Wakatipu (Southern Alps), New Zealand", lat: -45.03, lng: 168.66, spanLat: 0.15, spanLng: 0.15 },
  { name: "Dunedin & Otago Peninsula, South Island, New Zealand", lat: -45.87, lng: 170.5, spanLat: 0.15, spanLng: 0.15 },
  { name: "Rotorua (Geothermal Wonder), North Island, New Zealand", lat: -38.13, lng: 176.24, spanLat: 0.15, spanLng: 0.15 },
  { name: "Tauranga & Mount Maunganui, Bay of Plenty, New Zealand", lat: -37.68, lng: 176.16, spanLat: 0.15, spanLng: 0.15 },
  { name: "Napier & Hawke's Bay Art Deco, New Zealand", lat: -39.49, lng: 176.91, spanLat: 0.15, spanLng: 0.15 },
  { name: "Nelson & Abel Tasman Coast, New Zealand", lat: -41.27, lng: 173.28, spanLat: 0.15, spanLng: 0.15 },
  { name: "Suva & Coral Coast, Viti Levu, Fiji", lat: -18.12, lng: 178.44, spanLat: 0.2, spanLng: 0.2 },
  { name: "Nadi & Mamanuca Islands, Fiji", lat: -17.77, lng: 177.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Papeete & Moorea, French Polynesia (Tahiti)", lat: -17.53, lng: -149.56, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bora Bora Lagoon, French Polynesia", lat: -16.5, lng: -151.74, spanLat: 0.1, spanLng: 0.1 },
  // =========================================================================
  // --- GLOBAL NATURAL WONDERS, NATIONAL PARKS & HERITAGE SITES ---
  // =========================================================================
  // Americas Wonders & Parks
  { name: "Grand Canyon South Rim, Arizona, USA", lat: 36.05, lng: -112.14, spanLat: 0.15, spanLng: 0.15 },
  { name: "Yosemite Valley & El Capitan, California, USA", lat: 37.74, lng: -119.59, spanLat: 0.15, spanLng: 0.15 },
  { name: "Yellowstone (Old Faithful & Grand Prismatic), Wyoming, USA", lat: 44.42, lng: -110.58, spanLat: 0.25, spanLng: 0.25 },
  { name: "Zion Canyon & Angels Landing, Utah, USA", lat: 37.29, lng: -112.98, spanLat: 0.12, spanLng: 0.12 },
  { name: "Bryce Canyon Amphitheater Hoodoos, Utah, USA", lat: 37.62, lng: -112.16, spanLat: 0.12, spanLng: 0.12 },
  { name: "Monument Valley Navajo Tribal Park, Arizona/Utah, USA", lat: 36.99, lng: -110.11, spanLat: 0.15, spanLng: 0.15 },
  { name: "Death Valley & Badwater Basin, California, USA", lat: 36.53, lng: -116.93, spanLat: 0.25, spanLng: 0.25 },
  { name: "Big Sur Coast & Bixby Bridge, Highway 1, California, USA", lat: 36.37, lng: -121.9, spanLat: 0.2, spanLng: 0.2 },
  { name: "Joshua Tree & Mojave Desert, California, USA", lat: 33.87, lng: -115.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Mount Rainier & Paradise Meadows, Washington, USA", lat: 46.85, lng: -121.76, spanLat: 0.15, spanLng: 0.15 },
  { name: "Olympic Rainforest & Ruby Beach, Washington, USA", lat: 47.8, lng: -123.6, spanLat: 0.25, spanLng: 0.25 },
  { name: "Glacier National Park (Going-to-the-Sun Road), Montana, USA", lat: 48.75, lng: -113.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Acadia & Cadillac Mountain, Mount Desert Island, Maine, USA", lat: 44.35, lng: -68.27, spanLat: 0.15, spanLng: 0.15 },
  { name: "Great Smoky Mountains (Newfound Gap), Tennessee/NC, USA", lat: 35.61, lng: -83.42, spanLat: 0.2, spanLng: 0.2 },
  { name: "Everglades National Park & Flamingo, Florida, USA", lat: 25.28, lng: -80.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Road to Hana & Haleakala Volcano, Maui, Hawaii, USA", lat: 20.75, lng: -156.15, spanLat: 0.2, spanLng: 0.2 },
  { name: "Kauai (Na Pali Coast & Waimea Canyon), Hawaii, USA", lat: 22.08, lng: -159.6, spanLat: 0.15, spanLng: 0.15 },
  { name: "Niagara Falls (Horseshoe & American Falls), NY, USA / ON, Canada", lat: 43.08, lng: -79.07, spanLat: 0.1, spanLng: 0.1 },
  { name: "Lake Louise & Moraine Lake, Banff, Alberta, Canada", lat: 51.41, lng: -116.17, spanLat: 0.12, spanLng: 0.12 },
  { name: "Icefields Parkway & Columbia Icefield, Alberta, Canada", lat: 52.22, lng: -117.22, spanLat: 0.2, spanLng: 0.2 },
  { name: "Tofino & Pacific Rim Rainforest, Vancouver Island, BC, Canada", lat: 49.15, lng: -125.9, spanLat: 0.15, spanLng: 0.15 },
  { name: "Peggy's Cove & Lighthouse Coast, Nova Scotia, Canada", lat: 44.49, lng: -63.91, spanLat: 0.1, spanLng: 0.1 },
  { name: "Bay of Fundy Hopewell Rocks (Highest Tides), New Brunswick, Canada", lat: 45.82, lng: -64.57, spanLat: 0.1, spanLng: 0.1 },
  { name: "Teotihuacan Pyramids of Sun and Moon, Mexico", lat: 19.69, lng: -98.84, spanLat: 0.1, spanLng: 0.1 },
  { name: "Chichen Itza & Cenote Ik Kil, Yucatan, Mexico", lat: 20.68, lng: -88.56, spanLat: 0.1, spanLng: 0.1 },
  { name: "Tikal Mayan Pyramids & Jungle, Peten, Guatemala", lat: 17.22, lng: -89.62, spanLat: 0.1, spanLng: 0.1 },
  { name: "Monteverde Cloud Forest Reserve, Costa Rica", lat: 10.3, lng: -84.79, spanLat: 0.1, spanLng: 0.1 },
  { name: "Manuel Antonio Coastal Rainforest, Costa Rica", lat: 9.38, lng: -84.14, spanLat: 0.1, spanLng: 0.1 },
  { name: "Machu Picchu & Aguas Calientes (Inca Citadel), Peru", lat: -13.16, lng: -72.54, spanLat: 0.08, spanLng: 0.08 },
  { name: "Salar de Uyuni (World's Largest Salt Flat), Bolivia", lat: -20.13, lng: -67.48, spanLat: 0.3, spanLng: 0.3 },
  { name: "Torres del Paine (Cuernos del Paine), Patagonia, Chile", lat: -51.25, lng: -72.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Perito Moreno Glacier & Lake Argentino, Santa Cruz, Argentina", lat: -50.48, lng: -73.05, spanLat: 0.15, spanLng: 0.15 },
  { name: "Mount Fitz Roy & Laguna de los Tres, El Chalten, Argentina", lat: -49.27, lng: -72.88, spanLat: 0.12, spanLng: 0.12 },
  { name: "Iguazu Falls (Garganta del Diablo), Argentina / Brazil", lat: -25.69, lng: -54.43, spanLat: 0.1, spanLng: 0.1 },
  { name: "Fernando de Noronha Archipelago (Sancho Beach), Brazil", lat: -3.85, lng: -32.42, spanLat: 0.08, spanLng: 0.08 },
  { name: "Lencois Maranhenses (White Sand Lagoons), Brazil", lat: -2.53, lng: -43.12, spanLat: 0.2, spanLng: 0.2 },
  { name: "Galapagos Islands (Santa Cruz & Tortuga Bay), Ecuador", lat: -0.74, lng: -90.31, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cocora Valley & Salento (Giant Wax Palms), Colombia", lat: 4.63, lng: -75.57, spanLat: 0.1, spanLng: 0.1 },

  // Europe Wonders & Landscapes
  { name: "Mont Saint-Michel & Tidal Bay, Normandy, France", lat: 48.63, lng: -1.51, spanLat: 0.08, spanLng: 0.08 },
  { name: "Chamonix & Aiguille du Midi (Mont Blanc), France", lat: 45.92, lng: 6.86, spanLat: 0.12, spanLng: 0.12 },
  { name: "Gorges du Verdon (Grand Canyon of France), PACA, France", lat: 43.74, lng: 6.36, spanLat: 0.15, spanLng: 0.15 },
  { name: "Neuschwanstein Fairytale Castle, Bavaria, Germany", lat: 47.55, lng: 10.74, spanLat: 0.08, spanLng: 0.08 },
  { name: "Berchtesgaden & Konigssee Fjord Lake, Bavaria, Germany", lat: 47.55, lng: 12.98, spanLat: 0.12, spanLng: 0.12 },
  { name: "Saxon Switzerland & Bastei Bridge, Saxony, Germany", lat: 50.96, lng: 14.07, spanLat: 0.12, spanLng: 0.12 },
  { name: "Interlaken & Lauterbrunnen (Valley of 72 Waterfalls), Switzerland", lat: 46.59, lng: 7.9, spanLat: 0.12, spanLng: 0.12 },
  { name: "Hallstatt & Salzkammergut Alpine Lake, Austria", lat: 47.56, lng: 13.64, spanLat: 0.08, spanLng: 0.08 },
  { name: "Grossglockner High Alpine Road, Austria", lat: 47.08, lng: 12.84, spanLat: 0.15, spanLng: 0.15 },
  { name: "Giethoorn (Venice of the Netherlands), Overijssel, Netherlands", lat: 52.74, lng: 6.07, spanLat: 0.08, spanLng: 0.08 },
  { name: "Keukenhof Tulip Gardens & Flower Fields, Lisse, Netherlands", lat: 52.26, lng: 4.54, spanLat: 0.08, spanLng: 0.08 },
  { name: "Kinderdijk UNESCO Windmills, South Holland, Netherlands", lat: 51.88, lng: 4.63, spanLat: 0.08, spanLng: 0.08 },
  { name: "Cliffs of Moher & O'Brien's Tower, County Clare, Ireland", lat: 52.97, lng: -9.43, spanLat: 0.1, spanLng: 0.1 },
  { name: "Giant's Causeway Basalt Columns, Northern Ireland, UK", lat: 55.24, lng: -6.51, spanLat: 0.08, spanLng: 0.08 },
  { name: "Isle of Skye (Quiraing & Fairy Pools), Scotland, UK", lat: 57.58, lng: -6.26, spanLat: 0.15, spanLng: 0.15 },
  { name: "Loch Ness & Urquhart Castle, Scottish Highlands, UK", lat: 57.32, lng: -4.44, spanLat: 0.15, spanLng: 0.15 },
  { name: "Stonehenge & Salisbury Plain, Wiltshire, England, UK", lat: 51.17, lng: -1.82, spanLat: 0.08, spanLng: 0.08 },
  { name: "Lake District (Windermere & Keswick), England, UK", lat: 54.45, lng: -3.05, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dolomites (Tre Cime di Lavaredo & Cortina), Italy", lat: 46.61, lng: 12.29, spanLat: 0.15, spanLng: 0.15 },
  { name: "Val d'Orcia (Cypress Roads & Rolling Hills), Tuscany, Italy", lat: 43.06, lng: 11.6, spanLat: 0.15, spanLng: 0.15 },
  { name: "Capri Island (Blue Grotto & Faraglioni), Campania, Italy", lat: 40.55, lng: 14.24, spanLat: 0.08, spanLng: 0.08 },
  { name: "Pompeii Archaeological Park & Mount Vesuvius, Italy", lat: 40.75, lng: 14.48, spanLat: 0.1, spanLng: 0.1 },
  { name: "Matera (Ancient Sassi Cave Dwellings), Basilicata, Italy", lat: 40.66, lng: 16.61, spanLat: 0.08, spanLng: 0.08 },
  { name: "Ronda (El Tajo 100m Gorge & Puente Nuevo), Spain", lat: 36.74, lng: -5.16, spanLat: 0.08, spanLng: 0.08 },
  { name: "Pena Palace & Cabo da Roca (Westmost Europe), Sintra, Portugal", lat: 38.78, lng: -9.4, spanLat: 0.1, spanLng: 0.1 },
  { name: "Benagil Sea Cave & Marinha Beach, Algarve, Portugal", lat: 37.08, lng: -8.42, spanLat: 0.08, spanLng: 0.08 },
  { name: "Plitvice Lakes (16 Terraced Lakes & Waterfalls), Croatia", lat: 44.88, lng: 15.62, spanLat: 0.12, spanLng: 0.12 },
  { name: "Transfagarasan Alpine Highway & Balea Lake, Romania", lat: 45.6, lng: 24.61, spanLat: 0.15, spanLng: 0.15 },
  { name: "Geirangerfjord & Trollstigen Mountain Road, Norway", lat: 62.1, lng: 7.2, spanLat: 0.15, spanLng: 0.15 },
  { name: "Preikestolen (Pulpit Rock 604m Cliff), Lysefjord, Norway", lat: 58.98, lng: 6.18, spanLat: 0.08, spanLng: 0.08 },
  { name: "Nordkapp (North Cape Arctic Plateau), Norway", lat: 71.17, lng: 25.78, spanLat: 0.08, spanLng: 0.08 },
  { name: "Golden Circle (Gullfoss / Geysir / Thingvellir), Iceland", lat: 64.31, lng: -20.3, spanLat: 0.2, spanLng: 0.2 },
  { name: "Jokulsarlon Glacier Lagoon & Diamond Beach, Iceland", lat: 64.04, lng: -16.18, spanLat: 0.1, spanLng: 0.1 },
  { name: "Kirkjufell Mountain & Snaefellsnes Peninsula, Iceland", lat: 64.92, lng: -23.3, spanLat: 0.12, spanLng: 0.12 },
  { name: "Mulafossur Waterfall & Gasadalur, Faroe Islands", lat: 62.1, lng: -7.43, spanLat: 0.08, spanLng: 0.08 },

  // Asia, Middle East & Africa Wonders
  { name: "Fushimi Inari (10000 Red Torii Gates), Kyoto, Japan", lat: 34.96, lng: 135.77, spanLat: 0.08, spanLng: 0.08 },
  { name: "Arashiyama Bamboo Grove & Sagano, Kyoto, Japan", lat: 35.01, lng: 135.67, spanLat: 0.08, spanLng: 0.08 },
  { name: "Shirakawa-go (Thatched Roof Gassho Villages), Gifu, Japan", lat: 36.25, lng: 136.9, spanLat: 0.08, spanLng: 0.08 },
  { name: "Miyajima Island Floating Torii & Mount Misen, Japan", lat: 34.29, lng: 132.32, spanLat: 0.08, spanLng: 0.08 },
  { name: "Yakushima Ancient Cedar Rainforest (Mononoke Island), Japan", lat: 30.35, lng: 130.52, spanLat: 0.15, spanLng: 0.15 },
  { name: "Seoraksan National Park (Granite Peaks), Gangwon, South Korea", lat: 38.11, lng: 128.46, spanLat: 0.15, spanLng: 0.15 },
  { name: "Sun Moon Lake & Lalu Island, Nantou, Taiwan", lat: 23.86, lng: 120.91, spanLat: 0.1, spanLng: 0.1 },
  { name: "Trang An & Tam Coc (Ha Long on Land), Ninh Binh, Vietnam", lat: 20.25, lng: 105.9, spanLat: 0.12, spanLng: 0.12 },
  { name: "Sapa & Fansipan Peak (Roof of Indochina), Vietnam", lat: 22.33, lng: 103.84, spanLat: 0.12, spanLng: 0.12 },
  { name: "Ma Pi Leng Pass & Dong Van Karst Plateau, Ha Giang, Vietnam", lat: 23.23, lng: 105.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Kuang Si Waterfalls & Turquoise Pools, Luang Prabang, Laos", lat: 19.74, lng: 101.99, spanLat: 0.08, spanLng: 0.08 },
  { name: "Mount Bromo Caldera & Sea of Sand, East Java, Indonesia", lat: -7.94, lng: 112.95, spanLat: 0.12, spanLng: 0.12 },
  { name: "Mount Ijen (Electric Blue Fire Crater Lake), East Java, Indonesia", lat: -8.05, lng: 114.24, spanLat: 0.1, spanLng: 0.1 },
  { name: "Komodo National Park (Komodo Dragons & Pink Beach), Flores, Indonesia", lat: -8.55, lng: 119.5, spanLat: 0.15, spanLng: 0.15 },
  { name: "El Nido (Bacuit Archipelago Secret Lagoons), Palawan, Philippines", lat: 11.2, lng: 119.41, spanLat: 0.15, spanLng: 0.15 },
  { name: "Coron Island (Kayangan Lake & Twin Lagoon), Palawan, Philippines", lat: 11.96, lng: 120.22, spanLat: 0.12, spanLng: 0.12 },
  { name: "Bohol (Chocolate Hills Geologic Formations), Philippines", lat: 9.91, lng: 124.16, spanLat: 0.15, spanLng: 0.15 },
  { name: "Banaue & Batad 2000-Year Rice Terraces, Ifugao, Philippines", lat: 16.91, lng: 121.05, spanLat: 0.1, spanLng: 0.1 },
  { name: "Mount Mayon (Perfect Symmetry Cone Volcano), Albay, Philippines", lat: 13.25, lng: 123.68, spanLat: 0.12, spanLng: 0.12 },
  { name: "Pamukkale (Thermal Travertine Snow Terraces), Turkey", lat: 37.92, lng: 29.12, spanLat: 0.08, spanLng: 0.08 },
  { name: "Ephesus (Ancient Roman Celsus Library), Izmir, Turkey", lat: 37.94, lng: 27.34, spanLat: 0.08, spanLng: 0.08 },
  { name: "Mount Nemrut (Colossal Royal Stone Heads), Adıyaman, Turkey", lat: 37.98, lng: 38.74, spanLat: 0.08, spanLng: 0.08 },
  { name: "Wadi Rum (Valley of the Moon Red Sand Dunes), Jordan", lat: 29.57, lng: 35.42, spanLat: 0.2, spanLng: 0.2 },
  { name: "Dead Sea (Earth's Lowest Land Elevation -430m), Jordan/Israel", lat: 31.55, lng: 35.5, spanLat: 0.2, spanLng: 0.2 },
  { name: "Wadi Al Disah (Grand Sandstone Canyon), Tabuk, Saudi Arabia", lat: 27.6, lng: 36.45, spanLat: 0.15, spanLng: 0.15 },
  { name: "Jebel Shams (Grand Canyon of Arabia), Al Hajar, Oman", lat: 23.23, lng: 57.26, spanLat: 0.12, spanLng: 0.12 },
  { name: "Abu Simbel (Colossi of Ramses II & Nefertari), Aswan, Egypt", lat: 22.33, lng: 31.62, spanLat: 0.08, spanLng: 0.08 },
  { name: "Merzouga & Erg Chebbi (150m High Sahara Dunes), Morocco", lat: 31.1, lng: -3.98, spanLat: 0.15, spanLng: 0.15 },
  { name: "Ait Benhaddou (Gladiator UNESCO Earthen Ksar), Morocco", lat: 31.04, lng: -7.13, spanLat: 0.08, spanLng: 0.08 },
  { name: "Serengeti National Park (Great Migration Plains), Tanzania", lat: -2.33, lng: 34.83, spanLat: 0.35, spanLng: 0.35 },
  { name: "Ngorongoro Volcanic Crater Caldera Safari, Tanzania", lat: -3.23, lng: 35.48, spanLat: 0.2, spanLng: 0.2 },
  { name: "Mount Kilimanjaro (Uhuru Peak 5895m Roof of Africa), Tanzania", lat: -3.07, lng: 37.35, spanLat: 0.15, spanLng: 0.15 },
  { name: "Maasai Mara National Reserve (Mara River Crossing), Kenya", lat: -1.48, lng: 35.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Amboseli National Park (Elephants & Kilimanjaro View), Kenya", lat: -2.65, lng: 37.26, spanLat: 0.2, spanLng: 0.2 },
  { name: "Bwindi Impenetrable National Park (Mountain Gorillas), Uganda", lat: -1.05, lng: 29.61, spanLat: 0.15, spanLng: 0.15 },
  { name: "Sossusvlei & Deadvlei (World's Tallest Red Dunes Dune 45), Namibia", lat: -24.72, lng: 15.29, spanLat: 0.2, spanLng: 0.2 },
  { name: "Fish River Canyon (Second Largest Canyon on Earth), Namibia", lat: -27.69, lng: 17.6, spanLat: 0.2, spanLng: 0.2 },
  { name: "Okavango Delta (World's Largest Inland Delta), Botswana", lat: -19.28, lng: 22.9, spanLat: 0.3, spanLng: 0.3 },
  { name: "Blyde River Canyon & God's Window, Mpumalanga, South Africa", lat: -24.58, lng: 30.82, spanLat: 0.15, spanLng: 0.15 },
  { name: "Cape of Good Hope & Boulders Beach Penguins, South Africa", lat: -34.2, lng: 18.45, spanLat: 0.15, spanLng: 0.15 },
  { name: "Lalibela (Rock-Hewn Monolithic Church of St. George), Ethiopia", lat: 12.03, lng: 39.04, spanLat: 0.08, spanLng: 0.08 },
  { name: "Danakil Depression & Erta Ale Lava Lake, Afar, Ethiopia", lat: 14.24, lng: 40.3, spanLat: 0.2, spanLng: 0.2 },
  { name: "Avenue of the Baobabs & Menabe Rainforest, Morondava, Madagascar", lat: -20.25, lng: 44.41, spanLat: 0.1, spanLng: 0.1 },
  { name: "Chamarel (Seven Coloured Earths & 83m Waterfall), Mauritius", lat: -20.42, lng: 57.37, spanLat: 0.08, spanLng: 0.08 },

  // Oceania & Pacific Wonders
  { name: "Uluru-Kata Tjuta (Ayers Rock Sacred Monolith), Red Centre, Australia", lat: -25.34, lng: 131.03, spanLat: 0.15, spanLng: 0.15 },
  { name: "Whitehaven Beach & Hill Inlet (Pure Silica Sand), Whitsundays, Australia", lat: -20.28, lng: 149.03, spanLat: 0.1, spanLng: 0.1 },
  { name: "Daintree Rainforest & Cape Tribulation (Where Reef Meets Rainforest), Australia", lat: -16.08, lng: 145.46, spanLat: 0.15, spanLng: 0.15 },
  { name: "Twelve Apostles & Port Campbell Limestone Stacks, Victoria, Australia", lat: -38.66, lng: 143.1, spanLat: 0.1, spanLng: 0.1 },
  { name: "Blue Mountains & Three Sisters Rock (Jamison Valley), NSW, Australia", lat: -33.73, lng: 150.31, spanLat: 0.12, spanLng: 0.12 },
  { name: "Cradle Mountain & Dove Lake Glacial Wilderness, Tasmania, Australia", lat: -41.68, lng: 145.95, spanLat: 0.12, spanLng: 0.12 },
  { name: "Wineglass Bay & Hazard Peaks, Freycinet, Tasmania, Australia", lat: -42.14, lng: 148.3, spanLat: 0.1, spanLng: 0.1 },
  { name: "Ningaloo Reef & Cape Range (Whale Shark Sanctuary), Exmouth, Australia", lat: -22.15, lng: 113.88, spanLat: 0.2, spanLng: 0.2 },
  { name: "Rottnest Island & Quokka Coast, Western Australia", lat: -32.0, lng: 115.52, spanLat: 0.08, spanLng: 0.08 },
  { name: "Milford Sound & Mitre Peak (Fiordland Wilderness), South Island, New Zealand", lat: -44.67, lng: 167.92, spanLat: 0.12, spanLng: 0.12 },
  { name: "Mount Cook / Aoraki & Lake Pukaki Turquoise Water, New Zealand", lat: -43.73, lng: 170.1, spanLat: 0.15, spanLng: 0.15 },
  { name: "That Wanaka Tree & Lake Wanaka, Otago, New Zealand", lat: -44.69, lng: 169.11, spanLat: 0.1, spanLng: 0.1 },
  { name: "Tongariro Alpine Crossing & Emerald Lakes (Mount Doom), New Zealand", lat: -39.14, lng: 175.64, spanLat: 0.12, spanLng: 0.12 },
  { name: "Cathedral Cove & Hot Water Beach, Coromandel, New Zealand", lat: -36.82, lng: 175.79, spanLat: 0.1, spanLng: 0.1 },
  { name: "Hobbiton Movie Set (The Shire), Matamata, Waikato, New Zealand", lat: -37.87, lng: 175.68, spanLat: 0.08, spanLng: 0.08 },
  { name: "Waitomo Glowworm Caves & Ruakuri, Waikato, New Zealand", lat: -38.26, lng: 175.1, spanLat: 0.08, spanLng: 0.08 },
  { name: "To Sua Ocean Trench (Lava Pool), Upolu, Samoa", lat: -14.04, lng: -171.44, spanLat: 0.08, spanLng: 0.08 },
  { name: "Aitutaki Turquoise Lagoon & One Foot Island, Cook Islands", lat: -18.85, lng: -159.78, spanLat: 0.08, spanLng: 0.08 },
  { name: "Rock Islands Southern Lagoon & Jellyfish Lake, Koror, Palau", lat: 7.28, lng: 134.42, spanLat: 0.12, spanLng: 0.12 },
];

// Used when MAPILLARY_TOKEN is empty so the full game flow can be tested
// without network access. imageId values are placeholders with real world coords.
const TEST_LOCATIONS: PickedLocation[] = [
  { imageId: "test-loc-paris", lat: 48.8584, lng: 2.2945 }, // Eiffel Tower, Paris
  { imageId: "test-loc-nyc", lat: 40.7484, lng: -73.9857 }, // Empire State, NYC
  { imageId: "test-loc-tokyo", lat: 35.6586, lng: 139.7454 }, // Tokyo Tower
  { imageId: "test-loc-sydney", lat: -33.8568, lng: 151.2153 }, // Sydney Opera House
  { imageId: "test-loc-mumbai", lat: 19.076, lng: 72.8777 }, // Mumbai
  { imageId: "test-loc-london", lat: 51.5007, lng: -0.1246 }, // Big Ben, London
  { imageId: "test-loc-rome", lat: 41.8902, lng: 12.4922 }, // Colosseum, Rome
  { imageId: "test-loc-cairo", lat: 29.9792, lng: 31.1342 }, // Pyramids, Cairo
  { imageId: "test-loc-rio", lat: -22.9519, lng: -43.2105 }, // Christ the Redeemer, Rio
  { imageId: "test-loc-berlin", lat: 52.5163, lng: 13.3777 }, // Brandenburg Gate, Berlin
  { imageId: "test-loc-toronto", lat: 43.6426, lng: -79.3871 }, // CN Tower, Toronto
  { imageId: "test-loc-dubai", lat: 25.1972, lng: 55.2744 }, // Burj Khalifa, Dubai
  { imageId: "test-loc-bangkok", lat: 13.75, lng: 100.4914 }, // Grand Palace, Bangkok
  { imageId: "test-loc-singapore", lat: 1.2838, lng: 103.8591 }, // Marina Bay, Singapore
  { imageId: "test-loc-seoul", lat: 37.5512, lng: 126.9882 }, // N Seoul Tower
  { imageId: "test-loc-amsterdam", lat: 52.3731, lng: 4.8926 }, // Dam Square, Amsterdam
  { imageId: "test-loc-capetown", lat: -33.9573, lng: 18.4031 }, // Table Mountain, Cape Town
  { imageId: "test-loc-buenosaires", lat: -34.6037, lng: -58.3816 }, // Obelisco, Buenos Aires
  { imageId: "test-loc-auckland", lat: -36.8485, lng: 174.7633 }, // Sky Tower, Auckland
  { imageId: "test-loc-athens", lat: 37.9715, lng: 23.7257 }, // Acropolis, Athens
  { imageId: "test-loc-istanbul", lat: 41.0086, lng: 28.9802 }, // Hagia Sophia, Istanbul
  { imageId: "test-loc-reykjavik", lat: 64.1417, lng: -21.9266 }, // Hallgrimskirkja, Reykjavik
  { imageId: "test-loc-santiago", lat: -33.4372, lng: -70.6506 }, // Plaza de Armas, Santiago
  { imageId: "test-loc-vienna", lat: 48.2082, lng: 16.3738 }, // St. Stephen's, Vienna
  { imageId: "test-loc-kyoto", lat: 34.9949, lng: 135.785 }, // Kiyomizu-dera, Kyoto
];

// Anti-repetition sliding memory: tracks recent location IDs to
// guarantee consecutive rounds never repeat the same location.
const recentImageIds: string[] = [];
const MAX_RECENT = 100;

function recordPicked(loc: PickedLocation): PickedLocation {
  recentImageIds.push(loc.imageId);
  if (recentImageIds.length > MAX_RECENT) {
    recentImageIds.shift();
  }
  return loc;
}

function pickRandomNonRecent(list: PickedLocation[]): PickedLocation {
  let eligible = list.filter((l) => !recentImageIds.includes(l.imageId));
  if (eligible.length === 0 && recentImageIds.length > 0) {
    // Drop the oldest half of recent history so older locations become
    // re-eligible while recently played rounds stay strictly blocked.
    recentImageIds.splice(0, Math.ceil(recentImageIds.length / 2));
    eligible = list.filter((l) => !recentImageIds.includes(l.imageId));
  }
  const poolChoice = eligible.length > 0 ? eligible : list;
  return poolChoice[Math.floor(Math.random() * poolChoice.length)];
}

// Verified real equirectangular 360° panoramas across all continents.
// Used for instant startup, fallback on API timeouts, and test resilience.
const REAL_FALLBACKS: PickedLocation[] = verifiedPanos.map((p) => ({
  imageId: p.imageId,
  lat: p.lat,
  lng: p.lng,
}));

const MAPILLARY_FIELDS = "id,computed_geometry,is_pano,width,height";

// Global throttle on Mapillary GRAPH calls (the picker's live searches):
// a burst of rounds must not fan out dozens of parallel requests or blow
// the free tier's rate budget.
const GRAPH_MAX_CONCURRENCY = 24;
const GRAPH_MAX_PER_MINUTE = 300;
let graphInFlight = 0;
let graphMinuteStart = Date.now();
let graphCallsThisMinute = 0;
let authFailureLogged = false;

function graphSlot(): boolean {
  const now = Date.now();
  if (now - graphMinuteStart > 60_000) {
    graphMinuteStart = now;
    graphCallsThisMinute = 0;
  }
  if (graphCallsThisMinute >= GRAPH_MAX_PER_MINUTE) return false;
  if (graphInFlight >= GRAPH_MAX_CONCURRENCY) return false;
  graphInFlight++;
  graphCallsThisMinute++;
  return true;
}

function releaseGraphSlot(): void {
  graphInFlight--;
}

interface MapillaryImage {
  id?: unknown;
  computed_geometry?: { coordinates?: unknown };
  is_pano?: unknown;
  width?: unknown;
  height?: unknown;
}

function randomPoint(region: Region): { lat: number; lng: number } {
  // Tight street-level jitter (stays within dense coverage of curated coords)
  const jitter = 0.0008;
  return {
    lat: region.lat + (Math.random() - 0.5) * jitter,
    lng: region.lng + (Math.random() - 0.5) * jitter,
  };
}

async function fetchImages(params: Record<string, string>): Promise<MapillaryImage[]> {
  if (!graphSlot()) return []; // throttled: caller treats it as "no images here"
  const url = new URL("https://graph.mapillary.com/images");
  url.searchParams.set("access_token", ENV.MAPILLARY_TOKEN);
  url.searchParams.set("fields", MAPILLARY_FIELDS);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    // Fail fast on credential errors: hammering six batches against a dead
    // token only burns rate budget and delays the round.
    if (res.status === 401 || res.status === 403) {
      if (!authFailureLogged) {
        authFailureLogged = true;
        console.warn(`[picker] Mapillary auth failed (${res.status}); using fallback locations`);
      }
      throw new Error("mapillary_auth");
    }
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: MapillaryImage[] };
    return json.data ?? [];
  } catch (e) {
    if (e instanceof Error && e.message === "mapillary_auth") throw e;
    // Timeout / network error: treat as "no images here" so the caller
    // retries the next region instead of crashing the round.
    return [];
  } finally {
    releaseGraphSlot();
  }
}

function toPicked(img: MapillaryImage | undefined): PickedLocation | null {
  const coords = img?.computed_geometry?.coordinates;
  if (!img?.id || !Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { imageId: String(img.id), lat, lng };
}

// Maps only render equirectangular images (width = 2x height). Accepts
// is_pano flags OR anything that looks equirectangular.
async function searchRadius(lat: number, lng: number): Promise<PickedLocation | null> {
  const images = await fetchImages({
    lat: String(lat.toFixed(5)),
    lng: String(lng.toFixed(5)),
    radius: "50",
    limit: "50",
  });
  const equirects = images.filter((i) => {
    const w = Number(i.width);
    const h = Number(i.height);
    return i.is_pano === true || (w > 2000 && w === 2 * h);
  });
  if (equirects.length === 0) return null;
  const chosen = equirects[Math.floor(Math.random() * equirects.length)];
  return toPicked(chosen);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Panoramic imagery clusters on main road grids around region centers.
const OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0.001, 0.001],
  [-0.001, -0.001],
  [0.0025, -0.0015],
  [-0.0015, 0.0025],
];

async function searchBatch(
  count: number,
  finder: (lat: number, lng: number) => Promise<PickedLocation | null>,
): Promise<PickedLocation | null> {
  const points = Array.from({ length: count }, () => {
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const { lat, lng } = randomPoint(region);
    return OFFSETS.map(([dlat, dlng]) => ({ lat: lat + dlat, lng: lng + dlng }));
  }).flat();
  const results = await Promise.all(points.map((p) => finder(p.lat, p.lng)));
  return results.find(Boolean) ?? null;
}

// Pre-warmed pool so rounds start instantly instead of waiting on the Mapillary API.
// pickRandomLocation pulls from the pool and refills in the background.
const pool: PickedLocation[] = [];
let warming = false;

async function fillPool(target: number): Promise<void> {
  if (warming || pool.length >= target) return;
  warming = true;
  try {
    let attempts = 0;
    const maxAttempts = target * 3;
    while (pool.length < target && attempts < maxAttempts) {
      attempts++;
      const loc = await pickRandomLocationLive();
      if (loc && !pool.some((p) => p.imageId === loc.imageId)) {
        pool.push(loc);
      }
    }
  } finally {
    warming = false;
  }
}

export function initLocationPool(target = 6): void {
  if (!ENV.MAPILLARY_TOKEN) {
    // Test/dev mode: seed the pool with distinct non-repeated items.
    for (let i = 0; i < target; i++) {
      pool.push(recordPicked(pickRandomNonRecent(TEST_LOCATIONS)));
    }
    return;
  }
  // Pre-seed with verified distinct global locations immediately so first rounds never block
  for (let i = 0; i < 3; i++) {
    pool.push(recordPicked(pickRandomNonRecent(REAL_FALLBACKS)));
  }
  void fillPool(target).catch(() => {});
}

export async function pickRandomLocation(): Promise<PickedLocation> {
  const warmed = pool.shift();
  if (warmed) {
    void fillPool(6).catch(() => {}); // keep pool topped up in background
    return recordPicked(warmed);
  }
  return recordPicked(await pickRandomLocationLive());
}

async function pickRandomLocationLive(): Promise<PickedLocation> {
  if (!ENV.MAPILLARY_TOKEN) {
    return pickRandomNonRecent(TEST_LOCATIONS);
  }
  try {
    for (let batch = 0; batch < 4; batch++) {
      const found = await searchBatch(3, searchRadius);
      if (found && !recentImageIds.includes(found.imageId)) return found;
      await sleep(250);
    }
  } catch {
    return pickRandomNonRecent(REAL_FALLBACKS);
  }
  return pickRandomNonRecent(REAL_FALLBACKS);
}
