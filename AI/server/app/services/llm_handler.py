"""LLM service wrapper.

This module provides a thin adapter around the Google GenAI client, exposing
simple text generation, image+text generation, embeddings, and streaming.
"""

import asyncio
import mimetypes
import re
import urllib.request
from typing import Any, Iterator, List, Literal, Optional, Tuple, cast

from google import genai
from google.genai import types


class LLMHandler:
    """A wrapper service for LLM operations."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
        system_instruction: str = "",
    ) -> None:
        self.model_name = model_name
        self.base_url = base_url
        self.system_instruction = system_instruction
        self.model: Optional[Any] = None

    def configure(
        self,
        *,
        api_key: str,
        llm_model_name: str,
        base_url: str,
        system_instruction: str = "",
    ) -> None:
        """Configure the underlying GenAI client."""
        self.model_name = llm_model_name
        self.base_url = base_url
        self.system_instruction = system_instruction
        self.model = genai.Client(
            api_key=api_key,
            http_options={"base_url": self.base_url},
        )

    def _resolve_system_instruction(
        self, system_instruction: Optional[str]
    ) -> str:
        """Choose request-level system instruction or fallback to default."""
        return (
            self.system_instruction
            if system_instruction is None
            else system_instruction
        )

    def _build_contents(
        self,
        *,
        text: str,
        messages: Optional[List[Tuple[Literal["user", "assistant"], str]]],
    ) -> List[types.Content]:
        """Build GenAI contents from the given prompt and optional messages."""
        if messages:
            contents: List[types.Content] = []
            for role, content in messages:
                mapped_role = "model" if role == "assistant" else role
                contents.append(
                    types.Content(
                        role=mapped_role,
                        parts=[types.Part.from_text(text=content)],
                    )
                )
            return contents

        return [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=text)],
            )
        ]

    def _build_config(
        self, *, system_instruction: str
    ) -> types.GenerateContentConfig:
        """Build GenAI generation config."""
        return types.GenerateContentConfig(
            system_instruction=system_instruction,
            safety_settings=[
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                ),
            ],
        )

    def strip_emojis(self, text: str) -> str:
        """Remove emoji characters from text."""
        if not isinstance(text, str) or not text:
            return ""

        # Remove common emoji unicode ranges + joiners/modifiers.
        # Note: python stdlib `re` does not support \p{Extended_Pictographic}.
        emoji_re = re.compile(
            "["
            "\U0001f1e6-\U0001f1ff"  # flags
            "\U0001f300-\U0001f5ff"  # symbols & pictographs
            "\U0001f600-\U0001f64f"  # emoticons
            "\U0001f680-\U0001f6ff"  # transport & map
            "\U0001f700-\U0001f77f"  # alchemical
            "\U0001f780-\U0001f7ff"  # geometric extended
            "\U0001f800-\U0001f8ff"  # arrows supplemental
            "\U0001f900-\U0001f9ff"  # supplemental symbols and pictographs
            "\U0001fa00-\U0001fa6f"  # chess etc.
            "\U0001fa70-\U0001faff"  # symbols and pictographs extended-A
            "\U00002600-\U000026ff"  # misc symbols
            "\U00002700-\U000027bf"  # dingbats
            "\U0001f3fb-\U0001f3ff"  # skin tone
            "\u200d\ufe0f"  # ZWJ, VS16
            "*"
            "]+",
            flags=re.UNICODE,
        )
        cleaned = emoji_re.sub("", text).replace("\n", " ")
        return cleaned

    async def generate_response(
        self,
        text: str,
        system_instruction: Optional[str] = None,
        messages: Optional[
            List[Tuple[Literal["user", "assistant"], str]]
        ] = None,
        request_kind: Literal[
            "default",
            "chat",
            "report",
            "memory",
        ] = "default",
    ) -> str:
        """Generate a single response text."""

        resolved_system_instruction = self._resolve_system_instruction(
            system_instruction
        )
        contents = self._build_contents(text=text, messages=messages)

        model = cast(Any, self.model)

        response = model.models.generate_content(
            model=self.model_name,
            config=self._build_config(
                system_instruction=resolved_system_instruction
            ),
            contents=contents,
        )
        if request_kind == "report":
            return response.text.replace("*", "")
        return self.strip_emojis(response.text)

    async def generate_response_with_image_uri(
        self,
        *,
        prompt: str,
        image_uri: str,
        system_instruction: Optional[str] = None,
    ) -> str:
        """Generate a response conditioned on an image URI."""
        if self.model is None or not self.model_name:
            return self.strip_emojis("테스트: 이미지 설명 결과 (LLM 결과)")

        resolved_system_instruction = self._resolve_system_instruction(
            system_instruction
        )

        # 1. MIME 타입 추론 (필수)
        mime_type, _ = mimetypes.guess_type(image_uri)
        if not mime_type:
            # S3 등의 URL은 확장자가 없을 수 있으므로 기본값 지정
            mime_type = "image/jpeg"

        model = cast(Any, self.model)

        # 2. types.Part.from_uri 사용 (mime_type 필수 지정)
        # google-genai 최신 버전에서는 mime_type을 명시하는 것이 안전합니다.
        try:
            image_part = types.Part.from_uri(
                file_uri=image_uri, mime_type=mime_type
            )
        except Exception:
            # 3. from_uri 실패 시 (지원하지 않는 URL 등) 직접 다운로드 후 바이트 전송
            def _download() -> bytes:
                # 타임아웃을 15초로 설정하여 무한 대기 방지
                with urllib.request.urlopen(image_uri, timeout=15) as resp:
                    return resp.read()

            data = await asyncio.to_thread(_download)
            image_part = types.Part.from_bytes(data=data, mime_type=mime_type)

        # 4. 컨텐츠 구성
        contents = [
            types.Content(
                role="user",
                parts=[
                    image_part,  # 이미지 먼저
                    types.Part.from_text(text=prompt),  # 텍스트 나중에
                ],
            )
        ]

        # 5. 요청 전송
        response = model.models.generate_content(
            model=self.model_name,
            config=self._build_config(
                system_instruction=resolved_system_instruction
            ),
            contents=contents,
        )
        return self.strip_emojis(response.text)

    async def embed_text(
        self,
        text: str,
        *,
        embedding_model: str = "gemini-embedding-001",
    ) -> List[float]:
        """Create embedding vector for the given text."""
        if self.model is None:
            raise RuntimeError("LLM client is not initialized")

        model = cast(Any, self.model)

        response = model.models.embed_content(
            model=embedding_model,
            contents=text,
        )

        embedding = getattr(response, "embedding", None)
        values = getattr(embedding, "values", None)
        if not isinstance(values, list) or not values:
            raise RuntimeError("Empty embedding")

        return [float(x) for x in values]


llm_service = LLMHandler()
