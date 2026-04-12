# Server/services/age_rules.py
from datetime import date, datetime

# Updated to comply with PBSI standardized competition regulations
# OPEN means NO age restriction — anyone can join
CATEGORY_RULES = [
    ("U11", 0, 11),     # Usia Dini (Under 11)
    ("U13", 11, 13),    # Anak-anak (Under 13)
    ("U15", 13, 15),    # Pemula (Under 15)
    ("U17", 15, 17),    # Remaja (Under 17)
    ("U19", 17, 19),    # Taruna (Under 19)
    ("OPEN", 0, 200),   # Dewasa — no age restriction, anyone can register
]

# Quick lookup dict:  "U15" -> (13, 15)
AGE_GROUP_MAP = {name: (min_a, max_a) for name, min_a, max_a in CATEGORY_RULES}

# Labels for API consumers
AGE_GROUPS = [
    {"name": name, "minAge": min_a, "maxAge": max_a,
     "label": f"Under {max_a}" if name != "OPEN" else "Open (All Ages)"}
    for name, min_a, max_a in CATEGORY_RULES
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
        if name == "OPEN":
            continue  # OPEN is not auto-assigned
        if min_age <= age < max_age:
            return name
    return None

def is_age_eligible(age: int, min_age: int | None, max_age: int | None) -> bool:
    """
    Check if a player's age is eligible for a category.
    OPEN categories (min_age=0/None, max_age=200/None) always return True.
    """
    # If no age bounds set, treat as OPEN
    if min_age is None and max_age is None:
        return True
    # OPEN category: min=0, max=200
    if min_age == 0 and max_age == 200:
        return True
    # Check bounds
    effective_min = min_age if min_age is not None else 0
    effective_max = max_age if max_age is not None else 200
    return effective_min <= age < effective_max

def parse_dob(dob_str: str) -> date:
    """
    Accepts 'YYYY-MM-DD' format from the frontend.
    """
    return datetime.strptime(dob_str, "%Y-%m-%d").date()