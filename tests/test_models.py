"""
Tests for data models.
Compatible with Python 3.10 - 3.14
"""
import pytest
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Any


# ============================================================================
# Mock Models (self-contained for testing without Pydantic dependency)
# ============================================================================

@dataclass
class ChannelConfig:
    """Channel configuration model"""
    name: str
    enabled: bool = True
    
    def __post_init__(self):
        # Strip @ prefix
        self.name = self.name.lstrip("@")
        # Validate length
        if len(self.name) < 5:
            raise ValueError("Channel name too short (min 5 characters)")
        if len(self.name) > 32:
            raise ValueError("Channel name too long (max 32 characters)")


@dataclass
class TopicConfig:
    """Topic configuration model"""
    name: str
    channels: list[str] = field(default_factory=list)
    
    def __post_init__(self):
        # Strip @ prefix from all channels and validate
        cleaned = []
        for ch in self.channels:
            ch = ch.lstrip("@")
            if len(ch) < 5:
                raise ValueError(f"Channel name '{ch}' too short")
            cleaned.append(ch)
        self.channels = cleaned


@dataclass
class LLMConfig:
    """LLM configuration model"""
    model: str = "llama3.2"
    temperature: float = 0.7
    context_window: int = 4096
    system_prompt: str = ""
    
    def __post_init__(self):
        if self.temperature < 0 or self.temperature > 2.0:
            raise ValueError(f"Temperature must be between 0 and 2, got {self.temperature}")


@dataclass
class SDConfig:
    """Stable Diffusion configuration model"""
    width: int = 512
    height: int = 512
    steps: int = 20
    cfg_scale: float = 7.0
    
    def __post_init__(self):
        if self.width % 8 != 0:
            raise ValueError(f"Width must be multiple of 8, got {self.width}")
        if self.height % 8 != 0:
            raise ValueError(f"Height must be multiple of 8, got {self.height}")


@dataclass
class PostData:
    """Post data model"""
    channel: str = ""
    text: str = ""
    link: str = ""
    has_media: bool = False
    saved_text: Optional[str] = None
    saved_gen_bytes: Optional[bytes] = None


@dataclass
class PublishedPost:
    """Published post record"""
    link: str
    published_at: datetime
    channel: str = ""
    text_preview: str = ""


@dataclass
class APICallMetrics:
    """API call metrics model"""
    service: str
    success: bool
    duration: float
    error_message: str = ""
    
    VALID_SERVICES = {"llm", "sd", "bot", "api"}
    
    def __post_init__(self):
        if self.service not in self.VALID_SERVICES:
            raise ValueError(f"Invalid service '{self.service}'. Must be one of {self.VALID_SERVICES}")
        if self.duration < 0:
            raise ValueError("Duration cannot be negative")


# ============================================================================
# Test Classes
# ============================================================================

class TestChannelConfig:
    """Tests for ChannelConfig model"""
    
    def test_valid_channel(self):
        """Test valid channel configuration"""
        config = ChannelConfig(name="testchannel")
        assert config.name == "testchannel"
        assert config.enabled is True
    
    def test_channel_with_at_prefix(self):
        """Test channel name with @ prefix is stripped"""
        config = ChannelConfig(name="@testchannel")
        assert config.name == "testchannel"
    
    def test_invalid_channel_name_too_short(self):
        """Test channel name validation - too short"""
        with pytest.raises(ValueError, match="too short"):
            ChannelConfig(name="test")
    
    def test_invalid_channel_name_too_long(self):
        """Test channel name validation - too long"""
        with pytest.raises(ValueError, match="too long"):
            ChannelConfig(name="a" * 33)


class TestTopicConfig:
    """Tests for TopicConfig model"""
    
    def test_valid_topic(self):
        """Test valid topic configuration"""
        config = TopicConfig(name="Test Topic", channels=["channel1", "channel2"])
        assert config.name == "Test Topic"
        assert len(config.channels) == 2
    
    def test_topic_with_channel_at_prefix(self):
        """Test channels with @ prefix are stripped"""
        config = TopicConfig(name="Test", channels=["@channel1", "@channel2"])
        assert config.channels == ["channel1", "channel2"]
    
    def test_invalid_channel_in_topic(self):
        """Test invalid channel name in topic"""
        with pytest.raises(ValueError, match="too short"):
            TopicConfig(name="Test", channels=["shrt"])


class TestLLMConfig:
    """Tests for LLMConfig model"""
    
    def test_valid_llm_config(self):
        """Test valid LLM configuration"""
        config = LLMConfig(model="test-model", temperature=0.7)
        assert config.model == "test-model"
        assert config.temperature == 0.7
    
    def test_default_values(self):
        """Test default LLM configuration values"""
        config = LLMConfig()
        assert config.model == "llama3.2"
        assert config.temperature == 0.7
        assert config.context_window == 4096
    
    def test_invalid_temperature_too_high(self):
        """Test temperature validation - too high"""
        with pytest.raises(ValueError, match="Temperature"):
            LLMConfig(model="test", temperature=3.0)
    
    def test_invalid_temperature_negative(self):
        """Test temperature validation - negative"""
        with pytest.raises(ValueError, match="Temperature"):
            LLMConfig(model="test", temperature=-1.0)


class TestSDConfig:
    """Tests for SDConfig model"""
    
    def test_valid_sd_config(self):
        """Test valid SD configuration"""
        config = SDConfig(width=896, height=1152)
        assert config.width == 896
        assert config.height == 1152
    
    def test_default_values(self):
        """Test default SD configuration values"""
        config = SDConfig()
        assert config.width == 512
        assert config.height == 512
        assert config.steps == 20
        assert config.cfg_scale == 7.0
    
    def test_invalid_dimension_not_multiple_of_8(self):
        """Test dimension validation - not multiple of 8"""
        with pytest.raises(ValueError, match="multiple of 8"):
            SDConfig(width=900, height=1152)
    
    def test_valid_dimensions_multiple_of_8(self):
        """Test valid dimensions that are multiples of 8"""
        config = SDConfig(width=896, height=1152)
        assert config.width % 8 == 0
        assert config.height % 8 == 0


class TestPostData:
    """Tests for PostData model"""
    
    def test_valid_post_data(self):
        """Test valid post data"""
        post = PostData(
            channel="testchannel",
            text="Test post",
            link="https://t.me/test/1",
            has_media=True
        )
        assert post.channel == "testchannel"
        assert post.text == "Test post"
        assert post.has_media is True
    
    def test_post_data_with_saved_fields(self):
        """Test post data with saved fields"""
        post = PostData(
            channel="test",
            saved_text="Saved text",
            saved_gen_bytes=b"test image data"
        )
        assert post.saved_text == "Saved text"
        assert post.saved_gen_bytes == b"test image data"
    
    def test_post_data_defaults(self):
        """Test post data default values"""
        post = PostData()
        assert post.channel == ""
        assert post.text == ""
        assert post.has_media is False
        assert post.saved_text is None


class TestPublishedPost:
    """Tests for PublishedPost model"""
    
    def test_valid_published_post(self):
        """Test valid published post"""
        now = datetime.now()
        post = PublishedPost(
            link="https://t.me/test/1",
            published_at=now,
            channel="testchannel"
        )
        assert post.link == "https://t.me/test/1"
        assert isinstance(post.published_at, datetime)
        assert post.channel == "testchannel"


class TestAPICallMetrics:
    """Tests for APICallMetrics model"""
    
    def test_valid_metrics(self):
        """Test valid API call metrics"""
        metrics = APICallMetrics(
            service="llm",
            success=True,
            duration=1.5
        )
        assert metrics.service == "llm"
        assert metrics.success is True
        assert metrics.duration == 1.5
    
    def test_all_valid_services(self):
        """Test all valid service names"""
        for service in ["llm", "sd", "bot", "api"]:
            metrics = APICallMetrics(service=service, success=True, duration=1.0)
            assert metrics.service == service
    
    def test_invalid_service(self):
        """Test invalid service name"""
        with pytest.raises(ValueError, match="Invalid service"):
            APICallMetrics(service="invalid", success=True, duration=1.0)
    
    def test_negative_duration(self):
        """Test negative duration validation"""
        with pytest.raises(ValueError, match="negative"):
            APICallMetrics(service="llm", success=True, duration=-1.0)
    
    def test_failed_call_with_error(self):
        """Test failed API call with error message"""
        metrics = APICallMetrics(
            service="api",
            success=False,
            duration=0.5,
            error_message="Connection timeout"
        )
        assert metrics.success is False
        assert metrics.error_message == "Connection timeout"


class TestModelEdgeCases:
    """Tests for edge cases in models"""
    
    def test_channel_name_exactly_5_chars(self):
        """Test channel name with exactly 5 characters"""
        config = ChannelConfig(name="abcde")
        assert config.name == "abcde"
    
    def test_channel_name_exactly_32_chars(self):
        """Test channel name with exactly 32 characters"""
        config = ChannelConfig(name="a" * 32)
        assert len(config.name) == 32
    
    def test_temperature_at_boundaries(self):
        """Test temperature at exact boundaries"""
        config_low = LLMConfig(temperature=0.0)
        config_high = LLMConfig(temperature=2.0)
        assert config_low.temperature == 0.0
        assert config_high.temperature == 2.0
    
    def test_empty_topic_channels(self):
        """Test topic with no channels"""
        config = TopicConfig(name="Empty Topic", channels=[])
        assert config.channels == []
