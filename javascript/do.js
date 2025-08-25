import { NWSWeatherAPI } from './nws_api.js';
import { parseForecast } from './nws_utils.js';

async function getWeatherForecast(latitude, longitude) {
  const nwsApi = new NWSWeatherAPI();

  // Get the forecast data
  const forecastData = await nwsApi.getForecast(latitude, longitude);

  // Parse the forecast data into a Forecast object
  const forecast = parseForecast(forecastData);

  // Get today's forecast
  const today = forecast.today;

  console.log(`Weather for today: ${today.shortForecast}`);
  console.log(`Temperature: ${today.temperature.value}°${today.temperature.unit}`);
  console.log(`Wind: ${today.wind.speed} ${today.wind.unit} ${today.wind.direction}`);

  return forecast;
}

// Example usage
getWeatherForecast(37.7749, -122.4194)
  .then(forecast => console.log('Forecast retrieved successfully'))
  .catch(error => console.error('Failed to retrieve forecast'));