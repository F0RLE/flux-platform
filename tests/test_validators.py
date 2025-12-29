"""
Tests for validation utilities.
Compatible with Python 3.10 - 3.14
"""
import pytest
import re
from typing import Any
from pathlib import Path


# ============================================================================
# Validation Functions (self-contained for testing)
# ============================================================================

def validate_bot_token(token: str | None) -> bool:
    """Validate Telegram bot token format"""
    if not token:
        return False
    # Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz (variable length after colon)
    pattern = r'^\d{8,10}:[A-Za-z0-9_-]{30,50}$'
    return bool(re.match(pattern, token))


def validate_channel_id(channel_id: Any) -> bool:
    """Validate Telegram channel ID"""
    try:
        channel_id = int(channel_id)
        return channel_id != 0
    except (ValueError, TypeError):
        return False


def validate_channel_name(name: str) -> bool:
    """Validate Telegram channel name (username)"""
    if not name:
        return False
    # Remove @ prefix if present
    name = name.lstrip("@")
    # Telegram usernames: 5-32 characters, alphanumeric + underscore
    return 5 <= len(name) <= 32 and re.match(r'^[a-zA-Z0-9_]+$', name) is not None


def validate_url(url: str) -> bool:
    """Validate URL format"""
    if not url:
        return False
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def validate_temperature(temp: float) -> bool:
    """Validate LLM temperature (0.0 - 2.0)"""
    try:
        return 0.0 <= float(temp) <= 2.0
    except (ValueError, TypeError):
        return False


def validate_positive_int(value: Any, min_val: int = 1, max_val: int = None) -> bool:
    """Validate positive integer within range"""
    try:
        val = int(value)
        if val < min_val:
            return False
        if max_val is not None and val > max_val:
            return False
        return True
    except (ValueError, TypeError):
        return False


def validate_image_dimensions(width: int, height: int) -> bool:
    """Validate image dimensions for Stable Diffusion"""
    # Must be multiples of 8, reasonable size range
    if width % 8 != 0 or height % 8 != 0:
        return False
    if width < 64 or width > 2048:
        return False
    if height < 64 or height > 2048:
        return False
    return True


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Sanitize text by removing control characters and limiting length"""
    if not text:
        return ""
    # Remove control characters except newlines and tabs
    sanitized = ''.join(c if c.isprintable() or c in '\n\t\r' else '' for c in text)
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    return sanitized


def validate_config(config: Any, required_keys: list[str]) -> bool:
    """Validate configuration dictionary has required keys"""
    if not isinstance(config, dict):
        return False
    return all(key in config for key in required_keys)


# ============================================================================
# Test Classes
# ============================================================================

class TestBotTokenValidation:
    """Tests for bot token validation"""
    
    def test_valid_token(self):
        """Test valid bot token"""
        token = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz12345"
        assert validate_bot_token(token) is True
    
    def test_invalid_token_short(self):
        """Test invalid token - too short"""
        token = "123:ABC"
        assert validate_bot_token(token) is False
    
    def test_invalid_token_wrong_format(self):
        """Test invalid token - wrong format"""
        token = "not-a-token"
        assert validate_bot_token(token) is False
    
    def test_empty_token(self):
        """Test empty token"""
        assert validate_bot_token("") is False
        assert validate_bot_token(None) is False


class TestChannelValidation:
    """Tests for channel validation"""
    
    def test_valid_channel_id(self):
        """Test valid channel ID"""
        assert validate_channel_id(-1001234567890) is True
        assert validate_channel_id(123456789) is True
    
    def test_invalid_channel_id_zero(self):
        """Test invalid channel ID - zero"""
        assert validate_channel_id(0) is False
    
    def test_invalid_channel_id_string(self):
        """Test invalid channel ID - non-numeric string"""
        assert validate_channel_id("not-a-number") is False
    
    def test_valid_channel_name(self):
        """Test valid channel name"""
        assert validate_channel_name("testchannel") is True
        assert validate_channel_name("@testchannel") is True
        assert validate_channel_name("test_channel_123") is True
    
    def test_invalid_channel_name_too_short(self):
        """Test invalid channel name - too short"""
        assert validate_channel_name("test") is False
    
    def test_invalid_channel_name_too_long(self):
        """Test invalid channel name - too long"""
        assert validate_channel_name("a" * 33) is False


class TestURLValidation:
    """Tests for URL validation"""
    
    def test_valid_urls(self):
        """Test valid URLs"""
        assert validate_url("https://t.me/test") is True
        assert validate_url("http://example.com") is True
        assert validate_url("https://api.telegram.org/bot123/sendMessage") is True
    
    def test_invalid_urls(self):
        """Test invalid URLs"""
        assert validate_url("not-a-url") is False
        assert validate_url("") is False
        assert validate_url("ftp://invalid.com") is False


class TestTemperatureValidation:
    """Tests for LLM temperature validation"""
    
    def test_valid_temperature(self):
        """Test valid temperature values"""
        assert validate_temperature(0.0) is True
        assert validate_temperature(0.7) is True
        assert validate_temperature(1.0) is True
        assert validate_temperature(2.0) is True
    
    def test_invalid_temperature_too_high(self):
        """Test invalid temperature - too high"""
        assert validate_temperature(3.0) is False
        assert validate_temperature(10.0) is False
    
    def test_invalid_temperature_negative(self):
        """Test invalid temperature - negative"""
        assert validate_temperature(-0.1) is False
        assert validate_temperature(-1.0) is False


class TestImageDimensionsValidation:
    """Tests for image dimensions validation"""
    
    def test_valid_dimensions(self):
        """Test valid dimensions"""
        assert validate_image_dimensions(512, 512) is True
        assert validate_image_dimensions(896, 1152) is True
        assert validate_image_dimensions(1024, 768) is True
    
    def test_invalid_dimensions_not_multiple_of_8(self):
        """Test invalid dimensions - not multiple of 8"""
        assert validate_image_dimensions(900, 1152) is False
        assert validate_image_dimensions(515, 512) is False
    
    def test_invalid_dimensions_too_small(self):
        """Test invalid dimensions - too small"""
        assert validate_image_dimensions(32, 32) is False
        assert validate_image_dimensions(48, 48) is False
    
    def test_invalid_dimensions_too_large(self):
        """Test invalid dimensions - too large"""
        assert validate_image_dimensions(3000, 3000) is False
        assert validate_image_dimensions(4096, 4096) is False


class TestTextSanitization:
    """Tests for text sanitization"""
    
    def test_sanitize_normal_text(self):
        """Test sanitization of normal text"""
        text = "Normal text here"
        assert sanitize_text(text) == text
    
    def test_sanitize_control_characters(self):
        """Test sanitization removes control characters"""
        text = "Text\x00with\x01control\x02chars"
        result = sanitize_text(text)
        assert "\x00" not in result
        assert "\x01" not in result
        assert "\x02" not in result
    
    def test_sanitize_preserves_newlines(self):
        """Test sanitization preserves newlines"""
        text = "Line 1\nLine 2\nLine 3"
        result = sanitize_text(text)
        assert "\n" in result
        assert result.count("\n") == 2
    
    def test_sanitize_truncates_long_text(self):
        """Test sanitization truncates very long text"""
        text = "a" * 20000
        result = sanitize_text(text, max_length=10000)
        assert len(result) == 10000
    
    def test_sanitize_empty_text(self):
        """Test sanitization of empty text"""
        assert sanitize_text("") == ""
        assert sanitize_text(None) == ""


class TestConfigValidation:
    """Tests for configuration validation"""
    
    def test_valid_config(self):
        """Test valid configuration"""
        config = {"key1": "value1", "key2": "value2"}
        assert validate_config(config, ["key1", "key2"]) is True
    
    def test_valid_config_with_extra_keys(self):
        """Test valid config with extra keys"""
        config = {"key1": "value1", "key2": "value2", "extra": "ok"}
        assert validate_config(config, ["key1", "key2"]) is True
    
    def test_invalid_config_missing_key(self):
        """Test invalid configuration - missing key"""
        config = {"key1": "value1"}
        assert validate_config(config, ["key1", "key2"]) is False
    
    def test_invalid_config_not_dict(self):
        """Test invalid configuration - not a dictionary"""
        assert validate_config("not-a-dict", ["key1"]) is False
        assert validate_config(None, ["key1"]) is False
        assert validate_config([], ["key1"]) is False


class TestPositiveIntValidation:
    """Tests for positive integer validation"""
    
    def test_valid_positive_int(self):
        """Test valid positive integers"""
        assert validate_positive_int(1) is True
        assert validate_positive_int(100) is True
        assert validate_positive_int("42") is True
    
    def test_invalid_zero(self):
        """Test zero is invalid by default"""
        assert validate_positive_int(0) is False
    
    def test_with_min_max(self):
        """Test with min/max constraints"""
        assert validate_positive_int(5, min_val=1, max_val=10) is True
        assert validate_positive_int(15, min_val=1, max_val=10) is False
        assert validate_positive_int(0, min_val=1, max_val=10) is False
    
    def test_invalid_string(self):
        """Test non-numeric string is invalid"""
        assert validate_positive_int("abc") is False
        assert validate_positive_int(None) is False


class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""
    
    def test_unicode_text_sanitization(self):
        """Test sanitization with Unicode characters"""
        text = "Привет мир 🚀 こんにちは"
        result = sanitize_text(text)
        assert "Привет" in result
        assert "🚀" in result
        assert "こんにちは" in result
    
    def test_channel_name_with_special_chars(self):
        """Test channel name with underscore"""
        assert validate_channel_name("test_channel_name") is True
        assert validate_channel_name("_test_") is True
    
    def test_url_with_query_params(self):
        """Test URL with query parameters"""
        assert validate_url("https://example.com/path?param=value") is True
        assert validate_url("https://api.example.com/v1/data?key=123&limit=10") is True
    
    def test_temperature_edge_values(self):
        """Test temperature at exact boundaries"""
        assert validate_temperature(0.0) is True
        assert validate_temperature(2.0) is True
        assert validate_temperature(0.001) is True
        assert validate_temperature(1.999) is True
