import diskcache
import uuid
import time
import logging
import os
from fastapi import HTTPException

# Initialize diskcache
cache_dir = os.environ.get('CACHE_DIR', './cache')
cache = diskcache.Cache(cache_dir)

# Default expiration time (1 hour)
DEFAULT_EXPIRY = 3600

def generate_unique_id():
    """
    Generate a unique session ID for persisting data across /query and /evaluate endpoints for each user.
    
    Returns:
        str: A unique UUID string
        
    This function creates a random UUID that serves as a key for storing and retrieving property search data,
    allowing the system to maintain state between the initial query and subsequent evaluation steps.
    
    Cursor Edit count: 2
    """
    return str(uuid.uuid4())

async def store_query_status(session_id, status):
    """
    Store query status in cache to track the progress of asynchronous property searches.
    
    Args:
        session_id: The unique identifier for the query session
        status: Dictionary containing status information
        
    This function updates the status of a property search session in the cache, allowing
    the /evaluate endpoint to check if the property search has completed before proceeding
    with evaluation.
    
    Cursor Edit count: 2
    """
    logging.info(f"Storing status for session {session_id}: {status}")
    cache.set(f"status:{session_id}", status, expire=DEFAULT_EXPIRY)

async def get_query_status(session_id):
    """
    Get query status from cache to determine if a property search has completed.
    
    Args:
        session_id: The unique identifier for the query session
        
    Returns:
        dict | None: The status dictionary or None if not found
        
    This function retrieves the current status of a property search session, allowing
    the /evaluate endpoint to check if it needs to wait for the search to complete.
    
    Cursor Edit count: 2
    """
    status = cache.get(f"status:{session_id}")
    if not status:
        logging.warning(f"No status found for session {session_id}")
        return None
    # Ensure we return a dictionary
    if isinstance(status, dict):
        return status
    else:
        logging.error(f"Invalid status format for session {session_id}: {status}")
        return {"status": "error", "error": "Invalid status format"}

async def store_properties(session_id, properties, requirements):
    """
    Store properties and requirements in cache to decouple property fetching from evaluation.
    
    Args:
        session_id: The unique identifier for the query session
        properties: List of property objects
        requirements: The requirements object
        
    This function stores the fetched properties and their requirements in the cache,
    allowing the /evaluate endpoint to access them later without having to fetch them again.
    This separation improves response time by starting the property search earlier in the user flow.
    
    Cursor Edit count: 2
    """
    logging.info(f"Storing {len(properties)} properties for session {session_id}")
    cache.set(f"properties:{session_id}", properties, expire=DEFAULT_EXPIRY)
    cache.set(f"requirements:{session_id}", requirements, expire=DEFAULT_EXPIRY)

async def retrieve_properties(session_id):
    """
    Retrieve properties and requirements from cache for evaluation.
    
    Args:
        session_id: The unique identifier for the query session
        
    Returns:
        tuple: (properties, requirements)
        
    Raises:
        HTTPException: If properties or requirements are not found
        
    This function retrieves the stored properties and requirements for a session,
    allowing the /evaluate endpoint to evaluate properties without having to fetch them again.
    
    Cursor Edit count: 2
    """
    properties = cache.get(f"properties:{session_id}")
    requirements = cache.get(f"requirements:{session_id}")
    
    if not properties:
        logging.warning(f"No properties found for session {session_id}")
        raise HTTPException(status_code=404, detail="Properties not found")
    
    if not requirements:
        logging.warning(f"No requirements found for session {session_id}")
        raise HTTPException(status_code=404, detail="Requirements not found")
    
    return properties, requirements

def clear_expired_cache():
    """
    Clear expired cache entries to prevent memory leaks and maintain system performance.
    
    This function removes all expired entries from the cache, ensuring that the system
    doesn't waste resources on stale data from abandoned or completed searches.
    
    Cursor Edit count: 2
    """
    cache.expire()

def get_cache_stats():
    """
    Get cache statistics for monitoring and debugging cache usage.
    
    Returns:
        dict: Statistics about the cache
        
    This function returns information about the current state of the cache,
    which is useful for monitoring system performance and diagnosing issues.
    
    Cursor Edit count: 2
    """
    return {
        "size": cache.volume(),
        "count": sum(1 for _ in cache),
    } 