// weather_models.test.js
const {
  Coordinates,
  Temperature,
  Wind,
  Precipitation,
  WeatherCondition,
  ForecastPeriod,
  Forecast,
  Observation,
  Alert
} = require('./weather_models');

describe('Temperature', () => {
  test('converts Fahrenheit to Celsius correctly', () => {
    // Test Fahrenheit to Celsius
    const tempF = new Temperature(32.0, "F");
    expect(tempF.celsius).toBeCloseTo(0.0, 2);
    
    const tempF2 = new Temperature(68.0, "F");
    expect(tempF2.celsius).toBeCloseTo(20.0, 2);
    
    // Test Celsius (no conversion)
    const tempC = new Temperature(25.0, "C");
    expect(tempC.celsius).toBe(25.0);
  });

  test('converts Celsius to Fahrenheit correctly', () => {
    // Test Celsius to Fahrenheit
    const tempC = new Temperature(0.0, "C");
    expect(tempC.fahrenheit).toBe(32.0);
    
    const tempC2 = new Temperature(20.0, "C");
    expect(tempC2.fahrenheit).toBe(68.0);
    
    // Test Fahrenheit (no conversion)
    const tempF = new Temperature(75.0, "F");
    expect(tempF.fahrenheit).toBe(75.0);
  });
});

describe('Forecast', () => {
  let todayPeriod, tonightPeriod, forecast;
  
  beforeEach(() => {
    const startTime = new Date(2023, 0, 1, 12, 0, 0);
    const endTime = new Date(2023, 0, 1, 18, 0, 0);
    
    todayPeriod = new ForecastPeriod(
      "Today",
      startTime,
      endTime,
      new Temperature(75.0, "F"),
      new Wind(10.0, 180.0, "mph"),
      "Sunny",
      "Sunny skies with light winds"
    );
    
    tonightPeriod = new ForecastPeriod(
      "Tonight",
      new Date(2023, 0, 1, 18, 0, 0),
      new Date(2023, 0, 2, 6, 0, 0),
      new Temperature(55.0, "F"),
      new Wind(5.0, 180.0, "mph"),
      "Clear",
      "Clear skies overnight"
    );
    
    forecast = new Forecast(
      new Date(2023, 0, 1, 10, 0, 0),
      [todayPeriod, tonightPeriod]
    );
  });
  
  test('today property returns the first period', () => {
    expect(forecast.today).toBe(todayPeriod);
  });
  
  test('tonight property returns the period with "night" in the name', () => {
    expect(forecast.tonight).toBe(tonightPeriod);
  });
  
  test('today property returns null for empty periods', () => {
    const emptyForecast = new Forecast(
      new Date(2023, 0, 1, 10, 0, 0),
      []
    );
    expect(emptyForecast.today).toBeNull();
  });
  
  test('tonight property returns null when no night period exists', () => {
    const forecastNoNight = new Forecast(
      new Date(2023, 0, 1, 10, 0, 0),
      [todayPeriod]
    );
    expect(forecastNoNight.tonight).toBeNull();
  });
});

describe('Coordinates', () => {
  test('creates coordinates object correctly', () => {
    const coords = new Coordinates(38.8951, -77.0364);
    expect(coords.latitude).toBe(38.8951);
    expect(coords.longitude).toBe(-77.0364);
  });
});

describe('Wind', () => {
  test('creates wind object correctly', () => {
    const wind = new Wind(15.0, 180.0, "mph");
    expect(wind.speed).toBe(15.0);
    expect(wind.direction).toBe(180.0);
    expect(wind.unit).toBe("mph");
  });
});

describe('Precipitation', () => {
  test('creates precipitation object correctly', () => {
    const precip = new Precipitation(0.5, "rain", "in");
    expect(precip.value).toBe(0.5);
    expect(precip.type).toBe("rain");
    expect(precip.unit).toBe("in");
  });
});

describe('WeatherCondition', () => {
  test('creates weather condition object correctly', () => {
    const condition = new WeatherCondition("Partly Cloudy", "partly-cloudy");
    expect(condition.description).toBe("Partly Cloudy");
    expect(condition.icon).toBe("partly-cloudy");
  });
  
  test('creates weather condition without icon', () => {
    const condition = new WeatherCondition("Sunny");
    expect(condition.description).toBe("Sunny");
    expect(condition.icon).toBeNull();
  });
});

describe('ForecastPeriod', () => {
  test('creates forecast period object correctly', () => {
    const startTime = new Date(2023, 0, 1, 12, 0, 0);
    const endTime = new Date(2023, 0, 1, 18, 0, 0);
    const temperature = new Temperature(75.0, "F");
    const wind = new Wind(10.0, 180.0, "mph");
    
    const period = new ForecastPeriod(
      "This Afternoon",
      startTime,
      endTime,
      temperature,
      wind,
      "Sunny",
      "Sunny skies with light winds",
      "sunny",
      10
    );
    
    expect(period.name).toBe("This Afternoon");
    expect(period.startTime).toBe(startTime);
    expect(period.endTime).toBe(endTime);
    expect(period.temperature).toBe(temperature);
    expect(period.wind).toBe(wind);
    expect(period.shortForecast).toBe("Sunny");
    expect(period.detailedForecast).toBe("Sunny skies with light winds");
    expect(period.icon).toBe("sunny");
    expect(period.precipitationProbability).toBe(10);
  });
});

describe('Observation', () => {
  test('creates observation object correctly', () => {
    const timestamp = new Date(2023, 0, 1, 12, 0, 0);
    const temperature = new Temperature(72.0, "F");
    const wind = new Wind(8.0, 180.0, "mph");
    
    const observation = new Observation(
      "KDCA",
      timestamp,
      temperature,
      null,
      65.0,
      wind,
      30.15,
      10.0,
      "Fair"
    );
    
    expect(observation.station).toBe("KDCA");
    expect(observation.timestamp).toBe(timestamp);
    expect(observation.temperature).toBe(temperature);
    expect(observation.dewpoint).toBeNull();
    expect(observation.relativeHumidity).toBe(65.0);
    expect(observation.wind).toBe(wind);
    expect(observation.barometricPressure).toBe(30.15);
    expect(observation.visibility).toBe(10.0);
    expect(observation.textDescription).toBe("Fair");
  });
});

describe('Alert', () => {
  test('creates alert object correctly', () => {
    const sent = new Date(2023, 0, 1, 10, 0, 0);
    const effective = new Date(2023, 0, 1, 10, 0, 0);
    const onset = new Date(2023, 0, 1, 12, 0, 0);
    const expires = new Date(2023, 0, 1, 18, 0, 0);
    const ends = new Date(2023, 0, 1, 18, 0, 0);
    
    const alert = new Alert(
      "NWS-IDP-PROD-123456",
      "Flood Warning",
      "Flood Warning for County A",
      "A flood warning is in effect...",
      "Move to higher ground",
      "Severe",
      "Observed",
      "Immediate",
      sent,
      effective,
      onset,
      expires,
      ends,
      "Actual",
      "Alert",
      "Met",
      "Shelter",
      ["ABC123", "DEF456"],
      ["12345", "67890"]
    );
    
    expect(alert.id).toBe("NWS-IDP-PROD-123456");
    expect(alert.event).toBe("Flood Warning");
    expect(alert.headline).toBe("Flood Warning for County A");
    expect(alert.description).toBe("A flood warning is in effect...");
    expect(alert.instruction).toBe("Move to higher ground");
    expect(alert.severity).toBe("Severe");
    expect(alert.certainty).toBe("Observed");
    expect(alert.urgency).toBe("Immediate");
    expect(alert.sent).toBe(sent);
    expect(alert.effective).toBe(effective);
    expect(alert.onset).toBe(onset);
    expect(alert.expires).toBe(expires);
    expect(alert.ends).toBe(ends);
    expect(alert.status).toBe("Actual");
    expect(alert.messageType).toBe("Alert");
    expect(alert.category).toBe("Met");
    expect(alert.responseType).toBe("Shelter");
    expect(alert.affectedZones).toEqual(["ABC123", "DEF456"]);
    expect(alert.affectedCounties).toEqual(["12345", "67890"]);
  });
});
