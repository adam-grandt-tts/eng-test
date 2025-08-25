// nws_utils.test.js
import {
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
} from './nws_utils.js';

import {
  Forecast,
  Observation,
  Alert
} from './weather_models.js';

describe('parseForecast', () => {
  test('parses forecast data correctly', () => {
    const forecastData = {
      properties: {
        updated: "2023-01-01T10:00:00Z",
        periods: [
          {
            name: "Today",
            startTime: "2023-01-01T12:00:00Z",
            endTime: "2023-01-01T18:00:00Z",
            temperature: 75,
            temperatureUnit: "F",
            windDirection: "S",
            windSpeed: "10 mph",
            shortForecast: "Sunny",
            detailedForecast: "Sunny skies with light winds",
            icon: "https://api.weather.gov/icons/land/day/sunny",
            probabilityOfPrecipitation: { value: 10 }
          }
        ]
      }
    };
    
    const result = parseForecast(forecastData);
    
    expect(result).toBeInstanceOf(Forecast);
    expect(result.updated).toEqual(new Date("2023-01-01T10:00:00Z"));
    expect(result.periods.length).toBe(1);
    
    const period = result.periods[0];
    expect(period.name).toBe("Today");
    expect(period.startTime).toEqual(new Date("2023-01-01T12:00:00Z"));
    expect(period.endTime).toEqual(new Date("2023-01-01T18:00:00Z"));
    expect(period.temperature.value).toBe(75);
    expect(period.temperature.unit).toBe("F");
    expect(period.wind.speed).toBe(10);
    expect(period.wind.direction).toBe("S");
    expect(period.wind.unit).toBe("mph");
    expect(period.shortForecast).toBe("Sunny");
    expect(period.detailedForecast).toBe("Sunny skies with light winds");
    expect(period.icon).toBe("https://api.weather.gov/icons/land/day/sunny");
    expect(period.precipitationProbability).toBe(10);
  });
  
  test('handles empty forecast data', () => {
    const forecastData = {
      properties: {
        updated: "",
        periods: []
      }
    };
    
    const result = parseForecast(forecastData);
    
    expect(result).toBeInstanceOf(Forecast);
    expect(result.periods).toEqual([]);
  });
});

describe('parseObservation', () => {
  test('parses observation data correctly', () => {
    const observationData = {
      properties: {
        station: "KDCA",
        timestamp: "2023-01-01T12:00:00Z",
        temperature: {
          value: 22.2,
          unitCode: "wmoUnit:degC"
        },
        dewpoint: {
          value: 15.0,
          unitCode: "wmoUnit:degC"
        },
        relativeHumidity: {
          value: 65
        },
        windSpeed: {
          value: 12.0,
          unitCode: "wmoUnit:km_h-1"
        },
        windDirection: {
          value: 180
        },
        barometricPressure: {
          value: 1015.2
        },
        visibility: {
          value: 16000
        },
        textDescription: "Fair",
        precipitationLastHour: {
          value: 0,
          unitCode: "wmoUnit:mm"
        }
      }
    };
    
    const result = parseObservation(observationData);
    
    expect(result).toBeInstanceOf(Observation);
    expect(result.station).toBe("KDCA");
    expect(result.timestamp).toEqual(new Date("2023-01-01T12:00:00Z"));
    expect(result.temperature.value).toBe(22.2);
    expect(result.temperature.unit).toBe("degC");
    expect(result.dewpoint.value).toBe(15.0);
    expect(result.dewpoint.unit).toBe("degC");
    expect(result.relativeHumidity).toBe(65);
    expect(result.wind.speed).toBe(12.0);
    expect(result.wind.direction).toBe(180);
    expect(result.wind.unit).toBe("km_h-1");
    expect(result.barometricPressure).toBe(1015.2);
    expect(result.visibility).toBe(16000);
    expect(result.textDescription).toBe("Fair");
    expect(result.precipitationLastHour.value).toBe(0);
    expect(result.precipitationLastHour.unit).toBe("mm");
  });
  
  test('handles missing observation properties', () => {
    const observationData = {
      properties: {
        station: "KDCA",
        timestamp: "2023-01-01T12:00:00Z",
        textDescription: "Fair",
        relativeHumidity: null
      }
    };
    
    const result = parseObservation(observationData);
    
    expect(result).toBeInstanceOf(Observation);
    expect(result.station).toBe("KDCA");
    expect(result.timestamp).toEqual(new Date("2023-01-01T12:00:00Z"));
    expect(result.temperature).toBeNull();
    expect(result.dewpoint).toBeNull();
    expect(result.relativeHumidity).toBeNull();
    expect(result.wind).toBeNull();
    expect(result.barometricPressure).toBeNull();
    expect(result.visibility).toBeNull();
    expect(result.textDescription).toBe("Fair");
    expect(result.precipitationLastHour).toBeNull();
  });
});

describe('parseAlert', () => {
  test('parses alert data correctly', () => {
    const alertData = {
      properties: {
        id: "NWS-IDP-PROD-123456",
        event: "Flood Warning",
        headline: "Flood Warning for County A",
        description: "A flood warning is in effect...",
        instruction: "Move to higher ground",
        severity: "Severe",
        certainty: "Observed",
        urgency: "Immediate",
        sent: "2023-01-01T10:00:00Z",
        effective: "2023-01-01T10:00:00Z",
        onset: "2023-01-01T12:00:00Z",
        expires: "2023-01-01T18:00:00Z",
        ends: "2023-01-01T18:00:00Z",
        status: "Actual",
        messageType: "Alert",
        category: "Met",
        response: "Shelter",
        affectedZones: [
          "https://api.weather.gov/zones/forecast/ABC123",
          "https://api.weather.gov/zones/forecast/DEF456"
        ],
        geocode: {
          SAME: ["12345", "67890"]
        }
      }
    };
    
    const result = parseAlert(alertData);
    
    expect(result).toBeInstanceOf(Alert);
    expect(result.id).toBe("NWS-IDP-PROD-123456");
    expect(result.event).toBe("Flood Warning");
    expect(result.headline).toBe("Flood Warning for County A");
    expect(result.description).toBe("A flood warning is in effect...");
    expect(result.instruction).toBe("Move to higher ground");
    expect(result.severity).toBe("Severe");
    expect(result.certainty).toBe("Observed");
    expect(result.urgency).toBe("Immediate");
    expect(result.sent).toEqual(new Date("2023-01-01T10:00:00Z"));
    expect(result.effective).toEqual(new Date("2023-01-01T10:00:00Z"));
    expect(result.onset).toEqual(new Date("2023-01-01T12:00:00Z"));
    expect(result.expires).toEqual(new Date("2023-01-01T18:00:00Z"));
    expect(result.ends).toEqual(new Date("2023-01-01T18:00:00Z"));
    expect(result.status).toBe("Actual");
    expect(result.messageType).toBe("Alert");
    expect(result.category).toBe("Met");
    expect(result.responseType).toBe("Shelter");
    expect(result.affectedZones).toEqual(["ABC123", "DEF456"]);
    expect(result.affectedCounties).toEqual(["12345", "67890"]);
  });
  
  test('handles missing alert properties', () => {
    const alertData = {
      properties: {
        id: "NWS-IDP-PROD-123456",
        event: "Flood Warning",
        headline: "Flood Warning for County A",
        description: "A flood warning is in effect...",
        severity: "Severe",
        certainty: "Observed",
        urgency: "Immediate",
        sent: "2023-01-01T10:00:00Z",
        effective: "2023-01-01T10:00:00Z",
        expires: "2023-01-01T18:00:00Z",
        status: "Actual",
        messageType: "Alert",
        category: "Met",
        affectedZones: [],
        geocode: {}
      }
    };
    
    const result = parseAlert(alertData);
    
    expect(result).toBeInstanceOf(Alert);
    expect(result.id).toBe("NWS-IDP-PROD-123456");
    expect(result.instruction).toBeUndefined();
    expect(result.onset).toBeNull();
    expect(result.ends).toBeNull();
    expect(result.affectedZones).toEqual([]);
    expect(result.affectedCounties).toEqual([]);
  });
});

describe('getCoordinatesFromAddress', () => {
  test('returns null for any address (placeholder implementation)', () => {
    const result = getCoordinatesFromAddress("1600 Pennsylvania Ave, Washington, DC");
    expect(result).toBeNull();
  });
});

describe('Temperature conversion utilities', () => {
  test('converts Celsius to Fahrenheit correctly', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
  
  test('converts Fahrenheit to Celsius correctly', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });
});

describe('Distance conversion utilities', () => {
  test('converts meters to miles correctly', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
    expect(metersToMiles(0)).toBe(0);
    expect(metersToMiles(16093.44)).toBeCloseTo(10, 5);
  });
  
  test('converts miles to meters correctly', () => {
    expect(milesToMeters(1)).toBeCloseTo(1609.344, 3);
    expect(milesToMeters(0)).toBe(0);
    expect(milesToMeters(10)).toBeCloseTo(16093.44, 2);
  });
});

describe('Speed conversion utilities', () => {
  test('converts kph to mph correctly', () => {
    expect(kphToMph(0)).toBe(0);
    expect(kphToMph(100)).toBeCloseTo(62.1371, 4);
    expect(kphToMph(1.609344)).toBeCloseTo(1, 5);
  });
  
  test('converts mph to kph correctly', () => {
    expect(mphToKph(0)).toBe(0);
    expect(mphToKph(100)).toBeCloseTo(160.934, 3);
    expect(mphToKph(1)).toBeCloseTo(1.60934, 5);
  });
});
