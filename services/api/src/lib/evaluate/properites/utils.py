from datetime import datetime

def is_valid_date_format(date_str: str) -> bool:
        """
        Check if a string is in the YYYY-MM-DD date format.

        Args:
            date_str: String to check

        Returns:
            bool: True if string follows the YYYY-MM-DD format, False otherwise
        """
        if not date_str or not isinstance(date_str, str):
            return False

        # Check if it follows YYYY-MM-DD pattern
        import re

        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            return False

        # Additional validation to make sure it's a valid date
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except ValueError:
            return False