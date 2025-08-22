// weather_models.js
class Coordinates {
  constructor(latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

class Temperature {
  constructor(value, unit) {
    this.value = value;
    this.unit = unit;
  }

  get celsius() {
    if (this.unit.toLowerCase() === "f") {
      return (this.value - 32) * 5/9;
    }
    return this.value;
  }

  get fahrenheit() {
    if (this.unit.toLowerCase() === "c") {
      return (this.value * 9/5) + 32;
    }
    return this.value;
  }
}

class Wind {
  constructor(speed, direction, unit) {
    this.speed = speed;
    this.direction = direction;
    this.unit = unit;
  }
}

class Precipitation {
  constructor(value, type, unit) {
    this.value = value;
    this.type = type;
    this.unit = unit;
  }
}

class WeatherCondition {
  constructor(description, icon = null) {
    this.description = description;
    this.icon = icon;
  }
}

class ForecastPeriod {
  constructor(name, startTime, endTime, temperature, wind, shortForecast, 
              detailedForecast, icon = null, precipitationProbability = null) {
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
    this.temperature = temperature;
    this.wind = wind;
    this.shortForecast = shortForecast;
    this.detailedForecast = detailedForecast;
    this.icon = icon;
    this.precipitationProbability = precipitationProbability;
  }
}

class Forecast {
  constructor(updated, periods) {
    this.updated = updated;
    this.periods = periods;
  }

  get today() {
    if (this.periods && this.periods.length > 0) {
      return this.periods[0];
    }
    return null;
  }

  get tonight() {
    if (this.periods) {
      return this.periods.find(period => period.name.toLowerCase().includes("night"));
    }
    return null;
  }
}

class Observation {
  constructor(station, timestamp, temperature = null, dewpoint = null, 
              relativeHumidity = null, wind = null, barometricPressure = null, 
              visibility = null, textDescription = null, precipitationLastHour = null) {
    this.station = station;
    this.timestamp = timestamp;
    this.temperature = temperature;
    this.dewpoint = dewpoint;
    this.relativeHumidity = relativeHumidity;
    this.wind = wind;
    this.barometricPressure = barometricPressure;
    this.visibility = visibility;
    this.textDescription = textDescription;
    this.precipitationLastHour = precipitationLastHour;
  }
}

class Alert {
  constructor(id, event, headline, description, instruction, severity, certainty, 
              urgency, sent, effective, onset, expires, ends, status, messageType, 
              category, responseType, affectedZones, affectedCounties) {
    this.id = id;
    this.event = event;
    this.headline = headline;
    this.description = description;
    this.instruction = instruction;
    this.severity = severity;
    this.certainty = certainty;
    this.urgency = urgency;
    this.sent = sent;
    this.effective = effective;
    this.onset = onset;
    this.expires = expires;
    this.ends = ends;
    this.status = status;
    this.messageType = messageType;
    this.category = category;
    this.responseType = responseType;
    this.affectedZones = affectedZones;
    this.affectedCounties = affectedCounties;
  }
}

module.exports = {
  Coordinates,
  Temperature,
  Wind,
  Precipitation,
  WeatherCondition,
  ForecastPeriod,
  Forecast,
  Observation,
  Alert
};
