# TODO: To Analyze the user entered data and return a generated requirements list using simple LLM chain

import logging
import asyncio

from src.models.requirement import (
    UserRequirement,
    GeneratedRequirement,
    Budget,
    DateRange,
)
from src.interfaces.llm import ministral_8b

from datetime import datetime

from pydantic_ai import Agent, RunContext
class AnalyzeUserRequirement:

    def __init__(self):
        self.llm = ministral_8b()
        self.today_date = datetime.now().strftime("%Y-%m-%d")

    async def analyze_user_requirement(
        self, user_requirement: UserRequirement
    ) -> GeneratedRequirement:
        logging.info(f"Analyzing user requirement: {user_requirement}")
        
        try:
            system_prompt = f"""Analyze the user requirement and return a generated requirement list. The user requirement is: {user_requirement}
                
                Helpers to generate the requirements:
                - Today's date is {self.today_date}
                
                IMPORTANT: The budget provided by the user is the TOTAL budget for the entire stay.
                You need to:
                1. Parse the date range from the user's input
                2. Calculate the number of nights in the stay
                3. Calculate the nightly budget by dividing the total budget by the number of nights
                4. Set both the original total budget and the calculated nightly budget in your response
                
                For example, if the user's total budget is $1000-$2000 for a 5-night stay, the nightly budget would be $200-$400 per night.
                You should include your calculations in your reasoning. Absolutely every parameter should be included in your reasoning.

                * Nightly budget should rounded to the nearest integer
                """
                
            agent = Agent(
                model=self.llm,
                system_prompt=system_prompt,
                result_type=GeneratedRequirement,
            )
            
            try:
                response = await agent.run("Analyze the user requirement and return a generated requirement list.")
                
                if not response:
                    raise ValueError("No response received from LLM")
                    
                logging.info("Successfully analyzed user requirements")
                
                return response.data
            
            except Exception as e:
                logging.error(f"Error analyzing user requirements: {str(e)}")
                
        except Exception as e:
            logging.error(f"Error analyzing user requirements: {str(e)}")
            raise


if __name__ == "__main__":
    user_requirement = UserRequirement(
        query="I want to find a property in New York",
        date="from this sunday until next sunday",
        budget=Budget(min=100, max=200),
        adults=2,
        number_of_rooms=1,
        preferences="I want a property with a pool, quiet location, a good view, proximity to co-working space",
    )
    
    async def main():
        analyze = AnalyzeUserRequirement()
        response = await analyze.analyze_user_requirement(user_requirement)
        print(response)
        
    # Run the async main function
    asyncio.run(main())
