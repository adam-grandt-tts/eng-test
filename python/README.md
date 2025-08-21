# OpenWeatherMap Coding Tests 

## Description 

You will find a a library that wraps the [National Wether Service API](https://weather-gov.github.io/api/general-faqs). 

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

- NWS_BASE_URL:
  - Base URL for all API calls.
  - Default: https://api.weather.gov
- NWS_USER_EMAIL:
  - The requesters email address 
  - Required 
- NWS_USER_AGENT:
  - Unique User agent
  - Default: PythonNWSAPIWrapper/1.0
- NWS_CACHE_EXPIRY:
  - Cache life span oin seconds
  - Default 600 # 10 minutes 

## Testing
 - Tests are in `test_nws.py' and 'test_weather_models'
 - To execute them run:

```base
python3 -m pytest
```


## Usage Example
```python
import os
import json
from datetime import datetime, timedelta

from nws_api import NWSWeatherAPI
from nws_utils import parse_forecast, parse_observation, parse_alert

    api = NWSWeatherAPI(user_agent="MyWeatherApp/1.0 (your@email.com)")
    
    # Washington, DC coordinates
    lat, lon = 38.8951, -77.0364
    
    # Get forecast data
    forecast_data = api.get_forecast(lat, lon)
    assert forecast_data["properties"]["elevation"]["value"] ==  6.096
    
    # Parse the forecast data
    forecast = parse_forecast(forecast_data)
    
    # Print forecast information
    print(f"Forecast updated: {forecast.updated}")
    print(f"Today: {forecast.today.name} - {forecast.today.short_forecast}")    

```