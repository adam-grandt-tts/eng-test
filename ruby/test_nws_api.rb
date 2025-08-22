require 'minitest/autorun'
require 'webmock/minitest'
require_relative 'nws_api'
require_relative 'nws_utils'

class TestNWSCache < Minitest::Test
  def setup
    @cache = NWSCache.new
  end
  
  def test_cache_set_and_get
    test_data = {"test" => "data"}
    @cache.set("test_key", test_data, 60)
    
    result = @cache.get("test_key")
    assert_equal test_data, result
  end
  
  def test_cache_expiry
    test_data = {"test" => "data"}
    # Set with very short TTL
    @cache.set("test_key", test_data, -1)
    
    result = @cache.get("test_key")
    assert_nil result
  end
  
  def test_cache_miss
    result = @cache.get("non_existent_key")
    assert_nil result
  end
  
  def test_cache_clear
    @cache.set("test_key", {"test" => "data"}, 60)
    @cache.clear
    
    result = @cache.get("test_key")
    assert_nil result
  end
  
  def test_clean_expired
    # Add expired entry
    @cache.set("expired_key", {"test" => "data"}, -1)
    # Add valid entry
    @cache.set("valid_key", {"test" => "data"}, 60)
    
    @cache.clean_expired
    
    assert_nil @cache.get("expired_key")
    refute_nil @cache.get("valid_key")
  end
end

class TestNWSWeatherAPI < Minitest::Test
  def setup
    @api = NWSWeatherAPI.new(user_agent: "TestApp/1.0 (test@example.com)")
    @mock_response_data = {
      "properties" => {
        "forecast" => "https://api.weather.gov/gridpoints/LWX/97,71/forecast",
        "forecastHourly" => "https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly"
      }
    }
  end
  
  def test_initialization
    assert_equal "TestApp/1.0 (test@example.com)", @api.user_agent
    assert_equal NWSConfig::BASE_URL, @api.base_url
    assert_instance_of NWSCache, @api.cache
  end
  
  def test_initialization_with_defaults
    api = NWSWeatherAPI.new
    assert_equal NWSConfig::USER_AGENT_STR, api.user_agent
    assert_equal NWSConfig::BASE_URL, api.base_url
  end
  
  def test_make_request_success
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_return(status: 200, body: '{"test": "data"}', headers: {'Content-Type' => 'application/json'})
    
    result = @api._make_request("test/endpoint")
    assert_equal({"test" => "data"}, result)
  end
  
  def test_make_request_404_error
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_return(status: 404, body: '{"error": "Not found"}', headers: {'Content-Type' => 'application/json'})
    
    assert_raises(NWSAPIError) do
      @api._make_request("test/endpoint")
    end
  end
  
  def test_make_request_429_error
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_return(status: 429, body: '{"error": "Too many requests"}', headers: {'Content-Type' => 'application/json'})
    
    assert_raises(NWSAPIError) do
      @api._make_request("test/endpoint")
    end
  end
  
  def test_make_request_timeout
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_timeout
    
    assert_raises(TimeoutError) do
      @api._make_request("test/endpoint")
    end
  end
  
  def test_make_request_generic_error
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_return(status: 500, body: 'Internal Server Error', headers: {'Content-Type' => 'text/plain'})
    
    assert_raises(NWSAPIError) do
      @api._make_request("test/endpoint")
    end
  end
  
  def test_make_request_json_decode_error
    stub_request(:get, "#{NWSConfig::BASE_URL}/test/endpoint")
      .to_return(status: 200, body: 'Not valid JSON', headers: {'Content-Type' => 'application/json'})
    
    assert_raises(NWSAPIError) do
      @api._make_request("test/endpoint")
    end
  end
end
