import asyncio
from collections import defaultdict
import json
from pathlib import Path
import re
import httpx
from typing import List, Optional
from urllib.parse import urlencode
from parsel import Selector
import logging

from src.models.requirement import GeneratedRequirement, DateRange, Budget
from src.models.result import SearchResult

logging.basicConfig(level=logging.INFO)

async def request_hotels_page(
    requirement: GeneratedRequirement,
    offset: int = 0,
):
    """scrapes a single hotel search page of booking.com"""
    checkin_year, checking_month, checking_day = requirement.date_range.start_date.split("-") if requirement.date_range.start_date else "", "", ""
    checkout_year, checkout_month, checkout_day = requirement.date_range.end_date.split("-") if requirement.date_range.end_date else "", "", ""

    url = "https://www.booking.com/searchresults.html"
    url += "?" + urlencode(
        {
            "ss": requirement.query,
            "checkin_year": checkin_year,
            "checkin_month": checking_month,
            "checkin_monthday": checking_day,
            "checkout_year": checkout_year,
            "checkout_month": checkout_month,
            "checkout_monthday": checkout_day,
            "no_rooms": requirement.number_of_rooms,
            "offset": offset,
        }
    )
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
    }
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        return await client.get(url, headers=headers)


def parse_search_total_results(html: str) -> int:
    """Parse total number of properties from search results page"""
    sel = Selector(text=html)
    try:
        # Try different possible heading formats
        heading = sel.css("h1::text").get("")
        if not heading:
            # Fallback to the entire text content if no direct h1 text
            heading = sel.css("h1").get("")
            
        # Try different possible patterns
        patterns = [
            r"([0-9,]+)\s+properties found",
            r"([0-9,]+)\s+properties",
            r"([0-9,]+)\s+accommodations",
            r"([0-9,]+)\s+available properties",
            r"([0-9,]+)\s+results",
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, heading, re.IGNORECASE)
            if matches:
                return int(matches[0].replace(",", ""))
        
        # If no patterns match, try to find any number in the heading
        numbers = re.findall(r"([0-9,]+)", heading)
        if numbers:
            return int(numbers[0].replace(",", ""))
        
        # If still no results found, return a default value
        return 100  # Default to 100 results if we can't determine the total
        
    except Exception as e:
        print(f"Error parsing total results: {str(e)}")
        return 100  # Default to 100 results on error


def parse_search_hotels(html: str) -> List[SearchResult]:
    sel = Selector(text=html)
    hotel_previews = []

    for hotel_box in sel.xpath('//div[@data-testid="property-card"]'):
        hotel_previews.append(SearchResult(
            url=hotel_box.xpath('.//h3/a[@data-testid="title-link"]/@href').get("").split("?")[0],
            name=hotel_box.xpath('.//h3/a[@data-testid="title-link"]/div/text()').get(""),
            location=hotel_box.xpath('.//span[@data-testid="address"]/text()').get(""),
            score=hotel_box.xpath('.//div[@data-testid="review-score"]/div/text()').get(""),
            review_count=str(hotel_box.xpath('.//div[@data-testid="review-score"]/div[2]/div[2]/text()').get("")),
            stars=len(hotel_box.xpath('.//div[@data-testid="rating-stars"]/span').getall()),
            price=float(hotel_box.xpath('.//div/span[@data-testid="price-and-discounted-price"]/text()').get("")[2:].replace(",", "")),
            image=hotel_box.xpath('.//img[@data-testid="image"]/@src').get(),
        ))
    return hotel_previews


async def scrape_search(
    requirement: GeneratedRequirement,
    max_results: Optional[int] = None,
):
    first_page = await request_hotels_page(
        requirement=requirement,
    )
    # Decode bytes to string
    html_content = first_page.content.decode('utf-8')
    hotel_previews = parse_search_hotels(html_content)
    total_results = parse_search_total_results(html_content)
    if max_results and total_results > max_results:
        total_results = max_results
    other_pages = await asyncio.gather(
        *[
            request_hotels_page(
                requirement=requirement,
                offset=offset,
            )
            for offset in range(25, total_results, 25)
        ]
    )
    for result in other_pages:
        # Decode bytes to string
        html_content = result.content.decode('utf-8')
        hotel_previews.extend(parse_search_hotels(html_content))
    return hotel_previews


def parse_hotel(html: str):
    sel = Selector(text=html)
    css = lambda selector, sep="": sep.join(sel.css(selector).getall()).strip()
    css_first = lambda selector: sel.css(selector).get("")

    # Extract title - try multiple selectors
    title = (
        css("h2.pp-header__title::text") or
        css("[data-testid='property-header'] h2::text") or
        css(".hp__hotel-name::text")
    )

    # Extract description
    description = (
        css("#property_description_content ::text", "\n") or
        css("[data-testid='property-description'] ::text", "\n")
    )

    # Extract address
    # HTML Code
    
    
    address = (
        sel.css('[data-testid="PropertyHeaderAddressDesktop-wrapper"] div div span div::text').get('') or # text is inside div/div/span/div
        sel.css('.hp_address_subtitle::text').get('')  # Legacy selector
    )

    # Extract location data
    try:
        location_data = (
            css_first(".show_map_hp_link::attr(data-atlas-latlng)") or
            css_first("[data-component='map'] ::attr(data-coordinates)") or
            css_first("[data-location-coordinates]::attr(data-location-coordinates)")
        )
        lat, lng = location_data.split(",") if location_data and "," in location_data else ("0", "0")
    except Exception as e:
        print(f"Error extracting location: {e}")
        lat, lng = "0", "0"

    # Extract features/facilities
    features = defaultdict(list)
    try:
        # Try multiple facility selectors
        facility_groups = sel.css("[data-testid='facilities-group']") or sel.css(".hotel-facilities-group")
        for group in facility_groups:
            type_ = group.css("[data-testid='facilities-group-title']::text").get("") or group.css(".facilities-group-title::text").get("")
            items = group.css("li ::text").getall()
            features[type_] = [item.strip() for item in items if item.strip()]
    except Exception as e:
        print(f"Error extracting features: {e}")

    # Extract hotel ID
    try:
        hotel_id = (
            re.findall(r"b_hotel_id:\s*'(.+?)'", html) or
            re.findall(r"hotelId[\"']:\s*[\"'](.+?)[\"']", html) or
            ["0"]
        )[0]
    except Exception as e:
        print(f"Error extracting hotel ID: {e}")
        hotel_id = "0"

    data = {
        "title": title,
        "description": description,
        "address": address,
        "lat": lat,
        "lng": lng,
        "features": dict(features),
        "id": hotel_id,
    }
    return data


async def scrape_hotels(urls: List[str], price_start_dt: str, price_n_days=30):
    async def scrape_hotel(url: str):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            # Add more browser-like headers
            "Cache-Control": "max-age=0",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
        }
        
        async with httpx.AsyncClient(follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()  # Raise exception for bad status codes
                html_content = response.content.decode('utf-8')
                
                # print(html_content)
                hotel = parse_hotel(html_content)
                hotel["url"] = str(response.url)
                
                # Extract CSRF token
                # csrf_token = None
                # csrf_matches = re.findall(r"b_csrf_token:\s*'(.+?)'", response.text)
                # if csrf_matches:
                #     csrf_token = csrf_matches[0]
                #     hotel["price"] = await scrape_prices(
                #         csrf_token=csrf_token,
                #         hotel_id=hotel["id"],
                #         hotel_url=url
                #     )
                # else:
                #     print(f"No CSRF token found for {url}")
                #     hotel["price"] = {}
                
                return hotel
                
            except Exception as e:
                print(f"Error scraping hotel {url}: {str(e)}")
                return {
                    "title": "",
                    "description": "",
                    "address": "",
                    "lat": "0",
                    "lng": "0",
                    "features": {},
                    "id": "0",
                    "url": url,
                    "price": {}
                }

    # async def scrape_prices(hotel_id, csrf_token, hotel_url):
    #     data = {
    #         "name": "hotel.availability_calendar",
    #         "result_format": "price_histogram",
    #         "hotel_id": hotel_id,
    #         "search_config": json.dumps(
    #             {
    #                 "b_adults_total": 2,
    #                 "b_nr_rooms_needed": 1,
    #                 "b_children_total": 0,
    #                 "b_children_ages_total": [],
    #                 "b_is_group_search": 0,
    #                 "b_pets_total": 0,
    #                 "b_rooms": [{"b_adults": 2, "b_room_order": 1}],
    #             }
    #         ),
    #         "checkin": price_start_dt,
    #         "n_days": price_n_days,
    #         "respect_min_los_restriction": 1,
    #         "los": 1,
    #     }
        
    #     headers = {
    #         "X-Booking-CSRF": csrf_token,
    #         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    #         "Accept": "application/json, text/plain, */*",
    #         "Accept-Language": "en-US,en;q=0.9",
    #         "Referer": hotel_url,
    #         "Origin": "https://www.booking.com",
    #         "Connection": "keep-alive",
    #         "Cookie": f"bkng_csrf_token={csrf_token}",
    #         "Sec-Fetch-Dest": "empty",
    #         "Sec-Fetch-Mode": "cors",
    #         "Sec-Fetch-Site": "same-origin",
    #     }
        
    #     async with httpx.AsyncClient(follow_redirects=True) as client:
    #         try:
    #             response = await client.post(
    #                 "https://www.booking.com/fragment.json?cur_currency=usd",
    #                 data=data,
    #                 headers=headers
    #             )
    #             response.raise_for_status()
    #             content = response.content.decode('utf-8')
    #             if not content:
    #                 return {}
    #             try:
    #                 return json.loads(content).get("data", {})
    #             except json.JSONDecodeError:
    #                 return {}
    #         except Exception as e:
    #             print(f"Error fetching prices: {str(e)}")
    #             return {}

    hotels = await asyncio.gather(*[scrape_hotel(url) for url in urls])
    return hotels


async def run():
    # Create results directory in current working directory
    out = Path.cwd() / "results"
    out.mkdir(exist_ok=True)
    
    logging.info("Scraping hotels...")
    
    result_hotels = await scrape_hotels(
        ["https://www.booking.com/hotel/gb/one-hundred-shoreditch.html"],
        price_start_dt="2023-04-20",
        price_n_days=7,
    )
    print(result_hotels)
    out.joinpath("hotels.json").write_text(json.dumps(result_hotels, indent=2, ensure_ascii=False))

    logging.info("Scraping search...")

    # result_search = await scrape_search(GeneratedRequirement(
    #     query="London",
    #     date_range=DateRange(start_date="2025-03-01", end_date="2025-03-07"),
    #     budget=Budget(min=0, max=100),
    #     guest_count=2,
    #     number_of_rooms=1,
    # ), max_results=100)
    # # out.joinpath("search.json").write_text(json.dumps(result_search, indent=2, ensure_ascii=False))
    # print(len(result_search))

if __name__ == "__main__":
    asyncio.run(run())