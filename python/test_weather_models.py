import pytest
from datetime import datetime

from weather_models import (
    Coordinates, Temperature, Wind, Precipitation,
    WeatherCondition, ForecastPeriod, Forecast, 
    Observation, Alert
)

class TestTemperature:
    """Test cases for the Temperature class."""
    
    def test_temperature_celsius_conversion(self):
        """Test temperature conversion to Celsius."""
        # Test Fahrenheit to Celsius
        temp_f = Temperature(value=32.0, unit="F")
        assert temp_f.celsius == 0.0
        
        temp_f2 = Temperature(value=68.0, unit="F")
        assert abs(temp_f2.celsius - 20.0) < 0.01
        
        # Test Celsius (no conversion)
        temp_c = Temperature(value=25.0, unit="C")
        assert temp_c.celsius == 25.0
    
    def test_temperature_fahrenheit_conversion(self):
        """Test temperature conversion to Fahrenheit."""
        # Test Celsius to Fahrenheit
        temp_c = Temperature(value=0.0, unit="C")
        assert temp_c.fahrenheit == 32.0
        
        temp_c2 = Temperature(value=20.0, unit="C")
        assert temp_c2.fahrenheit == 68.0
        
        # Test Fahrenheit (no conversion)
        temp_f = Temperature(value=75.0, unit="F")
        assert temp_f.fahrenheit == 75.0

class TestForecast:
    """Test cases for the Forecast class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.start_time = datetime(2023, 1, 1, 12, 0, 0)
        self.end_time = datetime(2023, 1, 1, 18, 0, 0)
        
        self.today_period = ForecastPeriod(
            name="Today",
            start_time=self.start_time,
            end_time=self.end_time,
            temperature=Temperature(value=75.0, unit="F"),
            wind=Wind(speed=10.0, direction=180.0, unit="mph"),
            short_forecast="Sunny",
            detailed_forecast="Sunny skies with light winds"
        )
        
        self.tonight_period = ForecastPeriod(
            name="Tonight",
            start_time=datetime(2023, 1, 1, 18, 0, 0),
            end_time=datetime(2023, 1, 2, 6, 0, 0),
            temperature=Temperature(value=55.0, unit="F"),
            wind=Wind(speed=5.0, direction=180.0, unit="mph"),
            short_forecast="Clear",
            detailed_forecast="Clear skies overnight"
        )
        
        self.forecast = Forecast(
            updated=datetime(2023, 1, 1, 10, 0, 0),
            periods=[self.today_period, self.tonight_period]
        )
    
    def test_forecast_today_property(self):
        """Test the today property of Forecast."""
        today = self.forecast.today
        assert today is not None
        assert today.name == "Today"
        assert today == self.today_period
    
    def test_forecast_tonight_property(self):
        """Test the tonight property of Forecast."""
        tonight = self.forecast.tonight
        assert tonight is not None
        assert tonight.name == "Tonight"
        assert tonight == self.tonight_period
    
    def test_forecast_empty_periods(self):
        """Test forecast with empty periods."""
        empty_forecast = Forecast(
            updated=datetime(2023, 1, 1, 10, 0, 0),
            periods=[]
        )
        
        assert empty_forecast.today is None
        assert empty_forecast.tonight is None
    
    def test_forecast_no_tonight_period(self):
        """Test forecast without a tonight period."""
        forecast_no_tonight = Forecast(
            updated=datetime(2023, 1, 1, 10, 0, 0),
            periods=[self.today_period]
        )
        
        assert forecast_no_tonight.today is not None
        assert forecast_no_tonight.tonight is None

class TestCoordinates:
    """Test cases for the Coordinates class."""
    
    def test_coordinates_creation(self):
        """Test creating Coordinates object."""
        coords = Coordinates(latitude=38.8951, longitude=-77.0364)
        assert coords.latitude == 38.8951
        assert coords.longitude == -77.0364

class TestWind:
    """Test cases for the Wind class."""
    
    def test_wind_creation(self):
        """Test creating Wind object."""
        wind = Wind(speed=15.0, direction=180.0, unit="mph")
        assert wind.speed == 15.0
        assert wind.direction == 180.0
        assert wind.unit == "mph"

class TestPrecipitation:
    """Test cases for the Precipitation class."""
    
    def test_precipitation_creation(self):
        """Test creating Precipitation object."""
        precip = Precipitation(value=0.5, type="rain", unit="in")
        assert precip.value == 0.5
        assert precip.type == "rain"
        assert precip.unit == "in"

class TestWeatherCondition:
    """Test cases for the WeatherCondition class."""
    
    def test_weather_condition_creation(self):
        """Test creating WeatherCondition object."""
        condition = WeatherCondition(description="Partly Cloudy", icon="partly-cloudy")
        assert condition.description == "Partly Cloudy"
        assert condition.icon == "partly-cloudy"
    
    def test_weather_condition_no_icon(self):
        """Test creating WeatherCondition without icon."""
        condition = WeatherCondition(description="Sunny")
        assert condition.description == "Sunny"
        assert condition.icon is None

class TestForecastPeriod:
    """Test cases for the ForecastPeriod class."""
    
    def test_forecast_period_creation(self):
        """Test creating ForecastPeriod object."""
        start_time = datetime(2023, 1, 1, 12, 0, 0)
        end_time = datetime(2023, 1, 1, 18, 0, 0)
        temperature = Temperature(value=75.0, unit="F")
        wind = Wind(speed=10.0, direction=180.0, unit="mph")
        
        period = ForecastPeriod(
            name="This Afternoon",
            start_time=start_time,
            end_time=end_time,
            temperature=temperature,
            wind=wind,
            short_forecast="Sunny",
            detailed_forecast="Sunny skies with light winds",
            icon="sunny",
            precipitation_probability=10
        )
        
        assert period.name == "This Afternoon"
        assert period.start_time == start_time
        assert period.end_time == end_time
        assert period.temperature == temperature
        assert period.wind == wind
        assert period.short_forecast == "Sunny"
        assert period.detailed_forecast == "Sunny skies with light winds"
        assert period.icon == "sunny"
        assert period.precipitation_probability == 10

class TestObservation:
    """Test cases for the Observation class."""
    
    def test_observation_creation(self):
        """Test creating Observation object."""
        timestamp = datetime(2023, 1, 1, 12, 0, 0)
        temperature = Temperature(value=72.0, unit="F")
        wind = Wind(speed=8.0, direction=180.0, unit="mph")
        
        observation = Observation(
            station="KDCA",
            timestamp=timestamp,
            temperature=temperature,
            wind=wind,
            relative_humidity=65.0,
            barometric_pressure=30.15,
            visibility=10.0,
            text_description="Fair"
        )
        
        assert observation.station == "KDCA"
        assert observation.timestamp == timestamp
        assert observation.temperature == temperature
        assert observation.wind == wind
        assert observation.relative_humidity == 65.0
        assert observation.barometric_pressure == 30.15
        assert observation.visibility == 10.0
        assert observation.text_description == "Fair"

