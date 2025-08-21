require 'date'

# Geographic coordinates
class Coordinates
  attr_reader :latitude, :longitude

  def initialize(latitude:, longitude:)
    @latitude = latitude
    @longitude = longitude
  end
end

# Temperature information
class Temperature
  attr_reader :value, :unit

  def initialize(value:, unit:)
    @value = value
    @unit = unit
  end

  # Convert temperature to Celsius
  def celsius
    if unit.downcase == "f"
      (value - 32) * 5.0/9.0
    else
      value
    end
  end

  # Convert temperature to Fahrenheit
  def fahrenheit
    if unit.downcase == "c"
      (value * 9.0/5.0) + 32
    else
      value
    end
  end
end

# Wind information
class Wind
  attr_reader :speed, :direction, :unit

  def initialize(speed:, direction:, unit:)
    @speed = speed
    @direction = direction
    @unit = unit
  end
end

# Precipitation information
class Precipitation
  attr_reader :value, :type, :unit

  def initialize(value:, type: nil, unit:)
    @value = value
    @type = type
    @unit = unit
  end
end

# Weather condition information
class WeatherCondition
  attr_reader :description, :icon

  def initialize(description:, icon: nil)
    @description = description
    @icon = icon
  end
end

# A period in a forecast
class ForecastPeriod
  attr_reader :name, :start_time, :end_time, :temperature, :wind, 
              :short_forecast, :detailed_forecast, :icon, :precipitation_probability

  def initialize(name:, start_time:, end_time:, temperature:, wind:, 
                 short_forecast:, detailed_forecast:, icon: nil, precipitation_probability: nil)
    @name = name
    @start_time = start_time
    @end_time = end_time
    @temperature = temperature
    @wind = wind
    @short_forecast = short_forecast
    @detailed_forecast = detailed_forecast
    @icon = icon
    @precipitation_probability = precipitation_probability
  end
end

# Weather forecast information
class Forecast
  attr_reader :updated, :periods

  def initialize(updated:, periods:)
    @updated = updated
    @periods = periods
  end

  # Get today's forecast
  def today
    periods.first if periods && !periods.empty?
  end

  # Get tonight's forecast
  def tonight
    periods.find { |period| period.name.downcase.include?("night") } if periods
  end
end

# Weather observation information
class Observation
  attr_reader :station, :timestamp, :temperature, :dewpoint, :relative_humidity,
              :wind, :barometric_pressure, :visibility, :text_description, 
              :precipitation_last_hour

  def initialize(station:, timestamp:, temperature: nil, dewpoint: nil, 
                 relative_humidity: nil, wind: nil, barometric_pressure: nil,
                 visibility: nil, text_description: nil, precipitation_last_hour: nil)
    @station = station
    @timestamp = timestamp
    @temperature = temperature
    @dewpoint = dewpoint
    @relative_humidity = relative_humidity
    @wind = wind
    @barometric_pressure = barometric_pressure
    @visibility = visibility
    @text_description = text_description
    @precipitation_last_hour = precipitation_last_hour
  end
end

# Weather alert information
class Alert
  attr_reader :id, :event, :headline, :description, :instruction, :severity,
              :certainty, :urgency, :sent, :effective, :onset, :expires, :ends,
              :status, :message_type, :category, :response_type, :affected_zones,
              :affected_counties

  def initialize(id:, event:, headline:, description:, severity:, certainty:, urgency:,
                 sent:, effective:, expires:, status:, message_type:, category:,
                 response_type:, affected_zones:, affected_counties:, instruction: nil,
                 onset: nil, ends: nil)
    @id = id
    @event = event
    @headline = headline
    @description = description
    @instruction = instruction
    @severity = severity
    @certainty = certainty
    @urgency = urgency
    @sent = sent
    @effective = effective
    @onset = onset
    @expires = expires
    @ends = ends
    @status = status
    @message_type = message_type
    @category = category
    @response_type = response_type
    @affected_zones = affected_zones
    @affected_counties = affected_counties
  end
end