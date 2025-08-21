# OpenWeatherMap Coding Tests 

## Description 

You will find a a library that wraps the [openweathermap.org](https://api.openweathermap.org) API . 

Your task is:

1. Expend the library to allow for collection of weekly weather forecast.
1. Update the library documentation and testing. 
   1. Add tests to cover your changes.
   1. Add tests for rate limiting functionality.
   1. Add tests for edge cases like empty responses or malformed data
1. Implement a web UI that allows the user to input a city and displays current weather and weekly forecast.
   1. You can use any framework you prefer, if any.
   1. Ensure that you follow [accessability guidelines](https://www.section508.gov/). 
   1. Your application should be responsive, light weight, work on low resolution displays, and follow [USWDS](https://designsystem.digital.gov/)
   1. Include automated testing to validate functionality.
1. Improve caching to allow for higher loads, consider using [Redis](https://redis.io/) or [memcached](https://memcached.org/).
1. Present an architecture that would allow your solution to serve more the 100,000 calls a minute. Include a clear explanation as to why you believe your architecture should work.


## OpenWeatherMap API Wrapper Documentation

### Class: OpenWeatherMapAPI

A client for interacting with the OpenWeatherMap API. Provides methods to retrieve weather data using various search criteria.


#### Environment Variables  

Set these from environment variable or in your .env file.

- OPENWEATHERMAP_API_KEY:
  - The API access key.
  - Required. 
  - Obtain from [openweathermap.org](https://api.openweathermap.org).
- OPENWEATHERMAP_API_URL: 
  - Base URL for all API calls.
  - Defaul: https://api.openweathermap.org/data/2.5.
- OPENWEATHERMAP_API_UNITS:
  - Which units should weather be used.
  - Defaul: metric. 
  - Optiona: `metric` or `imperial`
- OPENWEATHERMAP_API_CACHE_EXPIRY: 
  - Cache TTL in seconds.
  - Default: 600. 


#### Constructor

```python 
OpenWeatherMapAPI(api_key=None, base_url=config.BASE_URL, units=config.DEFAULT_UNITS)
```

Initialize the OpenWeatherMap API client.


**Parameters:**
- `api_key` (str, optional): API key for authentication. Defaults to config.API_KEY.
- `base_url` (str, optional): Base URL for API requests. Defaults to config.BASE_URL.
- `units` (str, optional): Unit system for weather data. Defaults to config.DEFAULT_UNITS.


**Raises:**
-  `ValueError`: If no API key is provided.


#### Methods

>**get_weather_by_city_name(city_name)**


Gets the current weather for a city by name.


**Parameters:**
- `city_name` (str): Name of the city to get weather for.


**Returns:**
 -  `models.Weather`: Weather data for the specified city.


**Raises:**
-  `exceptions.APIError`: If the API request fails.


>**get_weather_by_city_id(city_id)**


Gets the current weather for a city by ID.


**Parameters:**
 - `city_id` (int): OpenWeatherMap city ID.


**Returns:**
 -  `models.Weather`: Weather data for the specified city.


**Raises:**
 - `exceptions.APIError`: If the API request fails.


>**get_weather_by_coordinates(lat, lon)**


Gets the current weather for a given latitude and longitude.


**Parameters:**
- `lat` (float): Latitude coordinate.
- `lon` (float): Longitude coordinate.


**Returns:**
- `models.Weather`: Weather data for the specified coordinates.


**Raises:**
- `exceptions.APIError`: If the API request fails.


>**find_cities_by_name(city_name, max_results=10)**


Finds cities matching a name (can return multiple results). Uses a generator to yield results one by one.


**Parameters:**
- `city_name` (str): Name of the city to search for.
- `max_results` (int, optional): Maximum number of results to return. Defaults to 10.


**Yields:**
- `models.Weather`: Weather data for each matching city.


**Raises:**
- `exceptions.CityNotFoundError`: If no cities are found.
- `exceptions.APIError`: If the API request fails.


>**get_weather_in_bulk(city_ids)**


Gets the weather for multiple cities by their IDs. Demonstrates using a generator for efficient processing.


**Parameters:**
-  `city_ids` (list[int]): List of OpenWeatherMap city IDs.


**Yields:**
- `models.Weather`: Weather data for each city ID.


**Notes:**
- Errors for individual cities are logged but don't stop the generator.
- The OpenWeatherMap API has a limit on how many city IDs you can request at once.

## Usage Example
```python
# Initialize the API client
api = OpenWeatherMapAPI(api_key="your_api_key_here")

# Get weather by city name
weather = api.get_weather_by_city_name("London")
print(f"Temperature in London: {weather.temperature}°C")

# Get weather by coordinates
weather = api.get_weather_by_coordinates(lat=51.5074, lon=0.1278)
print(f"Weather conditions: {weather.description}")

# Find multiple cities with similar names
for city_weather in api.find_cities_by_name("San", max_results=5):
    print(f"{city_weather.city_name}: {city_weather.temperature}°C")

# Get weather for multiple cities by ID
city_ids = [2643743, 5128581, 1850147]  # London, New York, Tokyo
for weather in api.get_weather_in_bulk(city_ids):
    print(f"{weather.city_name}: {weather.temperature}°C")
```


## Testing
 - All the tests are in `test_openweathermap.py'
 - To execute them run:

```base
python3 -m unittests ./test_openweathermap.py
```