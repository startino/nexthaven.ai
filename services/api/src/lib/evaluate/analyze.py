# TODO: To Analyze the user entered data and return a generated requirements list using simple LLM chain

import logging

from src.models.requirement import (
    UserRequirement,
    GeneratedRequirement,
    Budget,
    DateRange,
)
from src.interfaces.llm import gpt_4o_mini, ministral_8b

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputToolsParser
from datetime import datetime


class AnalyzeUserRequirement:

    def __init__(self):
        self.llm = ministral_8b()
        self.today_date = datetime.now().strftime("%Y-%m-%d")

    def analyze_user_requirement(
        self, user_requirement: UserRequirement
    ) -> GeneratedRequirement:
        logging.info(f"Analyzing user requirement: {user_requirement}")
        prompt = PromptTemplate.from_template(
            """Analyze the user requirement and return a generated requirement list. The user requirement is: {user_requirement}
            
            Helpers to generate the requirements:
            - Today's date is {today_date}
            
            IMPORTANT: The budget provided by the user is the TOTAL budget for the entire stay.
            You need to:
            1. Parse the date range from the user's input
            2. Calculate the number of nights in the stay
            3. Calculate the nightly budget by dividing the total budget by the number of nights
            4. Set both the original total budget and the calculated nightly budget in your response
            
            For example, if the user's total budget is $1000-$2000 for a 5-night stay, the nightly budget would be $200-$400 per night.
            You should include your calculations in your reasoning. Absolutely every parameter should be included in your reasoning.

            Output Schema:
            {output_schema}

            * Nightly budget should rounded to the nearest integer
            """
        )

        chain = (
            prompt
            | self.llm.bind_tools([GeneratedRequirement], tool_choice="any")
            | JsonOutputToolsParser(return_id=True)
        )

        response = chain.invoke(
            {
                "user_requirement": user_requirement,
                "today_date": self.today_date,
                "output_schema": GeneratedRequirement.model_json_schema(),
            }
        )

        logging.info(f"Analyzed user requirement and generated requirements")

        return GeneratedRequirement(**response[0]["args"])


if __name__ == "__main__":
    user_requirement = UserRequirement(
        query="I want to find a property in New York",
        date="from tomorrow to until the end of next week",
        budget=Budget(min=100, max=200),
        adults=2,
        number_of_rooms=1,
        preferences="I want a property with a pool, quiet location, a good view, proximity to co-working space",
    )
    analyze = AnalyzeUserRequirement()
    response = analyze.analyze_user_requirement(user_requirement)
    print(response)
