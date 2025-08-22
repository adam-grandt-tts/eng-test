# National Weather Service (NWS) API Ruby Client Documentation

This documentation covers a Ruby client for interacting with the National Weather Service (NWS) API. The codebase consists of three main files:

1. `weather_models.rb` - Core data models
2. `nws_utils.rb` - Utility functions for parsing API responses
3. `nws_api.rb` - The main API client


**Table of Contents**
 - [Weather Models](#weather-models)
 - [NWS Utilities](#nws-utilities)
 - [NWS API Client](#nws-api-client)
 - [Usage Examples](#usage-examples)
 - [Error Handling](#error-handling)
 - [Configuration](#configuration)


## Weather Models

The `weather_models.rb` file defines the core data structures used throughout the application:


**Coordinates**

Represents geographic coordinates with latitude and longitude.


```ruby
coordinates = Coordinates.new(latitude: 37.7749, longitude: -122.4194)
```


**Temperature**

Handles temperature values with unit conversion capabilities.

```ruby
temp = Temperature.new(value: 72, unit: "F")
temp.celsius  # Converts to Celsius
temp.fahrenheit  # Returns original value or converts from Celsius
```

**Wind**

Stores wind speed, direction, and unit information.

```ruby
wind = Wind.new(speed: 10, direction: "NW", unit: "mph")
```

**Precipitation**

Represents precipitation data with value, type, and unit.

```ruby
precip = Precipitation.new(value: 0.5, type: "rain", unit: "in")
```

**WeatherCondition**

Describes weather conditions with text description and optional icon.

```ruby
condition = WeatherCondition.new(description: "Partly Cloudy", icon: "partly-cloudy")
```

**ForecastPeriod**

Represents a specific time period in a forecast with detailed weather information.

```ruby
period = ForecastPeriod.new(
  name: "Tonight",
  start_time: DateTime.now,
  end_time: DateTime.now + 1,
  temperature: temp,
  wind: wind,
  short_forecast: "Partly Cloudy",
  detailed_forecast: "Partly cloudy with a low around 55°F.",
  precipitation_probability: 20
)
```

**Forecast**

Contains a collection of forecast periods with helper methods.

```ruby
forecast = Forecast.new(updated: DateTime.now, periods: [period1, period2])
forecast.today  # Returns the first period
forecast.tonight  # Returns the first period with "night" in the name
```

**Observation**

Represents current weather observations from a weather station.

```ruby
observation = Observation.new(
  station: "KSFO",
  timestamp: DateTime.now,
  temperature: temp,
  wind: wind,
  text_description: "Partly Cloudy"
)
```

**Alert**

Contains weather alert information including severity, timing, and affected areas.

```ruby
alert = Alert.new(
  id: "NWS-IDP-PROD-123456",
  event: "Flood Warning",
  headline: "Flood Warning issued for San Francisco County",
  description: "Heavy rainfall may cause flooding...",
  severity: "Moderate",
  certainty: "Likely",
  urgency: "Expected",
  sent: DateTime.now,
  effective: DateTime.now,
  expires: DateTime.now + 1,
  status: "Actual",
  message_type: "Alert",
  category: "Met",
  response_type: "Shelter",
  affected_zones: ["CAZ505"],
  affected_counties: ["06075"]
)
```

**NWS Utilities**

The `nws_utils.rb` file provides utility functions for parsing raw API responses into the model objects:


### Parse Methods
 - `NWSUtils.parse_forecast(forecast_data)` - Converts raw forecast JSON into a `Forecast` object
 - `NWSUtils.parse_observation(observation_data)` - Converts raw observation JSON into an `Observation` object
 - `NWSUtils.parse_alert(alert_data)` - Converts raw alert JSON into an `Alert` object


### Conversion Utilities
 - `NWSUtils.celsius_to_fahrenheit(celsius)` - Converts temperature from Celsius to Fahrenheit
 - `NWSUtils.fahrenheit_to_celsius(fahrenheit)` - Converts temperature from Fahrenheit to Celsius
 - `NWSUtils.meters_to_miles(meters)` - Converts distance from meters to miles
 - `NWSUtils.miles_to_meters(miles)` - Converts distance from miles to meters
 - `NWSUtils.kph_to_mph(kph)` - Converts speed from kilometers per hour to miles per hour
 - `NWSUtils.mph_to_kph(mph)` - Converts speed from miles per hour to kilometers per hour


### Geocoding
 - `NWSUtils.get_coordinates_from_address(address)` - Placeholder for geocoding functionality


## NWS API Client

The `nws_api.rb` file implements the main API client for interacting with the National Weather Service API:


### Configuration

The `NWSConfig` class provides default configuration values that can be overridden with environment variables:

 - `BASE_URL` - The base URL for the NWS API (default: https://api.weather.gov)
 - `USER_EMAIL` - Your email address for API identification
 - `USER_AGENT` - User agent string (default: RubyNWSAPIWrapper/1.0)
 - `CACHE_EXPIRY` - Cache expiration time in seconds (default: 600)
 - `TIMEOUT` - Request timeout in seconds (default: 10)


### Caching

The `NWSCache` class provides a simple in-memory cache for API responses:

 - `get(key)` - Retrieves a cached value if not expired
 - `set(key, value, ttl)` - Stores a value with expiration time
 - `clear()` - Clears all cache entries
 - `clean_expired()` - Removes expired entries


### Error Handling

Custom exception classes for different error scenarios:

 - `NWSAPIError` - Base exception for all API errors
 - `RateLimitError` - Raised when API rate limit is exceeded
 - `TimeoutError` - Raised when a request times out
 - `ValidationError` - Raised when input validation fails


## API Methods

The `NWSWeatherAPI` class provides methods for interacting with the NWS API:


###  Core Methods
 - `get_points(latitude, longitude)` - Get metadata about a location
 - `get_forecast(latitude, longitude, hourly: false)` - Get weather forecast for a location
 - `get_hourly_forecast(latitude, longitude)` - Get hourly forecast for a location
 - `get_grid_forecast(wfo, x, y, hourly: false)` - Get forecast using grid coordinates
 - `get_alerts(...)` - Get weather alerts with various filters
 - `get_alert_by_id(alert_id)` - Get a specific weather alert


### Station Methods
 - `get_stations(state: nil)` - Get weather stations
 - `get_station_observations(station_id, start: nil, end_time: nil)` - Get observations from a station
 - `get_latest_station_observation(station_id)` - Get the latest observation from a station


### Office Methods
 - `get_office(office_id)` - Get information about a Weather Forecast Office
 - `get_office_headlines(office_id)` - Get headlines for a Weather Forecast Office


### Zone Methods
 - `get_zones(zone_type, area: nil)` - Get forecast zones
 - `get_zone_forecast(zone_id)` - Get forecast for a specific zone
 - `get_zone_observations(zone_id)` - Get observations for a specific zone


### Product Methods
 - `get_products(location: nil, start: nil, end_time: nil, limit: 50)` - Get text products
 - `get_product(product_id)` - Get a specific text product


### Miscellaneous Methods
 - `get_glossary()` - Get the NWS API glossary
 - `get_icons(set_name = "forecast")` - Get weather icons
 - `get_icon(set_name, icon_name)` - Get a specific weather icon
 - `clear_cache()` - Clear the API response cache
 - `clean_cache()` - Remove expired entries from the cache


## Usage Examples

### Basic Forecast
```ruby
require_relative 'nws_api'
require_relative 'nws_utils'

# Initialize the API client
api = NWSWeatherAPI.new(user_agent: "MyWeatherApp/1.0 (your@email.com)")

# Get forecast for San Francisco
lat = 37.7749
lng = -122.4194
forecast_data = api.get_forecast(lat, lng)

# Parse the forecast data
forecast = NWSUtils.parse_forecast(forecast_data)

# Display today's forecast
today = forecast.today
puts "Today: #{today.short_forecast}, #{today.temperature.value}°#{today.temperature.unit}"
```

### Weather Alerts

```ruby
# Get active weather alerts for California
alerts_data = api.get_alerts(area: "CA")

# Parse and display alerts
alerts_data["features"].each do |alert_feature|
  alert = NWSUtils.parse_alert(alert_feature)
  puts "#{alert.headline} (#{alert.severity})"
  puts "Expires: #{alert.expires}"
end
```

### Current Observations

```ruby
# Get the latest observation from a station
station_id = "KSFO"
observation_data = api.get_latest_station_observation(station_id)

# Parse the observation
observation = NWSUtils.parse_observation(observation_data)

# Display current conditions
temp_f = observation.temperature.fahrenheit
puts "Current conditions at #{station_id}: #{observation.text_description}"
puts "Temperature: #{temp_f.round}°F"
puts "Relative Humidity: #{observation.relative_humidity}%"
```

### Error Handling

```ruby
begin
  forecast = api.get_forecast(lat, lng)
rescue NWSAPIError => e
  puts "API Error: #{e.message}"
rescue ValidationError => e
  puts "Validation Error: #{e.message}"
rescue RateLimitError => e
  puts "Rate Limit Exceeded: #{e.message}"
rescue TimeoutError => e
  puts "Request Timeout: #{e.message}"
rescue => e
  puts "Unexpected Error: #{e.message}"
end
```

## Configuration

You can configure the client using environment variables:

```bash
export NWS_BASE_URL=https://api.weather.gov
export NWS_USER_EMAIL=your@email.com
export NWS_USER_AGENT="YourApp/1.0"
export NWS_CACHE_EXPIRY=300
export NWS_TIMEOUT=5
```

Or by passing parameters when initializing the client:

```ruby
api = NWSWeatherAPI.new(
  base_url: "https://api.weather.gov",
  user_agent: "YourApp/1.0 (your@email.com)",
  cache_expiry: 300,
  timeout: 5
)
```