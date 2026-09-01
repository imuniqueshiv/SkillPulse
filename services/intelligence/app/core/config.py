import os


class Settings:
    service_name = "skillpulse-intelligence"
    environment = os.getenv("NODE_ENV", "development")
    port = int(os.getenv("INTELLIGENCE_PORT", "8000"))


settings = Settings()
