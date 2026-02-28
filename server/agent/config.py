import os


OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

POSTHOG_PERSONAL_API_KEY = os.environ.get("POSTHOG_PERSONAL_API_KEY", "")
POSTHOG_PROJECT_ID = os.environ.get("POSTHOG_PROJECT_ID", "")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
