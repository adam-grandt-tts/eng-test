require 'json'
require 'time'
require 'logger'
require 'net/http'
require 'uri'
require_relative 'weather_models'

# Configure logging
logger = Logger.new(STDOUT)
logger.level = Logger::INFO
logger.formatter = proc do |severity, datetime, progname, msg|
  "#{datetime} - #{severity} - #{msg}\n"
end

# Configuration for the National Weather Service API
class NWSConfig
  BASE_URL = ENV['NWS_BASE_URL'] || 'https://api.weather.gov'
  USER_EMAIL = ENV['NWS_USER_EMAIL']
  USER_AGENT = ENV['NWS_USER_AGENT'] || 'RubyNWSAPIWrapper/1.0'
  USER_AGENT_STR = "#{USER_AGENT} (#{USER_EMAIL || USER_AGENT})"
  CACHE_EXPIRY = (ENV['NWS_CACHE_EXPIRY'] || '600').to_i  # 10 minutes default
  TIMEOUT = (ENV['NWS_TIMEOUT'] || '10').to_i  # 10 seconds default
end

# Simple in-memory cache for API responses
class NWSCache
  def initialize
    @cache = {}
  end
  
  # Get a value from the cache if it exists and is not expired
  def get(key)
    if @cache.key?(key)
      data, expiry = @cache[key]
      if expiry > Time.now.to_i
        return data
      else
        # Clean up expired entry
        @cache.delete(key)
      end
    end
    nil
  end
  
  # Store a value in the cache with an expiration time
  def set(key, value, ttl)
    expiry = Time.now.to_i + ttl
    @cache[key] = [value, expiry]
  end
  
  # Clear all cache entries
  def clear
    @cache = {}
  end
  
  # Remove all expired entries from the cache
  def clean_expired
    now = Time.now.to_i
    expired_keys = @cache.select { |_, (_, exp)| exp <= now }.keys
    expired_keys.each { |key| @cache.delete(key) }
  end
end

# Base exception for NWS API errors
class NWSAPIError < StandardError; end

# Raised when a resource is not found
class NotFoundError < NWSAPIError; end

# Raised when the API rate limit is exceeded
class RateLimitError < NWSAPIError; end

# Raised when the API request times out
class TimeoutError < NWSAPIError; end

# Raised when input validation fails
class ValidationError < NWSAPIError; end

# A client for interacting with the National Weather Service (NWS) API
class NWSWeatherAPI
  attr_reader :base_url, :user_agent, :cache_expiry, :timeout, :cache
  
  # Initialize the NWS API client
  def initialize(
    user_agent: NWSConfig::USER_AGENT_STR,
    base_url: NWSConfig::BASE_URL,
    cache_expiry: NWSConfig::CACHE_EXPIRY,
    timeout: NWSConfig::TIMEOUT
  )
    @base_url = base_url
    @user_agent = user_agent || NWSConfig::USER_AGENT_STR
    @cache_expiry = cache_expiry
    @timeout = timeout
    @cache = NWSCache.new
    @logger = logger
  end
  
  # Make a request to the NWS API
  def _make_request(endpoint, params = nil)
    url = "#{@base_url}/#{endpoint.sub(/^\//, '')}"
    uri = URI(url)
    
    if params && !params.empty?
      uri.query = URI.encode_www_form(params)
    end
    
    cache_key = "#{url}:#{params ? params.to_json : '{}'}"
    
    # Check cache first
    cached_data = @cache.get(cache_key)
    if cached_data
      logger.debug("Cache hit for #{url}")
      return cached_data
    end
    
    logger.debug("Making request to #{url}")
    
    begin
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')
      http.open_timeout = @timeout
      http.read_timeout = @timeout
      
      request = Net::HTTP::Get.new(uri)
      request['User-Agent'] = @user_agent
      request['Accept'] = 'application/geo+json'
      
      response = http.request(request)
      
      case response.code.to_i
      when 200
        data = JSON.parse(response.body)
        # Cache the successful response
        @cache.set(cache_key, data, @cache_expiry)
        return data
      when 404
        raise NotFoundError, "Resource not found: #{url}"
      when 429
        raise RateLimitError, "API rate limit exceeded"
      else
        raise NWSAPIError, "API request failed with status #{response.code}: #{response.body}"
      end
      
    rescue Net::OpenTimeout, Net::ReadTimeout
      raise TimeoutError, "Request to #{url} timed out after #{@timeout} seconds"
    rescue JSON::ParserError
      raise NWSAPIError, "Invalid JSON response"
    rescue => e
      raise NWSAPIError, "Request failed: #{e.message}"
    end
  end
  
  # Get metadata about a location by coordinates
  def get_points(latitude, longitude)
    # Validate coordinates
    unless (-90..90).include?(latitude)
      raise ValidationError, "Latitude must be between -90 and 90"
    end
    
    unless (-180..180).include?(longitude)
      raise ValidationError, "Longitude must be between -180 and 180"
    end
    
    endpoint = "points/#{latitude.round(4)},#{longitude.round(4)}"
    _make_request(endpoint)
  end
  
  # Get weather forecast for a location
  def get_forecast(latitude, longitude, hourly: false)
    # First get the grid endpoint for the coordinates
    points_data = get_points(latitude, longitude)
    
    # Extract the forecast URL from the points response
    forecast_url = if hourly
                     points_data.dig("properties", "forecastHourly")
                   else
                     points_data.dig("properties", "forecast")
                   end
    
    unless forecast_url
      raise NotFoundError, "Forecast URL not found in points response"
    end
    
    # The forecast URL is a full URL, so we need to extract just the endpoint
    forecast_endpoint = forecast_url.sub(@base_url, "")
    _make_request(forecast_endpoint)
  end
  
  # Get hourly weather forecast for a location
  def get_hourly_forecast(latitude, longitude)
    get_forecast(latitude, longitude, hourly: true)
  end
  
  # Get forecast directly using grid coordinates
  def get_grid_forecast(wfo, x, y, hourly: false)
    endpoint = if hourly
                 "gridpoints/#{wfo}/#{x},#{y}/forecast/hourly"
               else
                 "gridpoints/#{wfo}/#{x},#{y}/forecast"
               end
    _make_request(endpoint)
  end
  
  # Get weather alerts
  def get_alerts(
    area: nil,
    region: nil,
    zone: nil,
    status: nil,
    message_type: nil,
    event: nil,
    active: true
  )
    params = {}
    params["area"] = area if area
    params["region"] = region if region
    params["zone"] = zone if zone
    params["status"] = status if status
    params["message_type"] = message_type if message_type
    params["event"] = event if event
    params["active"] = "true" if active
    
    _make_request("alerts", params)
  end
  
  # Get a specific weather alert by ID
  def get_alert_by_id(alert_id)
    endpoint = "alerts/#{alert_id}"
    _make_request(endpoint)
  end
  
  # Get weather stations
  def get_stations(state: nil)
    params = {}
    params["state"] = state if state
    
    _make_request("stations", params)
  end
  
  # Get observations from a specific weather station
  def get_station_observations(station_id, start: nil, end_time: nil)
    endpoint = "stations/#{station_id}/observations"
    params = {}
    
    if start
      params["start"] = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end
    
    if end_time
      params["end"] = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    end
    
    _make_request(endpoint, params)
  end
  
  # Get the latest observation from a specific weather station
  def get_latest_station_observation(station_id)
    endpoint = "stations/#{station_id}/observations/latest"
    _make_request(endpoint)
  end
  
  # Get information about a Weather Forecast Office
  def get_office(office_id)
    endpoint = "offices/#{office_id}"
    _make_request(endpoint)
  end
  
  # Get headlines for a Weather Forecast Office
  def get_office_headlines(office_id)
    endpoint = "offices/#{office_id}/headlines"
    _make_request(endpoint)
  end
  
  # Get forecast zones
  def get_zones(zone_type, area: nil)
    unless ["forecast", "county", "fire"].include?(zone_type)
      raise ValidationError, "Zone type must be one of: forecast, county, fire"
    end
    
    endpoint = "zones/#{zone_type}"
    params = {}
    params["area"] = area if area
    
    _make_request(endpoint, params)
  end
  
  # Get forecast for a specific zone
  def get_zone_forecast(zone_id)
    endpoint = "zones/forecast/#{zone_id}/forecast"
    _make_request(endpoint)
  end
  
  # Get observations for a specific zone
  def get_zone_observations(zone_id)
    endpoint = "zones/forecast/#{zone_id}/observations"
    _make_request(endpoint)
  end
  
  # Get text products
  def get_products(location: nil, start: nil, end_time: nil, limit: 50)
    endpoint = "products"
    params = {"limit" => limit}
    
    params["location"] = location if location
    
    if start
      params["start"] = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end
    
    if end_time
      params["end"] = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    end
    
    _make_request(endpoint, params)
  end
  
  # Get a specific text product
  def get_product(product_id)
    endpoint = "products/#{product_id}"
    _make_request(endpoint)
  end
  
  # Get the NWS API glossary
  def get_glossary
    _make_request("glossary")
  end
  
  # Get weather icons
  def get_icons(set_name = "forecast")
    endpoint = "icons/#{set_name}"
    _make_request(endpoint)
  end
  
  # Get a specific weather icon
  def get_icon(set_name, icon_name)
    endpoint = "icons/#{set_name}/#{icon_name}"
    _make_request(endpoint)
  end
  
  # Clear the API response cache
  def clear_cache
    @cache.clear
  end
  
  # Remove expired entries from the cache
  def clean_cache
    @cache.clean_expired
  end
  
  private
  
  def logger
    @logger ||= Logger.new(STDOUT)
  end
end

