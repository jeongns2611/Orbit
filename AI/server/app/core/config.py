from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from pydantic import AliasChoices, BaseModel, Field
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources import PydanticBaseSettingsSource

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None


class YamlConfigSettingsSource(PydanticBaseSettingsSource):
    def __init__(self, settings_cls: type[BaseSettings], yaml_path: Path):
        super().__init__(settings_cls)
        self.yaml_path = yaml_path
        self._cached: Optional[Dict[str, Any]] = None

    def _normalize(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            normalized: Dict[Any, Any] = {}
            for k, v in obj.items():
                nk = k.upper() if isinstance(k, str) else k
                normalized[nk] = self._normalize(v)
            return normalized
        if isinstance(obj, list):
            return [self._normalize(v) for v in obj]
        return obj

    def _read_yaml(self) -> Dict[str, Any]:
        if self._cached is not None:
            return self._cached

        if yaml is None:
            self._cached = {}
            return self._cached
        if not self.yaml_path.exists():
            self._cached = {}
            return self._cached

        data = yaml.safe_load(self.yaml_path.read_text(encoding="utf-8"))
        if data is None or not isinstance(data, dict):
            self._cached = {}
            return self._cached

        normalized = self._normalize(data)
        self._cached = normalized if isinstance(normalized, dict) else {}
        return self._cached

    def get_field_value(
        self, field: FieldInfo, field_name: str
    ) -> Tuple[Any, str, bool]:
        data = self._read_yaml()
        key = field_name.upper()
        if key in data:
            return data[key], key, False
        return None, key, False

    def __call__(self) -> Dict[str, Any]:
        return self._read_yaml()


class LLMParams(BaseModel):
    LLM_MODEL_NAME: str = ""
    BASE_URL: str = ""
    SYSTEM_INSTRUCTION: str = ""
    CHAT_SYSTEM_INSTRUCTION: str = ""
    REPORT_SYSTEM_INSTRUCTION: str = ""
    IMAGE_SYSTEM_INSTRUCTION: str = ""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        extra="ignore",
        case_sensitive=False,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        yaml_path = Path(__file__).resolve().parents[2] / "config.yaml"
        yaml_settings = YamlConfigSettingsSource(settings_cls, yaml_path)

        return (
            init_settings,
            env_settings,
            dotenv_settings,
            yaml_settings,
            file_secret_settings,
        )

    PROJECT_NAME: str = ""

    # Gemini API Key (환경변수에서 로드)
    GOOGLE_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GMS_API_KEY",
            "gms_api_key",
        ),
    )

    llm_param: LLMParams = Field(
        default_factory=LLMParams,
        validation_alias=AliasChoices(
            "LLM_PARAMS",
            "llm_params",
            "LLM_PARAM",
            "llm_param",
        ),
    )

    @property
    def llm(self) -> LLMParams:
        return self.llm_param

    DEVICE: str = Field(
        default="cuda",
        validation_alias=AliasChoices(
            "DEVICE",
            "device",
        ),
    )

    CUDA_VISIBLE_DEVICES: str = Field(
        default="",
        validation_alias=AliasChoices(
            "CUDA_VISIBLE_DEVICES",
            "cuda_visible_devices",
        ),
    )


settings: Settings = Settings()
