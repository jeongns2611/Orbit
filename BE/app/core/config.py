from pydantic_settings import BaseSettings


# S3 ENV 읽기용
class Settings(BaseSettings):
    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "ap-northeast-2"
    AWS_BUCKET_NAME: str

    class Config:
        env_file = ".env"


settings = Settings()
