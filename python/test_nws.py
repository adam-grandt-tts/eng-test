import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import requests
from requests.exceptions import Timeout, RequestException

from nws_api import (
    NWSWeatherAPI, NWSCache, NWSConfig, 
    NWSAPIError, NotFoundError, RateLimitError, 
    TimeoutError, ValidationError
)
from nws_utils import parse_forecast, parse_observation, parse_alert
from weather_models import Forecast

class TestNWSCache:
    """Test cases for the NWSCache class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.cache = NWSCache()
    
    def test_cache_set_and_get(self):
        """Test setting and getting cache values."""
        test_data = {"test": "data"}
        self.cache.set("test_key", test_data, 60)
        
        result = self.cache.get("test_key")
        assert result == test_data
    
    def test_cache_expiry(self):
        """Test cache expiry functionality."""
        test_data = {"test": "data"}
        # Set with very short TTL
        self.cache.set("test_key", test_data, -1)
        
        result = self.cache.get("test_key")
        assert result is None
    
    def test_cache_miss(self):
        """Test cache miss for non-existent key."""
        result = self.cache.get("non_existent_key")
        assert result is None
    
    def test_cache_clear(self):
        """Test clearing the cache."""
        self.cache.set("test_key", {"test": "data"}, 60)
        self.cache.clear()
        
        result = self.cache.get("test_key")
        assert result is None
    
    def test_clean_expired(self):
        """Test cleaning expired entries."""
        # Add expired entry
        self.cache.set("expired_key", {"test": "data"}, -1)
        # Add valid entry
        self.cache.set("valid_key", {"test": "data"}, 60)
        
        self.cache.clean_expired()
        
        assert self.cache.get("expired_key") is None
        assert self.cache.get("valid_key") is not None

class TestNWSWeatherAPI:
    """Test cases for the NWSWeatherAPI class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.api = NWSWeatherAPI(user_agent="TestApp/1.0 (test@example.com)")
        self.mock_response_data = {
            "properties": {
                "forecast": "https://api.weather.gov/gridpoints/LWX/97,71/forecast",
                "forecastHourly": "https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly"
            }
        }
    
    def test_initialization(self):
        """Test API client initialization."""
        assert self.api.user_agent == "TestApp/1.0 (test@example.com)"
        assert self.api.base_url == NWSConfig.BASE_URL
        assert isinstance(self.api.cache, NWSCache)
    
    def test_initialization_with_defaults(self):
        """Test API client initialization with default values."""
        api = NWSWeatherAPI()
        assert api.user_agent == NWSConfig.USER_AGENT_STR
        assert api.base_url == NWSConfig.BASE_URL
    
    @patch('requests.Session.get')
    def test_make_request_success(self, mock_get):
        """Test successful API request."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"test": "data"}
        mock_get.return_value = mock_response
        
        result = self.api._make_request("test/endpoint")
        
        assert result == {"test": "data"}
        mock_get.assert_called_once()
    
    @patch('requests.Session.get')
    def test_make_request_404_error(self, mock_get):
        """Test API request with 404 error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        with pytest.raises(NotFoundError):
            self.api._make_request("test/endpoint")
    
    @patch('requests.Session.get')
    def test_make_request_429_error(self, mock_get):
        """Test API request with rate limit error."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response
        
        with pytest.raises(RateLimitError):
            self.api._make_request("test/endpoint")
    
    @patch('requests.Session.get')
    def test_make_request_timeout(self, mock_get):
        """Test API request timeout."""
        mock_get.side_effect = Timeout()
        
        with pytest.raises(TimeoutError):
            self.api._make_request("test/endpoint")
    
    @patch('requests.Session.get')
    def test_make_request_generic_error(self, mock_get):
        """Test API request with generic error."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_get.return_value = mock_response
        
        with pytest.raises(NWSAPIError):
            self.api._make_request("test/endpoint")
    
    @patch('requests.Session.get')
    def test_make_request_json_decode_error(self, mock_get):
        """Test API request with JSON decode error."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_get.return_value = mock_response
        
        with pytest.raises(NWSAPIError):
            self.api._make_request("test/endpoint")
    
    @patch('requests.Session.get')
    def test_cache_functionality(self, mock_get):
        """Test that caching works correctly."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"test": "data"}
        mock_get.return_value = mock_response
        
        # First request should hit the API
        result1 = self.api._make_request("test/endpoint")
        
        # Second request should use cache
        result2 = self.api._make_request("test/endpoint")
        
        assert result1 == result2
        # Should only be called once due to caching
        mock_get.assert_called_once()
    
    def test_get_points_valid_coordinates(self):
        """Test get_points with valid coordinates."""
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = self.mock_response_data
            
            result = self.api.get_points(38.8951, -77.0364)
            
            assert result == self.mock_response_data
            mock_request.assert_called_once_with("points/38.8951,-77.0364")
    
    def test_get_points_invalid_latitude(self):
        """Test get_points with invalid latitude."""
        with pytest.raises(ValidationError):
            self.api.get_points(91.0, -77.0364)
        
        with pytest.raises(ValidationError):
            self.api.get_points(-91.0, -77.0364)
    
    def test_get_points_invalid_longitude(self):
        """Test get_points with invalid longitude."""
        with pytest.raises(ValidationError):
            self.api.get_points(38.8951, 181.0)
        
        with pytest.raises(ValidationError):
            self.api.get_points(38.8951, -181.0)
    
    def test_get_forecast(self):
        """Test get_forecast method."""
        forecast_data = {
            "properties": {
                "updated": "2023-01-01T12:00:00Z",
                "periods": []
            }
        }
        
        with patch.object(self.api, 'get_points') as mock_points:
            with patch.object(self.api, '_make_request') as mock_request:
                mock_points.return_value = self.mock_response_data
                mock_request.return_value = forecast_data
                
                result = self.api.get_forecast(38.8951, -77.0364)
                
                assert result == forecast_data
                mock_points.assert_called_once_with(38.8951, -77.0364)
    
    def test_get_hourly_forecast(self):
        """Test get_hourly_forecast method."""
        forecast_data = {
            "properties": {
                "updated": "2023-01-01T12:00:00Z",
                "periods": []
            }
        }
        
        with patch.object(self.api, 'get_points') as mock_points:
            with patch.object(self.api, '_make_request') as mock_request:
                mock_points.return_value = self.mock_response_data
                mock_request.return_value = forecast_data
                
                result = self.api.get_hourly_forecast(38.8951, -77.0364)
                
                assert result == forecast_data
                mock_points.assert_called_once_with(38.8951, -77.0364)
    
    def test_get_grid_forecast(self):
        """Test get_grid_forecast method."""
        forecast_data = {"properties": {"periods": []}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = forecast_data
            
            result = self.api.get_grid_forecast("LWX", 97, 71)
            
            assert result == forecast_data
            mock_request.assert_called_once_with("gridpoints/LWX/97,71/forecast")
    
    def test_get_grid_forecast_hourly(self):
        """Test get_grid_forecast with hourly parameter."""
        forecast_data = {"properties": {"periods": []}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = forecast_data
            
            result = self.api.get_grid_forecast("LWX", 97, 71, hourly=True)
            
            assert result == forecast_data
            mock_request.assert_called_once_with("gridpoints/LWX/97,71/forecast/hourly")
    
    def test_get_alerts_no_params(self):
        """Test get_alerts with no parameters."""
        alerts_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = alerts_data
            
            result = self.api.get_alerts()
            
            assert result == alerts_data
            mock_request.assert_called_once_with("alerts", {"active": "true"})
    
    def test_get_alerts_with_params(self):
        """Test get_alerts with parameters."""
        alerts_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = alerts_data
            
            result = self.api.get_alerts(
                area="DC",
                status="actual",
                event="Tornado Warning"
            )
            
            expected_params = {
                "area": "DC",
                "status": "actual",
                "event": "Tornado Warning",
                "active": "true"
            }
            
            assert result == alerts_data
            mock_request.assert_called_once_with("alerts", expected_params)
    
    def test_get_alert_by_id(self):
        """Test get_alert_by_id method."""
        alert_data = {"properties": {"id": "test-alert-id"}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = alert_data
            
            result = self.api.get_alert_by_id("test-alert-id")
            
            assert result == alert_data
            mock_request.assert_called_once_with("alerts/test-alert-id")
    
    def test_get_stations(self):
        """Test get_stations method."""
        stations_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = stations_data
            
            result = self.api.get_stations()
            
            assert result == stations_data
            mock_request.assert_called_once_with("stations", {})
    
    def test_get_stations_with_state(self):
        """Test get_stations with state parameter."""
        stations_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = stations_data
            
            result = self.api.get_stations(state="DC")
            
            assert result == stations_data
            mock_request.assert_called_once_with("stations", {"state": "DC"})
    
    def test_get_station_observations(self):
        """Test get_station_observations method."""
        observations_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = observations_data
            
            result = self.api.get_station_observations("KDCA")
            
            assert result == observations_data
            mock_request.assert_called_once_with("stations/KDCA/observations", {})
    
    def test_get_station_observations_with_dates(self):
        """Test get_station_observations with date parameters."""
        observations_data = {"features": []}
        start_date = datetime(2023, 1, 1, 12, 0, 0)
        end_date = datetime(2023, 1, 2, 12, 0, 0)
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = observations_data
            
            result = self.api.get_station_observations("KDCA", start=start_date, end=end_date)
            
            expected_params = {
                "start": "2023-01-01T12:00:00Z",
                "end": "2023-01-02T12:00:00Z"
            }
            
            assert result == observations_data
            mock_request.assert_called_once_with("stations/KDCA/observations", expected_params)
    
    def test_get_latest_station_observation(self):
        """Test get_latest_station_observation method."""
        observation_data = {"properties": {"timestamp": "2023-01-01T12:00:00Z"}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = observation_data
            
            result = self.api.get_latest_station_observation("KDCA")
            
            assert result == observation_data
            mock_request.assert_called_once_with("stations/KDCA/observations/latest")
    
    def test_get_office(self):
        """Test get_office method."""
        office_data = {"properties": {"id": "LWX"}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = office_data
            
            result = self.api.get_office("LWX")
            
            assert result == office_data
            mock_request.assert_called_once_with("offices/LWX")
    
    def test_get_office_headlines(self):
        """Test get_office_headlines method."""
        headlines_data = {"@graph": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = headlines_data
            
            result = self.api.get_office_headlines("LWX")
            
            assert result == headlines_data
            mock_request.assert_called_once_with("offices/LWX/headlines")
    
    def test_get_zones_valid_type(self):
        """Test get_zones with valid zone type."""
        zones_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = zones_data
            
            result = self.api.get_zones("forecast")
            
            assert result == zones_data
            mock_request.assert_called_once_with("zones/forecast", {})
    
    def test_get_zones_invalid_type(self):
        """Test get_zones with invalid zone type."""
        with pytest.raises(ValidationError):
            self.api.get_zones("invalid_type")
    
    def test_get_zones_with_area(self):
        """Test get_zones with area parameter."""
        zones_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = zones_data
            
            result = self.api.get_zones("forecast", area="DC")
            
            assert result == zones_data
            mock_request.assert_called_once_with("zones/forecast", {"area": "DC"})
    
    def test_get_zone_forecast(self):
        """Test get_zone_forecast method."""
        forecast_data = {"properties": {"periods": []}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = forecast_data
            
            result = self.api.get_zone_forecast("DCZ001")
            
            assert result == forecast_data
            mock_request.assert_called_once_with("zones/forecast/DCZ001/forecast")
    
    def test_get_zone_observations(self):
        """Test get_zone_observations method."""
        observations_data = {"features": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = observations_data
            
            result = self.api.get_zone_observations("DCZ001")
            
            assert result == observations_data
            mock_request.assert_called_once_with("zones/forecast/DCZ001/observations")
    
    def test_get_products(self):
        """Test get_products method."""
        products_data = {"@graph": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = products_data
            
            result = self.api.get_products()
            
            assert result == products_data
            mock_request.assert_called_once_with("products", {"limit": 50})
    
    def test_get_products_with_params(self):
        """Test get_products with parameters."""
        products_data = {"@graph": []}
        start_date = datetime(2023, 1, 1, 12, 0, 0)
        end_date = datetime(2023, 1, 2, 12, 0, 0)
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = products_data
            
            result = self.api.get_products(
                location="LWX",
                start=start_date,
                end=end_date,
                limit=25
            )
            
            expected_params = {
                "location": "LWX",
                "start": "2023-01-01T12:00:00Z",
                "end": "2023-01-02T12:00:00Z",
                "limit": 25
            }
            
            assert result == products_data
            mock_request.assert_called_once_with("products", expected_params)
    
    def test_get_product(self):
        """Test get_product method."""
        product_data = {"properties": {"id": "test-product-id"}}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = product_data
            
            result = self.api.get_product("test-product-id")
            
            assert result == product_data
            mock_request.assert_called_once_with("products/test-product-id")
    
    def test_get_glossary(self):
        """Test get_glossary method."""
        glossary_data = {"glossary": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = glossary_data
            
            result = self.api.get_glossary()
            
            assert result == glossary_data
            mock_request.assert_called_once_with("glossary")
    
    def test_get_icons(self):
        """Test get_icons method."""
        icons_data = {"icons": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = icons_data
            
            result = self.api.get_icons()
            
            assert result == icons_data
            mock_request.assert_called_once_with("icons/forecast")
    
    def test_get_icons_custom_set(self):
        """Test get_icons with custom set name."""
        icons_data = {"icons": []}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = icons_data
            
            result = self.api.get_icons("land")
            
            assert result == icons_data
            mock_request.assert_called_once_with("icons/land")
    
    def test_get_icon(self):
        """Test get_icon method."""
        icon_data = {"icon": "data"}
        
        with patch.object(self.api, '_make_request') as mock_request:
            mock_request.return_value = icon_data
            
            result = self.api.get_icon("forecast", "sunny")
            
            assert result == icon_data
            mock_request.assert_called_once_with("icons/forecast/sunny")
    
    def test_clear_cache(self):
        """Test clear_cache method."""
        # Add something to cache first
        self.api.cache.set("test_key", {"test": "data"}, 60)
        
        # Clear cache
        self.api.clear_cache()
        
        # Verify cache is empty
        result = self.api.cache.get("test_key")
        assert result is None
    
    def test_clean_cache(self):
        """Test clean_cache method."""
        # Add expired entry
        self.api.cache.set("expired_key", {"test": "data"}, -1)
        # Add valid entry
        self.api.cache.set("valid_key", {"test": "data"}, 60)
        
        # Clean cache
        self.api.clean_cache()
        
        # Verify expired entry is removed and valid entry remains
        assert self.api.cache.get("expired_key") is None
        assert self.api.cache.get("valid_key") is not None


    def test_end_to_end(self):
        api = NWSWeatherAPI(user_agent="MyWeatherApp/1.0 (your@email.com)")
        
        
        # Washington, DC coordinates
        lat, lon = 38.8951, -77.0364
        
        # Get forecast data
        forecast_data = api.get_forecast(lat, lon)
        assert forecast_data["properties"]["elevation"]["value"] ==  6.096
        
        # Parse the forecast data
        forecast = parse_forecast(forecast_data)
        assert isinstance(forecast, Forecast)

        
        # # Print forecast information
        # print(f"Forecast updated: {forecast.updated}")
        # print(f"Today: {forecast.today.name} - {forecast.today.short_forecast}")    
