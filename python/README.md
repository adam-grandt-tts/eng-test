# OpenWeatherMap Coding Tests 

This library that wraps the [National Wether Service API](https://weather-gov.github.io/api/general-faqs). 

## Class: NWSWeatherAPI 

A client for interacting with the National Wether Service API. 

  ## Environment Variables  

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

```bash
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