# Server/services/age_rules.py
from datetime import date, datetime

CATEGORY_RULES = [
    ("U13", 0, 13),
    ("U15", 13, 15),
    ("U17", 15, 17),
    ("U19", 17, 19),
    ("OPEN", 19, 200),  # 19 ke atas
]


def calculate_age(birth_date: date, on_date: date | None = None) -> int:
    if on_date is None:
        on_date = date.today()
    years = on_date.year - birth_date.year
    if (on_date.month, on_date.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def get_category_for_age(age: int) -> str | None:
    for name, min_age, max_age in CATEGORY_RULES:
        if min_age <= age < max_age:
            return name
    return None


def parse_dob(dob_str: str) -> date:
    """
    Terima format 'YYYY-MM-DD' dari frontend.
    """
    return datetime.strptime(dob_str, "%Y-%m-%d").date()
