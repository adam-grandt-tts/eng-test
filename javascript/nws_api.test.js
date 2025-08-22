// nws_api.test.js
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const {
  NWSWeatherAPI,
  NWSCache,
  NWSConfig,
  NWSAPIError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ValidationError
} = require('./nws_api');

// Mock axios for testing
jest.mock('axios');

describe('NWSCache', () => {
  let cache;
  
  beforeEach(() => {
    cache = new NWSCache();
    // Mock Date.now to control time
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('set and get cache values', () => {
    const testData = { test: "data" };
    cache.set("test_key", testData, 60);
    
    const result = cache.get("test_key");
    expect(result).toEqual(testData);
  });
  
  test('cache expiry works', () => {
    const testData = { test: "data" };
    // Set with very short TTL
    cache.set("test_key", testData, -1);
    
    const result = cache.get("test_key");
    expect(result).toBeNull();
  });
  
  test('cache miss for non-existent key', () => {
    const result = cache.get("non_existent_key");
    expect(result).toBeNull();
  });
  
  test('clear cache removes all entries', () => {
    cache.set("test_key", { test: "data" }, 60);
    cache.clear();
    
    const result = cache.get("test_key");
    expect(result).toBeNull();
  });
  
  test('clean expired entries', () => {
    // Add expired entry
    cache.set("expired_key", { test: "data" }, -1);
    // Add valid entry
    cache.set("valid_key", { test: "data" }, 60);
    
    cache.cleanExpired();
    
    expect(cache.get("expired_key")).toBeNull();
    expect(cache.get("valid_key")).not.toBeNull();
  });
});

describe('NWSWeatherAPI', () => {
  let api;
  let mock;
  
  beforeEach(() => {
    api = new NWSWeatherAPI("TestApp/1.0 (test@example.com)");
    mock = new MockAdapter(api.client);
    
    // Spy on cache methods
    jest.spyOn(api.cache, 'get');
    jest.spyOn(api.cache, 'set');
  });
  
  afterEach(() => {
    mock.restore();
    jest.restoreAllMocks();
  });
  
  test('initialization with custom values', () => {
    const customApi = new NWSWeatherAPI(
      "CustomApp/1.0",
      "https://custom-api.example.com",
      300,
      5000
    );
    
    expect(customApi.userAgent).toBe("CustomApp/1.0");
    expect(customApi.baseUrl).toBe("https://custom-api.example.com");
    expect(customApi.cacheExpiry).toBe(300);
    expect(customApi.timeout).toBe(5000);
  });
  
  test('initialization with defaults', () => {
    const defaultApi = new NWSWeatherAPI();
    
    expect(defaultApi.userAgent).toBe(NWSConfig.USER_AGENT_STR);
    expect(defaultApi.baseUrl).toBe(NWSConfig.BASE_URL);
  });
  
  test('_makeRequest success', async () => {
    const mockData = { test: "data" };
    mock.onGet('/test/endpoint').reply(200, mockData);
    
    const result = await api._makeRequest("test/endpoint");
    
    expect(result).toEqual(mockData);
    expect(api.cache.set).toHaveBeenCalled();
  });
  
  test('_makeRequest uses cache when available', async () => {
    const mockData = { test: "data" };
    // Setup cache to return data
    api.cache.get.mockReturnValueOnce(mockData);
    
    const result = await api._makeRequest("test/endpoint");
    
    expect(result).toEqual(mockData);
    // Should not make actual request
    expect(mock.history.get.length).toBe(0);
  });
  
  test('_makeRequest handles 404 error', async () => {
    mock.onGet('/test/endpoint').reply(404);
    
    await expect(api._makeRequest("test/endpoint")).rejects.toThrow(NotFoundError);
  });
  
  test('_makeRequest handles 429 error', async () => {
    mock.onGet('/test/endpoint').reply(429);
    
    await expect(api._makeRequest("test/endpoint")).rejects.toThrow(RateLimitError);
  });
  
  test('_makeRequest handles timeout', async () => {
    mock.onGet('/test/endpoint').timeout();
    
    await expect(api._makeRequest("test/endpoint")).rejects.toThrow(TimeoutError);
  });
  
  test('_makeRequest handles generic error', async () => {
    mock.onGet('/test/endpoint').reply(500, "Internal Server Error");
    
    await expect(api._makeRequest("test/endpoint")).rejects.toThrow(NWSAPIError);
  });
  
  test('getPoints with valid coordinates', async () => {
    const mockData = {
      properties: {
        forecast: "https://api.weather.gov/gridpoints/LWX/97,71/forecast",
        forecastHourly: "https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly"
      }
    };
    
    mock.onGet('/points/38.8951,-77.0364').reply(200, mockData);
    
    const result = await api.getPoints(38.8951, -77.0364);
    
    expect(result).toEqual(mockData);
  });
  
  test('getPoints with invalid latitude', async () => {
    await expect(api.getPoints(91, -77.0364)).rejects.toThrow(ValidationError);
    await expect(api.getPoints(-91, -77.0364)).rejects.toThrow(ValidationError);
  });
  
  test('getPoints with invalid longitude', async () => {
    await expect(api.getPoints(38.8951, 181)).rejects.toThrow(ValidationError);
    await expect(api.getPoints(38.8951, -181)).rejects.toThrow(ValidationError);
  });
  
  test('getForecast', async () => {
    // Mock the points response
    const pointsData = {
      properties: {
        forecast: "https://api.weather.gov/gridpoints/LWX/97,71/forecast"
      }
    };
    
    // Mock the forecast response
    const forecastData = {
      properties: {
        updated: "2023-01-01T12:00:00Z",
        periods: []
      }
    };
    
    // Setup mocks
    mock.onGet('/points/38.8951,-77.0364').reply(200, pointsData);
    mock.onGet('/gridpoints/LWX/97,71/forecast').reply(200, forecastData);
    
    const result = await api.getForecast(38.8951, -77.0364);
    
    expect(result).toEqual(forecastData);
  });
  
  test('getHourlyForecast', async () => {
    // Mock the points response
    const pointsData = {
      properties: {
        forecastHourly: "https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly"
      }
    };
    
    // Mock the forecast response
    const forecastData = {
      properties: {
        updated: "2023-01-01T12:00:00Z",
        periods: []
      }
    };
    
    // Setup mocks
    mock.onGet('/points/38.8951,-77.0364').reply(200, pointsData);
    mock.onGet('/gridpoints/LWX/97,71/forecast/hourly').reply(200, forecastData);
    
    const result = await api.getHourlyForecast(38.8951, -77.0364);
    
    expect(result).toEqual(forecastData);
  });
});
