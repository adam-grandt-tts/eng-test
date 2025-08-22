// nws_utils.js
const { 
  Coordinates, Temperature, Wind, Precipitation, 
  WeatherCondition, ForecastPeriod, Forecast, 
  Observation, Alert 
} = require('./weather_models');

/**
 * Parse raw forecast data into a Forecast object.
 * @param {Object} forecastData - Raw forecast data from the API.
 * @returns {Forecast} Parsed forecast object.
 */
function parseForecast(forecastData) {
  const properties = forecastData.properties || {};
  let updated = properties.updated || "";
  if (updated) {
    updated = new Date(updated);
  }

  const periods = [];
  for (const periodData of properties.periods || []) {
    const startTime = new Date(periodData.startTime || "");
    const endTime = new Date(periodData.endTime || "");
    
    const temperature = new Temperature(
      periodData.temperature || 0,
      periodData.temperatureUnit || "F"
    );
    
    const windDirection = periodData.windDirection || "";
    const windSpeedStr = periodData.windSpeed || "0 mph";
    const windSpeed = parseInt(windSpeedStr.replace(/[^0-9]/g, ""));
    
    const wind = new Wind(
      windSpeed,
      windDirection,
      "mph"
    );
    
    const period = new ForecastPeriod(
      periodData.name || "",
      startTime,
      endTime,
      temperature,
      wind,
      periodData.shortForecast || "",
      periodData.detailedForecast || "",
      periodData.icon,
      periodData.probabilityOfPrecipitation?.value
    );
    
    periods.push(period);
  }
  
  return new Forecast(updated, periods);
}

/**
 * Parse raw observation data into an Observation object.
 * @param {Object} observationData - Raw observation data from the API.
 * @returns {Observation} Parsed observation object.
 */
function parseObservation(observationData) {
  const properties = observationData.properties || {};
  
  const station = properties.station || "";
  const timestampStr = properties.timestamp || "";
  const timestamp = timestampStr ? new Date(timestampStr) : new Date();
  
  let temperature = null;
  if ("temperature" in properties) {
    temperature = new Temperature(
      properties.temperature.value || 0,
      (properties.temperature.unitCode || "wmoUnit:degC").split(":").pop()
    );
  }
  
  let dewpoint = null;
  if ("dewpoint" in properties) {
    dewpoint = new Temperature(
      properties.dewpoint.value || 0,
      (properties.dewpoint.unitCode || "wmoUnit:degC").split(":").pop()
    );
  }
  
  const relativeHumidity = properties.relativeHumidity?.value;
  
  let wind = null;
  if ("windSpeed" in properties && "windDirection" in properties) {
    wind = new Wind(
      properties.windSpeed.value || 0,
      properties.windDirection.value || 0,
      (properties.windSpeed.unitCode || "wmoUnit:km_h-1").split(":").pop()
    );
  }
  
  const barometricPressure = properties.barometricPressure?.value;
  const visibility = properties.visibility?.value;
  const textDescription = properties.textDescription || "";
  
  let precipitationLastHour = null;
  if ("precipitationLastHour" in properties) {
    precipitationLastHour = new Precipitation(
      properties.precipitationLastHour.value || 0,
      null,
      (properties.precipitationLastHour.unitCode || "wmoUnit:mm").split(":").pop()
    );
  }
  
  return new Observation(
    station,
    timestamp,
    temperature,
    dewpoint,
    relativeHumidity,
    wind,
    barometricPressure,
    visibility,
    textDescription,
    precipitationLastHour
  );
}

/**
 * Parse raw alert data into an Alert object.
 * @param {Object} alertData - Raw alert data from the API.
 * @returns {Alert} Parsed alert object.
 */
function parseAlert(alertData) {
  const properties = alertData.properties || {};
  
  // Parse timestamps
  const sent = new Date(properties.sent || "");
  const effective = new Date(properties.effective || "");
  const expires = new Date(properties.expires || "");
  
  const onsetStr = properties.onset;
  const onset = onsetStr ? new Date(onsetStr) : null;
  
  const endsStr = properties.ends;
  const ends = endsStr ? new Date(endsStr) : null;
  
  // Parse affected zones
  const affectedZones = [];
  for (const zone of properties.affectedZones || []) {
    const zoneId = zone.split("/").pop();
    affectedZones.push(zoneId);
  }
  
  // Parse affected counties
  const affectedCounties = [];
  for (const county of properties.geocode?.SAME || []) {
    affectedCounties.push(county);
  }
  
  return new Alert(
    properties.id || "",
    properties.event || "",
    properties.headline || "",
    properties.description || "",
    properties.instruction,
    properties.severity || "",
    properties.certainty || "",
    properties.urgency || "",
    sent,
    effective,
    onset,
    expires,
    ends,
    properties.status || "",
    properties.messageType || "",
    properties.category || "",
    properties.response || "",
    affectedZones,
    affectedCounties
  );
}

/**
 * Get coordinates for an address using a geocoding service.
 * @param {string} address - Address to geocode.
 * @returns {Coordinates|null} Coordinates for the address, or null if geocoding failed.
 */
function getCoordinatesFromAddress(address) {
  try {
    // This is a placeholder. In a real implementation, you would use a geocoding service
    // like Google Maps, Nominatim, or similar.
    
    // For now, return null to indicate that geocoding is not implemented
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert Celsius to Fahrenheit.
 * @param {number} celsius - Temperature in Celsius.
 * @returns {number} Temperature in Fahrenheit.
 */
function celsiusToFahrenheit(celsius) {
  return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius.
 * @param {number} fahrenheit - Temperature in Fahrenheit.
 * @returns {number} Temperature in Celsius.
 */
function fahrenheitToCelsius(fahrenheit) {
  return (fahrenheit - 32) * 5/9;
}

/**
 * Convert meters to miles.
 * @param {number} meters - Distance in meters.
 * @returns {number} Distance in miles.
 */
function metersToMiles(meters) {
  return meters / 1609.344;
}

/**
 * Convert miles to meters.
 * @param {number} miles - Distance in miles.
 * @returns {number} Distance in meters.
 */
function milesToMeters(miles) {
  return miles * 1609.344;
}

/**
 * Convert kilometers per hour to miles per hour.
 * @param {number} kph - Speed in kilometers per hour.
 * @returns {number} Speed in miles per hour.
 */
function kphToMph(kph) {
  return kph * 0.621371;
}

/**
 * Convert miles per hour to kilometers per hour.
 * @param {number} mph - Speed in miles per hour.
 * @returns {number} Speed in kilometers per hour.
 */
function mphToKph(mph) {
  return mph * 1.60934;
}

module.exports = {
  parseForecast,
  parseObservation,
  parseAlert,
  getCoordinatesFromAddress,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  metersToMiles,
  milesToMeters,
  kphToMph,
  mphToKph
};
