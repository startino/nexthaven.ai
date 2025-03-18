import pytest
from unittest.mock import patch, MagicMock
import os

from src.interfaces.llm import gemini_pro_exp


def test_gemini_pro_exp_initialization():
    """Test that gemini_pro_exp can be initialized."""
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"}):
        with patch('src.interfaces.llm.ChatOpenAI') as mock_chat_openai:
            # Setup mock
            mock_instance = MagicMock()
            mock_chat_openai.return_value = mock_instance
            
            # Call the function
            llm = gemini_pro_exp()
            
            # Verify the function returns the mock
            assert llm == mock_instance
            
            # Verify ChatOpenAI was called with correct arguments
            mock_chat_openai.assert_called_once()
            args, kwargs = mock_chat_openai.call_args
            assert kwargs["model"] == "google/gemini-2.0-pro-exp-02-05"
            assert kwargs["temperature"] == 0.5
            assert kwargs["max_retries"] == 20
            assert kwargs["base_url"] == "https://openrouter.ai/api/v1"


def test_gemini_pro_exp_with_custom_temperature():
    """Test that gemini_pro_exp can be initialized with a custom temperature."""
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"}):
        with patch('src.interfaces.llm.ChatOpenAI') as mock_chat_openai:
            # Setup mock
            mock_instance = MagicMock()
            mock_chat_openai.return_value = mock_instance
            
            # Call the function with a custom temperature
            llm = gemini_pro_exp(temperature=0.8)
            
            # Verify the function returns the mock
            assert llm == mock_instance
            
            # Verify ChatOpenAI was called with correct arguments
            mock_chat_openai.assert_called_once()
            args, kwargs = mock_chat_openai.call_args
            assert kwargs["temperature"] == 0.8


def test_gemini_pro_exp_missing_api_key():
    """Test that gemini_pro_exp raises an error when the API key is missing."""
    # We need to patch the assert statement in the gemini_pro_exp function
    with patch('src.interfaces.llm.os.getenv', return_value=None):
        # Verify that an assertion error is raised
        with pytest.raises(AssertionError) as excinfo:
            gemini_pro_exp()
        
        # Verify the error message
        assert "OPENROUTER_API_KEY" in str(excinfo.value) 