import os
from dotenv import load_dotenv
from pydantic import SecretStr

from langchain_openai import AzureChatOpenAI

load_dotenv()

def gpt_4o_mini(temperature: float = 0.5) -> AzureChatOpenAI:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    return AzureChatOpenAI(
        streaming=True,
        azure_deployment="gpt-4o-mini",
        temperature=temperature,
        api_key=SecretStr(AZURE_OPENAI_API_KEY),
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        model="gpt-4o-mini",
        api_version="2024-06-01",
        max_retries=20,
    )
    
def o1(temperature: float = 0.5) -> AzureChatOpenAI:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    return AzureChatOpenAI(
        api_key=SecretStr(AZURE_OPENAI_API_KEY),
        azure_deployment="o1",
        model="o1",
        azure_endpoint=os.getenv("AZURE_OPENAI_API_ENDPOINT"),
        api_version="2024-12-01-preview",
        max_retries=20,
    )
    
def gpt_4o(temperature: float = 0.5) -> AzureChatOpenAI:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    return AzureChatOpenAI(
        streaming=True,
        azure_deployment="gpt-4o",
        temperature=temperature,
        api_key=SecretStr(AZURE_OPENAI_API_KEY),
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        model="gpt-4o",
        api_version="2024-06-01",
        max_retries=20,
    )

def o3_mini(temperature: float = 0.5) -> AzureChatOpenAI:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    return AzureChatOpenAI(
        api_key=SecretStr(AZURE_OPENAI_API_KEY),
        azure_deployment="o3-mini",
        model="o3-mini",
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-12-01-preview",
        max_retries=20,
    )
    
def o3_vision(temperature: float = 0.5) -> AzureChatOpenAI:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    return AzureChatOpenAI(
        api_key=SecretStr(AZURE_OPENAI_API_KEY),
        azure_deployment="o3-vision",
        model="o3-vision",
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-12-01-preview",
        max_retries=20,
    )
