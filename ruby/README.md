```ruby
require_relative 'nws_api'
require_relative 'nws_utils'

# Example usage of the NWS API wrapper
def main
  # Initialize the API client
  api = NWSWeatherAPI.new(user_agent: "MyWeatherApp/1.0 (your@email.com)")
  
  puts "Example: Get forecast for Washington, DC"
  begin
    # Washington, DC coordinates
    lat, lon = 38.8951, -77.0364
    
    # Get forecast data
    forecast_data = api.get_forecast(lat, lon)
    
    # Parse the forecast data
    forecast = NWSUtils.parse_forecast(forecast_data)
    
    # Print forecast information
    puts "Forecast updated: #{forecast.updated}"
    
    if forecast.today
      puts "Today: #{forecast.today.name} - #{forecast.today.short_forecast}"
      puts "Temperature: #{forecast.today.temperature.value}°#{forecast.today.temperature.unit}"
      puts "Wind: #{forecast.today.wind.speed} #{forecast.today.wind.unit} #{forecast.today.wind.direction}"
    end
    
    if forecast.tonight
      puts "\nTonight: #{forecast.tonight.name} - #{forecast.tonight.short_forecast}"
      puts "Temperature: #{forecast.tonight.temperature.value}°#{forecast.tonight.temperature.unit}"
    end
    
  rescue NWSAPIError => e
    puts "API Error: #{e.message}"
  rescue => e
    puts "Unexpected error: #{e.message}"
    puts e.backtrace
  end
end

# Run the example if this file is executed directly
main if __FILE__ == $PROGRAM_NAME
```