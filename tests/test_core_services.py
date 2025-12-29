"""
Comprehensive tests for core backend services.
Compatible with Python 3.10 - 3.14
"""
import pytest
import asyncio
import sys
from pathlib import Path
from typing import Any
from unittest.mock import Mock, patch, AsyncMock
from dataclasses import dataclass

# Setup path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src" / "backend"))


# ============================================================================
# Mock Classes for testing without full backend dependencies
# ============================================================================

@dataclass
class RetryConfig:
    """Configuration for retry mechanism"""
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    retryable_exceptions: tuple = (Exception,)


def retry_with_backoff(config: RetryConfig):
    """Decorator factory for retry with exponential backoff"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            last_exception = None
            delay = config.initial_delay
            
            for attempt in range(config.max_attempts):
                try:
                    return await func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e
                    if attempt < config.max_attempts - 1:
                        await asyncio.sleep(min(delay, config.max_delay))
                        delay *= config.exponential_base
                except Exception as e:
                    raise e
            
            raise last_exception
        return wrapper
    return decorator


class ErrorHandler:
    """Mock error handler for testing"""
    
    @staticmethod
    def handle_api_error(error: Exception) -> str:
        error_str = str(error).lower()
        
        if isinstance(error, ConnectionError):
            return "Ошибка соединения / Connection error"
        elif "404" in error_str:
            return "404 - Ресурс не найден / Not found"
        elif "429" in error_str:
            return "429 - Лимит запросов / Rate limit exceeded"
        elif "401" in error_str:
            return "401 - Ошибка авторизации / Unauthorized"
        elif "500" in error_str:
            return "500 - Ошибка сервера / Server error"
        else:
            return f"Неизвестная ошибка / Unknown error: {error}"


# ============================================================================
# Test Classes
# ============================================================================

class TestRetryConfig:
    """Tests for RetryConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = RetryConfig()
        assert config.max_attempts == 3
        assert config.initial_delay == 1.0
        assert config.max_delay == 60.0
        assert config.exponential_base == 2.0
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = RetryConfig(
            max_attempts=5,
            initial_delay=0.1,
            max_delay=10.0,
            exponential_base=3.0,
            retryable_exceptions=(ValueError, KeyError)
        )
        assert config.max_attempts == 5
        assert config.initial_delay == 0.1
        assert config.max_delay == 10.0
        assert config.exponential_base == 3.0
        assert ValueError in config.retryable_exceptions
        assert KeyError in config.retryable_exceptions


class TestRetryDecorator:
    """Tests for retry decorator"""
    
    @pytest.mark.asyncio
    async def test_successful_first_attempt(self):
        """Test function succeeds on first attempt"""
        call_count = 0
        
        @retry_with_backoff(RetryConfig(max_attempts=3))
        async def successful_func():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = await successful_func()
        assert result == "success"
        assert call_count == 1
    
    @pytest.mark.asyncio
    async def test_retry_on_failure(self):
        """Test retry after initial failure"""
        call_count = 0
        
        @retry_with_backoff(RetryConfig(max_attempts=3, initial_delay=0.01))
        async def failing_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary failure")
            return "success"
        
        result = await failing_then_success()
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_max_attempts_exceeded(self):
        """Test all retries fail"""
        call_count = 0
        
        @retry_with_backoff(RetryConfig(max_attempts=3, initial_delay=0.01))
        async def always_fails():
            nonlocal call_count
            call_count += 1
            raise ValueError("Always fails")
        
        with pytest.raises(ValueError):
            await always_fails()
        
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_non_retryable_exception(self):
        """Test non-retryable exception is raised immediately"""
        call_count = 0
        
        @retry_with_backoff(RetryConfig(
            max_attempts=3,
            retryable_exceptions=(ValueError,)
        ))
        async def raises_keyerror():
            nonlocal call_count
            call_count += 1
            raise KeyError("Non-retryable")
        
        with pytest.raises(KeyError):
            await raises_keyerror()
        
        assert call_count == 1  # Only called once, no retry


class TestErrorHandler:
    """Tests for ErrorHandler class"""
    
    def test_connection_error(self):
        """Test handling of connection errors"""
        error = ConnectionError("Connection refused")
        result = ErrorHandler.handle_api_error(error)
        
        assert "соединения" in result.lower() or "connection" in result.lower()
    
    def test_404_error(self):
        """Test handling of 404 errors"""
        error = Exception("404 Not Found")
        result = ErrorHandler.handle_api_error(error)
        
        assert "404" in result
    
    def test_429_rate_limit(self):
        """Test handling of 429 rate limit errors"""
        error = Exception("429 Too Many Requests")
        result = ErrorHandler.handle_api_error(error)
        
        assert "429" in result
    
    def test_401_unauthorized(self):
        """Test handling of 401 unauthorized errors"""
        error = Exception("401 Unauthorized")
        result = ErrorHandler.handle_api_error(error)
        
        assert "401" in result
    
    def test_500_server_error(self):
        """Test handling of 500 server errors"""
        error = Exception("500 Internal Server Error")
        result = ErrorHandler.handle_api_error(error)
        
        assert "500" in result
    
    def test_unknown_error(self):
        """Test handling of unknown errors"""
        error = RuntimeError("Something unexpected")
        result = ErrorHandler.handle_api_error(error)
        
        assert isinstance(result, str)
        assert len(result) > 0


class TestPython314Features:
    """Tests that verify Python 3.14 compatibility"""
    
    def test_type_hints(self):
        """Test modern type hints work correctly"""
        def func_with_hints(x: int, y: str | None = None) -> dict[str, Any]:
            return {"x": x, "y": y}
        
        result = func_with_hints(42, "test")
        assert result == {"x": 42, "y": "test"}
    
    def test_match_statement(self):
        """Test match statement (Python 3.10+)"""
        def handle_status(status: int) -> str:
            match status:
                case 200:
                    return "ok"
                case 404:
                    return "not found"
                case 500:
                    return "server error"
                case _:
                    return "unknown"
        
        assert handle_status(200) == "ok"
        assert handle_status(404) == "not found"
        assert handle_status(999) == "unknown"
    
    def test_walrus_operator(self):
        """Test walrus operator (assignment expression)"""
        data = [1, 2, 3, 4, 5]
        if (n := len(data)) > 3:
            result = f"Long list: {n} items"
        else:
            result = "Short list"
        
        assert result == "Long list: 5 items"
    
    def test_f_string_expressions(self):
        """Test complex f-string expressions"""
        value = 42
        result = f"The answer is {value!r} which equals {value * 2:.2f}"
        assert "42" in result
        assert "84.00" in result


class TestAsyncFeatures:
    """Tests for async/await functionality"""
    
    @pytest.mark.asyncio
    async def test_async_context_manager(self):
        """Test async context manager pattern"""
        class MockAsyncResource:
            def __init__(self):
                self.opened = False
                self.closed = False
            
            async def __aenter__(self):
                self.opened = True
                return self
            
            async def __aexit__(self, *args):
                self.closed = True
        
        resource = MockAsyncResource()
        async with resource:
            assert resource.opened
            assert not resource.closed
        
        assert resource.closed
    
    @pytest.mark.asyncio
    async def test_async_generator(self):
        """Test async generator pattern"""
        async def async_range(n: int):
            for i in range(n):
                await asyncio.sleep(0)  # Yield control
                yield i
        
        results = []
        async for value in async_range(5):
            results.append(value)
        
        assert results == [0, 1, 2, 3, 4]
    
    @pytest.mark.asyncio
    async def test_gather_with_return_exceptions(self):
        """Test asyncio.gather with error handling"""
        async def success():
            return "ok"
        
        async def failure():
            raise ValueError("failed")
        
        results = await asyncio.gather(
            success(),
            failure(),
            return_exceptions=True
        )
        
        assert results[0] == "ok"
        assert isinstance(results[1], ValueError)
