import os
from dotenv import load_dotenv
from pydantic import SecretStr

from openai import AsyncAzureOpenAI
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

load_dotenv()

# def gpt_4o_realtime_preview(temperature: float = 0.5) -> AzureChatOpenAI:
#     """
#     """
#     AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
#     assert (
#         AZURE_OPENAI_API_KEY is not None
#     ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
#     AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
#     assert (
#         AZURE_OPENAI_API_ENDPOINT is not None
#     ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"

#     return AzureChatOpenAI(
#         azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
#         api_key=SecretStr(AZURE_OPENAI_API_KEY),
#         azure_deployment="gpt-4o-realtime-preview",
#         model="gpt-4o-realtime-preview",
#         api_version="2024-10-01",
#         temperature=temperature,
#         max_retries=20,
#     )

def gemini_pro_exp(temperature: float = 0.5) -> OpenAIModel:
    """
    https://openrouter.ai/google/gemini-2.0-pro-exp-02-05
    """
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    assert (
        OPENROUTER_API_KEY is not None
    ), "Environment variable 'OPENROUTER_API_KEY' is not set"

    return OpenAIModel(
        model_name="google/gemini-2.0-pro-exp-02-05",
        provider=OpenAIProvider(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ),
    )



def ministral_8b(temperature: float = 0.5) -> OpenAIModel:
    """
    https://openrouter.ai/mistralai/ministral-8b
    """
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    assert (
        OPENROUTER_API_KEY is not None
    ), "Environment variable 'OPENROUTER_API_KEY' is not set"

    return OpenAIModel(
        model_name="mistralai/ministral-8b",
        provider=OpenAIProvider(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ),
    )


def deepseek_r1_distill(temperature: float = 0.5) -> OpenAIModel:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    assert (
        OPENROUTER_API_KEY is not None
    ), "Environment variable 'OPENROUTER_API_KEY' is not set"

    return OpenAIModel(
        model_name="deepseek/deepseek-r1-distill-qwen-14b",
        provider=OpenAIProvider(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ),
    )


def gemini_flash_2(temperature: float = 0.5) -> OpenAIModel:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    assert (
        OPENROUTER_API_KEY is not None
    ), "Environment variable 'OPENROUTER_API_KEY' is not set"

    return OpenAIModel(
        model_name="google/gemini-2.0-flash-001",
        provider=OpenAIProvider(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ),
    )

def openrouter_r1(temperature: float = 0.5) -> OpenAIModel:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    assert (
        OPENROUTER_API_KEY is not None
    ), "Environment variable 'OPENROUTER_API_KEY' is not set"

    return OpenAIModel(
        model_name="deepseek/deepseek-r1",
        provider=OpenAIProvider(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        ),
    )

def gpt_4o_mini(temperature: float = 0.5) -> OpenAIModel:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    client = AsyncAzureOpenAI(
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-06-01",
        api_key=AZURE_OPENAI_API_KEY,
    )
    
    return OpenAIModel(
        model_name="gpt-4o-mini",
        provider=OpenAIProvider(
            openai_client=client,
        ),
    )
    
def o1(temperature: float = 0.5) -> OpenAIModel:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    client = AsyncAzureOpenAI(
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-12-01-preview",
        api_key=AZURE_OPENAI_API_KEY,
    )
    
    return OpenAIModel(
        model_name="o1",
        provider=OpenAIProvider(
            openai_client=client,
        ),
    )
    
def gpt_4o(temperature: float = 0.5) -> OpenAIModel:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    client = AsyncAzureOpenAI(
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-06-01",
        api_key=AZURE_OPENAI_API_KEY,
    )
    
    return OpenAIModel(
        model_name="gpt-4o",
        provider=OpenAIProvider(
            openai_client=client,
        ),
    )

def o3_mini(temperature: float = 0.5) -> OpenAIModel:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    client = AsyncAzureOpenAI(
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-12-01-preview",
        api_key=AZURE_OPENAI_API_KEY,
    )
    
    return OpenAIModel(
        model_name="o3-mini",
        provider=OpenAIProvider(
            openai_client=client,
        ),
    )
    
def o3_vision(temperature: float = 0.5) -> OpenAIModel:
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    assert (
        AZURE_OPENAI_API_KEY is not None
    ), "Environment variable 'AZURE_OPENAI_API_KEY' is not set"
    
    AZURE_OPENAI_API_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    assert (
        AZURE_OPENAI_API_ENDPOINT is not None
    ), "Environment variable 'AZURE_OPENAI_API_ENDPOINT' is not set"
    
    client = AsyncAzureOpenAI(
        azure_endpoint=AZURE_OPENAI_API_ENDPOINT,
        api_version="2024-12-01-preview",
        api_key=AZURE_OPENAI_API_KEY,
    )
    
    return OpenAIModel(
        model_name="o3-vision",
        provider=OpenAIProvider(
            openai_client=client,
        ),
    )
