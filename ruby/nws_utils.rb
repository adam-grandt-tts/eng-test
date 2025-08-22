require 'date'
require_relative 'weather_models'

module NWSUtils
  # Parse raw forecast data into a Forecast object
  def self.parse_forecast(forecast_data)
    properties = forecast_data["properties"] || {}
    updated_str = properties["updated"] || ""
    
    updated = updated_str.empty? ? nil : DateTime.parse(updated_str.gsub("Z", "+00:00"))
    
    periods = []
    (properties["periods"] || []).each do |period_data|
      start_time = DateTime.parse(period_data["startTime"].gsub("Z", "+00:00"))
      end_time = DateTime.parse(period_data["endTime"].gsub("Z", "+00:00"))
      
      temperature = Temperature.new(
        value: period_data["temperature"] || 0,
        unit: period_data["temperatureUnit"] || "F"
      )
      
      wind_direction = period_data["windDirection"] || ""
      wind_speed_str = period_data["windSpeed"] || "0 mph"
      wind_speed = wind_speed_str.scan(/\d+/).first.to_i
      
      wind = Wind.new(
        speed: wind_speed,
        direction: wind_direction,
        unit: "mph"
      )
      
      precip_prob = period_data.dig("probabilityOfPrecipitation", "value")
      
      period = ForecastPeriod.new(
        name: period_data["name"] || "",
        start_time: start_time,
        end_time: end_time,
        temperature: temperature,
        wind: wind,
        short_forecast: period_data["shortForecast"] || "",
        detailed_forecast: period_data["detailedForecast"] || "",
        icon: period_data["icon"],
        precipitation_probability: precip_prob
      )
      
      periods << period
    end
    
    Forecast.new(updated: updated, periods: periods)
  end

  # Parse raw observation data into an Observation object
  def self.parse_observation(observation_data)
    properties = observation_data["properties"] || {}
    
    station = properties["station"] || ""
    timestamp_str = properties["timestamp"] || ""
    timestamp = timestamp_str.empty? ? DateTime.now : DateTime.parse(timestamp_str.gsub("Z", "+00:00"))
    
    temperature = nil
    if properties.key?("temperature")
      temperature = Temperature.new(
        value: properties["temperature"]["value"] || 0,
        unit: (properties["temperature"]["unitCode"] || "wmoUnit:degC").split(":").last
      )
    end
    
    dewpoint = nil
    if properties.key?("dewpoint")
      dewpoint = Temperature.new(
        value: properties["dewpoint"]["value"] || 0,
        unit: (properties["dewpoint"]["unitCode"] || "wmoUnit:degC").split(":").last
      )
    end
    
    relative_humidity = properties.dig("relativeHumidity", "value")
    
    wind = nil
    if properties.key?("windSpeed") && properties.key?("windDirection")
      wind = Wind.new(
        speed: properties["windSpeed"]["value"] || 0,
        direction: properties["windDirection"]["value"] || 0,
        unit: (properties["windSpeed"]["unitCode"] || "wmoUnit:km_h-1").split(":").last
      )
    end
    
    barometric_pressure = properties.dig("barometricPressure", "value")
    visibility = properties.dig("visibility", "value")
    text_description = properties["textDescription"] || ""
    
    precipitation_last_hour = nil
    if properties.key?("precipitationLastHour")
      precipitation_last_hour = Precipitation.new(
        value: properties["precipitationLastHour"]["value"] || 0,
        unit: (properties["precipitationLastHour"]["unitCode"] || "wmoUnit:mm").split(":").last
      )
    end
    
    Observation.new(
      station: station,
      timestamp: timestamp,
      temperature: temperature,
      dewpoint: dewpoint,
      relative_humidity: relative_humidity,
      wind: wind,
      barometric_pressure: barometric_pressure,
      visibility: visibility,
      text_description: text_description,
      precipitation_last_hour: precipitation_last_hour
    )
  end

  # Parse raw alert data into an Alert object
  def self.parse_alert(alert_data)
    properties = alert_data["properties"] || {}
    
    # Parse timestamps
    sent = DateTime.parse(properties["sent"].gsub("Z", "+00:00"))
    effective = DateTime.parse(properties["effective"].gsub("Z", "+00:00"))
    expires = DateTime.parse(properties["expires"].gsub("Z", "+00:00"))
    
    onset_str = properties["onset"]
    onset = onset_str ? DateTime.parse(onset_str.gsub("Z", "+00:00")) : nil
    
    ends_str = properties["ends"]
    ends = ends_str ? DateTime.parse(ends_str.gsub("Z", "+00:00")) : nil
    
    # Parse affected zones
    affected_zones = []
    (properties["affectedZones"] || []).each do |zone|
      zone_id = zone.split("/").last
      affected_zones << zone_id
    end
    
    # Parse affected counties (derived from geocode)
    affected_counties = []
    (properties.dig("geocode", "SAME") || []).each do |county|
      affected_counties << county
    end
    
    Alert.new(
      id: properties["id"] || "",
      event: properties["event"] || "",
      headline: properties["headline"] || "",
      description: properties["description"] || "",
      instruction: properties["instruction"],
      severity: properties["severity"] || "",
      certainty: properties["certainty"] || "",
      urgency: properties["urgency"] || "",
      sent: sent,
      effective: effective,
      onset: onset,
      expires: expires,
      ends: ends,
      status: properties["status"] || "",
      message_type: properties["messageType"] || "",
      category: properties["category"] || "",
      response_type: properties["response"] || "",
      affected_zones: affected_zones,
      affected_counties: affected_counties
    )
  end

  # Get coordinates for an address using a geocoding service
  def self.get_coordinates_from_address(address)
    begin
      # This is a placeholder. In a real implementation, you would use a geocoding service
      # like Google Maps, Nominatim, or similar.
      nil
    rescue => e
      nil
    end
  end

  # Convert Celsius to Fahrenheit
  def self.celsius_to_fahrenheit(celsius)
    (celsius * 9.0/5.0) + 32
  end

  # Convert Fahrenheit to Celsius
  def self.fahrenheit_to_celsius(fahrenheit)
    (fahrenheit - 32) * 5.0/9.0
  end

  # Convert meters to miles
  def self.meters_to_miles(meters)
    meters / 1609.344
  end

  # Convert miles to meters
  def self.miles_to_meters(miles)
    miles * 1609.344
  end

  # Convert kilometers per hour to miles per hour
  def self.kph_to_mph(kph)
    kph * 0.621371
  end

  # Convert miles per hour to kilometers per hour
  def self.mph_to_kph(mph)
    mph * 1.60934
  end
end
