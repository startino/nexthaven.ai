import os
import logging
from dotenv import load_dotenv

from supabase import create_client, Client

def client() -> Client:
    logging.debug("Creating Supabase client")
    load_dotenv()
    
    url: str | None = os.getenv("PUBLIC_SUPABASE_URL")
    key: str | None = os.getenv("SUPABASE_ANON_KEY")
    
    if url is None:
        logging.error("PUBLIC_SUPABASE_URL must be set")
        raise ValueError("PUBLIC_SUPABASE_URL must be set")
    
    if key is None:
        logging.error("SUPABASE_ANON_KEY must be set")
        raise ValueError("SUPABASE_ANON_KEY must be set")
    
    return create_client(url, key)
    
