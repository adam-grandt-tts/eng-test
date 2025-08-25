// nws_api.js
import axios from 'axios';
import axiosRetry from 'axios-retry';


// Configure logging
import winston from 'winston';
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} - ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class NWSConfig {
  static BASE_URL = process.env.NWS_BASE_URL || "https://api.weather.gov";
  static USER_EMAIL = process.env.NWS_USER_EMAIL;
  static USER_AGENT = process.env.NWS_USER_AGENT || "NodeNWSAPIWrapper/1.0";
  static USER_AGENT_STR = `${this.USER_AGENT} (${this.USER_AGENT})`;
  static CACHE_EXPIRY = parseInt(process.env.NWS_CACHE_EXPIRY || "600"); // 10 minutes default
  static TIMEOUT = parseInt(process.env.NWS_TIMEOUT || "10000"); // 10 seconds default
}

class NWSCache {
  constructor() {
    this._cache = {};
  }

  /**
   * Get a value from the cache if it exists and is not expired.
   * @param {string} key - Cache key
   * @returns {Object|null} Cached value or null if not found/expired
   */
  get(key) {
    if (key in this._cache) {
      const [data, expiry] = this._cache[key];
      if (expiry > Date.now()) {
        return data;
      } else {
        // Clean up expired entry
        delete this._cache[key];
      }
    }
    return null;
  }

  /**
   * Store a value in the cache with an expiration time.
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl) {
    const expiry = Date.now() + (ttl * 1000);
    this._cache[key] = [value, expiry];
  }

  /**
   * Clear all cache entries.
   */
  clear() {
    this._cache = {};
  }

  /**
   * Remove all expired entries from the cache.
   */
  cleanExpired() {
    const now = Date.now();
    Object.keys(this._cache).forEach(key => {
      const [_, expiry] = this._cache[key];
      if (expiry <= now) {
        delete this._cache[key];
      }
    });
  }
}

class NWSAPIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NWSAPIError';
  }
}

class NotFoundError extends NWSAPIError {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends NWSAPIError {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class TimeoutError extends NWSAPIError {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class ValidationError extends NWSAPIError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NWSWeatherAPI {
  /**
   * Initialize the NWS API client.
   * @param {string} userAgent - User agent string for API requests
   * @param {string} baseUrl - Base URL for the NWS API
   * @param {number} cacheExpiry - Default cache TTL in seconds
   * @param {number} timeout - Request timeout in milliseconds
   */
  constructor(
    userAgent = NWSConfig.USER_AGENT_STR,
    baseUrl = NWSConfig.BASE_URL,
    cacheExpiry = NWSConfig.CACHE_EXPIRY,
    timeout = NWSConfig.TIMEOUT
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent || NWSConfig.USER_AGENT;
    this.cacheExpiry = cacheExpiry;
    this.timeout = timeout;
    this.cache = new NWSCache();
    
    // Set up axios client with retry logic
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/geo+json'
      }
    });
    
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               (error.response && [429, 500, 502, 503, 504].includes(error.response.status));
      }
    });
  }

  /**
   * Make a request to the NWS API.
   * @param {string} endpoint - API endpoint to request
   * @param {Object} params - Query parameters for the request
   * @returns {Promise<Object>} JSON response from the API
   * @throws {NotFoundError} If the resource is not found
   * @throws {RateLimitError} If the API rate limit is exceeded
   * @throws {TimeoutError} If the request times out
   * @throws {NWSAPIError} For other API errors
   */
  async _makeRequest(endpoint, params = {}) {
    const url = `/${endpoint.replace(/^\//, '')}`;
    const cacheKey = `${url}:${JSON.stringify(params || {})}`;
    
    // Check cache first
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${url}`);
      return cachedData;
    }
    
    logger.debug(`Making request to ${url}`);
    try {
      const response = await this.client.get(url, { params });
      
      // Cache the successful response
      this.cache.set(cacheKey, response.data, this.cacheExpiry);
      return response.data;
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 404) {
          throw new NotFoundError(`Resource not found: ${url}`);
        } else if (error.response.status === 429) {
          throw new RateLimitError("API rate limit exceeded");
        } else {
          throw new NWSAPIError(`API request failed with status ${error.response.status}: ${error.response.data}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new TimeoutError(`Request to ${url} timed out after ${this.timeout / 1000} seconds`);
      } else {
        throw new NWSAPIError(`Request failed: ${error.message}`);
      }
    }
  }

  /**
   * Get metadata about a location by coordinates.
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} Metadata about the location
   * @throws {ValidationError} If coordinates are invalid
   */
  async getPoints(latitude, longitude) {
    // Validate coordinates
    if (!(latitude >= -90 && latitude <= 90)) {
      throw new ValidationError("Latitude must be between -90 and 90");
    }
    if (!(longitude >= -180 && longitude <= 180)) {
      throw new ValidationError("Longitude must be between -180 and 180");
    }
    
    const endpoint = `points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get weather forecast for a location.
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {boolean} hourly - Whether to get hourly forecast
   * @returns {Promise<Object>} Weather forecast data
   */
  async getForecast(latitude, longitude, hourly = false) {
    // First get the grid endpoint for the coordinates
    const pointsData = await this.getPoints(latitude, longitude);
    
    // Extract the forecast URL from the points response
    let forecastUrl;
    if (hourly) {
      forecastUrl = pointsData?.properties?.forecastHourly;
    } else {
      forecastUrl = pointsData?.properties?.forecast;
    }
    
    if (!forecastUrl) {
      throw new NotFoundError("Forecast URL not found in points response");
    }
    
    // The forecast URL is a full URL, so we need to extract just the endpoint
    const forecastEndpoint = forecastUrl.replace(this.baseUrl, "");
    return this._makeRequest(forecastEndpoint);
  }

  /**
   * Get hourly weather forecast for a location.
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<Object>} Hourly weather forecast data
   */
  async getHourlyForecast(latitude, longitude) {
    return this.getForecast(latitude, longitude, true);
  }

  /**
   * Get forecast directly using grid coordinates.
   * @param {string} wfo - Weather Forecast Office identifier
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {boolean} hourly - Whether to get hourly forecast
   * @returns {Promise<Object>} Weather forecast data
   */
  async getGridForecast(wfo, x, y, hourly = false) {
    const endpoint = `gridpoints/${wfo}/${x},${y}/${hourly ? 'forecast/hourly' : 'forecast'}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get weather alerts.
   * @param {string} area - State/territory code or marine area code
   * @param {string} region - Region code
   * @param {string} zone - Zone ID
   * @param {string} status - Alert status (actual, exercise, system, test, draft)
   * @param {string} messageType - Message type (alert, update, cancel)
   * @param {string} event - Event name (e.g., "Tornado Warning")
   * @param {boolean} active - Whether to only include active alerts
   * @returns {Promise<Object>} Weather alerts data
   */
  async getAlerts(
    area = null,
    region = null,
    zone = null,
    status = null,
    messageType = null,
    event = null,
    active = true
  ) {
    const params = {};
    if (area) params.area = area;
    if (region) params.region = region;
    if (zone) params.zone = zone;
    if (status) params.status = status;
    if (messageType) params.message_type = messageType;
    if (event) params.event = event;
    if (active) params.active = "true";
    
    return this._makeRequest("alerts", params);
  }

  /**
   * Get a specific weather alert by ID.
   * @param {string} alertId - The alert ID
   * @returns {Promise<Object>} Weather alert data
   */
  async getAlertById(alertId) {
    const endpoint = `alerts/${alertId}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get weather stations.
   * @param {string} state - State code to filter stations
   * @returns {Promise<Object>} Weather stations data
   */
  async getStations(state = null) {
    const params = {};
    if (state) params.state = state;
    
    return this._makeRequest("stations", params);
  }

  /**
   * Get observations from a specific weather station.
   * @param {string} stationId - Station identifier
   * @param {Date} start - Start time for observations
   * @param {Date} end - End time for observations
   * @returns {Promise<Object>} Weather observations data
   */
  async getStationObservations(stationId, start = null, end = null) {
    const endpoint = `stations/${stationId}/observations`;
    const params = {};
    
    if (start) {
      params.start = start.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    if (end) {
      params.end = end.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    
    return this._makeRequest(endpoint, params);
  }

  /**
   * Get the latest observation from a specific weather station.
   * @param {string} stationId - Station identifier
   * @returns {Promise<Object>} Latest weather observation data
   */
  async getLatestStationObservation(stationId) {
    const endpoint = `stations/${stationId}/observations/latest`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get information about a Weather Forecast Office.
   * @param {string} officeId - Office identifier
   * @returns {Promise<Object>} Weather office data
   */
  async getOffice(officeId) {
    const endpoint = `offices/${officeId}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get headlines for a Weather Forecast Office.
   * @param {string} officeId - Office identifier
   * @returns {Promise<Object>} Weather office headlines
   */
  async getOfficeHeadlines(officeId) {
    const endpoint = `offices/${officeId}/headlines`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get forecast zones.
   * @param {string} zoneType - Zone type (forecast, county, fire)
   * @param {string} area - State/territory code
   * @returns {Promise<Object>} Zone data
   */
  async getZones(zoneType, area = null) {
    if (!["forecast", "county", "fire"].includes(zoneType)) {
      throw new ValidationError("Zone type must be one of: forecast, county, fire");
    }
    
    const endpoint = `zones/${zoneType}`;
    const params = {};
    if (area) params.area = area;
    
    return this._makeRequest(endpoint, params);
  }

  /**
   * Get forecast for a specific zone.
   * @param {string} zoneId - Zone identifier
   * @returns {Promise<Object>} Zone forecast data
   */
  async getZoneForecast(zoneId) {
    const endpoint = `zones/forecast/${zoneId}/forecast`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get observations for a specific zone.
   * @param {string} zoneId - Zone identifier
   * @returns {Promise<Object>} Zone observations data
   */
  async getZoneObservations(zoneId) {
    const endpoint = `zones/forecast/${zoneId}/observations`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get text products.
   * @param {string} location - WFO issuing the product
   * @param {Date} start - Start time for products
   * @param {Date} end - End time for products
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Object>} Text products data
   */
  async getProducts(location = null, start = null, end = null, limit = 50) {
    const endpoint = "products";
    const params = { limit };
    
    if (location) params.location = location;
    if (start) {
      params.start = start.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    if (end) {
      params.end = end.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    
    return this._makeRequest(endpoint, params);
  }

  /**
   * Get a specific text product.
   * @param {string} productId - Product identifier
   * @returns {Promise<Object>} Text product data
   */
  async getProduct(productId) {
    const endpoint = `products/${productId}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get the NWS API glossary.
   * @returns {Promise<Object>} Glossary data
   */
  async getGlossary() {
    return this._makeRequest("glossary");
  }

  /**
   * Get weather icons.
   * @param {string} setName - Icon set name
   * @returns {Promise<Object>} Icons data
   */
  async getIcons(setName = "forecast") {
    const endpoint = `icons/${setName}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Get a specific weather icon.
   * @param {string} setName - Icon set name
   * @param {string} iconName - Icon name
   * @returns {Promise<Object>} Icon data
   */
  async getIcon(setName, iconName) {
    const endpoint = `icons/${setName}/${iconName}`;
    return this._makeRequest(endpoint);
  }

  /**
   * Clear the API response cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Remove expired entries from the cache.
   */
  cleanCache() {
    this.cache.cleanExpired();
  }
}

