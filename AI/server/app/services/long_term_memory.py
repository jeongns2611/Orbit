from __future__ import annotations

"""Long-term memory service based on a vector database.

This module stores and retrieves conversational facts/preferences/constraints
into a ChromaDB collection and can augment an LLM system instruction.
"""

import json
import math
import random
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from app.services.llm_handler import LLMHandler
from app.utils.datetime_utils import now_iso_utc
from app.utils.json_utils import extract_first_json_object


def _server_root() -> Path:
    """Return server root directory (project-level)."""
    return Path(__file__).resolve().parents[2]


def _cache_root() -> Path:
    """Return cache root directory used by this service."""
    return _server_root() / ".cache"


def _stable_fallback_embedding(text: str, *, dim: int = 768) -> List[float]:
    """Create a deterministic pseudo-embedding for offline fallback."""
    seed = int.from_bytes(sha256(text.encode("utf-8")).digest()[:8], "big")
    rng = random.Random(seed)
    vec = [rng.uniform(-1.0, 1.0) for _ in range(dim)]
    norm = math.sqrt(sum(x * x for x in vec))
    if norm <= 0:
        return vec
    return [x / norm for x in vec]


def _extract_first_json(text: str) -> Optional[Dict[str, Any]]:
    """Extract the first JSON object from a text response."""
    return extract_first_json_object(text)


def _normalize_memory_item(text: str) -> str:
    """Normalize a memory item string."""
    cleaned = text.strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _memory_id(*, device_id: str, kind: str, text: str) -> str:
    """Create a stable ID for a memory item."""
    raw = f"{device_id}|{kind}|{_normalize_memory_item(text)}"
    return sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class RetrievedMemory:
    """A retrieved memory item from vector search."""

    text: str
    distance: float
    metadata: Dict[str, Any]

    @property
    def similarity(self) -> float:
        return 1.0 - float(self.distance)


class LongTermMemoryService:
    """Store and retrieve long-term memories using ChromaDB."""

    def __init__(
        self,
        *,
        persist_dir: Optional[Path] = None,
        collection_name: str = "long_term_memory",
    ) -> None:
        self.persist_dir = (
            persist_dir
            if persist_dir is not None
            else (_cache_root() / "chroma")
        )
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.collection = self.client.get_or_create_collection(
            name=collection_name, metadata={"hnsw:space": "cosine"}
        )
        self.state_path = _cache_root() / "memory_state.json"
        self.state_path.parent.mkdir(parents=True, exist_ok=True)

    async def embed_text(
        self, llm_service: LLMHandler, text: str
    ) -> List[float]:
        """Embed text via LLM service or deterministic fallback."""
        if hasattr(llm_service, "embed_text"):
            try:
                vec = await llm_service.embed_text(text)
                if (
                    isinstance(vec, list)
                    and vec
                    and all(isinstance(x, (int, float)) for x in vec)
                ):
                    return [float(x) for x in vec]
            except Exception:
                pass
        return _stable_fallback_embedding(text)

    async def rewrite_query(
        self, llm_service: LLMHandler, user_text: str
    ) -> str:
        """Rewrite user text into a short vector-search-friendly query."""
        prompt = (
            "너는 벡터DB 검색용 쿼리 재작성기다.\n"
            "입력 문장을 보고 검색에 유리한 짧은 키워드/구문으로 바꿔라.\n"
            "반드시 한 줄로만 출력하고, 따옴표/불필요한 설명은 금지한다.\n\n"
            f"입력: {user_text}\n"
            "출력:"
        )
        try:
            out = await llm_service.generate_response(prompt)
        except Exception:
            return user_text
        if isinstance(out, str) and out.strip():
            return out.strip().replace("\n", " ")[:300]
        return user_text

    async def retrieve(
        self,
        *,
        device_id: str,
        query_text: str,
        llm_service: LLMHandler,
        top_k: int = 3,
        threshold: float = 0.7,
    ) -> List[RetrievedMemory]:
        """Retrieve relevant memories from vector DB."""
        rewritten = await self.rewrite_query(llm_service, query_text)
        q_emb = await self.embed_text(llm_service, rewritten)

        where_primary = {"device_id": device_id}
        try:
            result = self.collection.query(
                query_embeddings=[q_emb],
                n_results=max(1, int(top_k)),
                where=where_primary,
                include=["documents", "metadatas", "distances"],
            )
        except Exception:
            return []

        docs = (result.get("documents") or [[]])[0]
        metas = (result.get("metadatas") or [[]])[0]
        dists = (result.get("distances") or [[]])[0]

        out: List[RetrievedMemory] = []
        max_distance = 1.0 - float(threshold)
        for doc, meta, dist in zip(docs, metas, dists):
            if not isinstance(doc, str) or not doc.strip():
                continue
            if not isinstance(dist, (int, float)):
                continue
            if float(dist) > max_distance:
                continue
            out.append(
                RetrievedMemory(
                    text=doc.strip(),
                    distance=float(dist),
                    metadata=meta if isinstance(meta, dict) else {},
                )
            )
        return out

    def format_memories(self, memories: List[RetrievedMemory]) -> str:
        """Format retrieved memories into a system-instruction block."""
        if not memories:
            return ""
        lines: List[str] = []
        lines.append("[장기기억]")
        for mem in memories:
            kind = mem.metadata.get("kind")
            prefix = ""
            if isinstance(kind, str) and kind:
                prefix = f"[{kind}] "
            lines.append(f"- {prefix}{mem.text}")
        return "\n".join(lines).strip()

    async def extract_and_store(
        self,
        *,
        device_id: str,
        llm_service: LLMHandler,
        recent_history: List[Dict[str, Any]],
        user_text: str,
        ai_text: str,
    ) -> None:
        """Extract long-term memory items from the *recent* context only.

        This supports the deployment constraint where the main backend only
        provides a short sliding window (e.g., last 5 turns).
        """
        user_lines: List[str] = []
        ai_lines: List[str] = []

        for item in recent_history[-5:]:
            if not isinstance(item, dict):
                continue
            u = item.get("user")
            a = item.get("ai")
            if isinstance(u, str) and u.strip():
                user_lines.append(f"아이: {u.strip()}")
            if isinstance(a, str) and a.strip():
                ai_lines.append(f"AI: {a.strip()}")

        if isinstance(user_text, str) and user_text.strip():
            user_lines.append(f"아이: {user_text.strip()}")
        if isinstance(ai_text, str) and ai_text.strip():
            ai_lines.append(f"AI: {ai_text.strip()}")

        user_conversation_text = "\n".join(user_lines).strip()
        ai_conversation_text = "\n".join(ai_lines).strip()
        if not user_conversation_text:
            return

        prompt = (
            "너는 대화에서 '장기기억으로 저장할 가치가 있는 사용자 정보'위주로 추출하는 도우미다.\n"
            "반드시 JSON 하나만 출력한다. 다른 텍스트/설명/마크다운 금지.\n\n"
            "JSON 스키마는 다음을 고정으로 따른다:\n"
            "{\n"
            '  "facts": ["..."],\n'
            '  "preferences": ["..."],\n'
            '  "constraints": ["..."]\n'
            "}\n\n"
            "규칙:\n"
            "- 반드시 '아이:' 라인에서만 추출한다.\n"
            "- 'AI:' 라인은 참고용 문맥이며, 그 내용을 사실/선호/금지로 저장하지 않는다.\n"
            "- facts: 변하지 않는 사실(이름/관계/상태/일정 등).\n"
            "- preferences: 좋아함/싫어함/선호.\n"
            "- constraints: 하면 안 되는 것/금지사항/주의사항.\n"
            "- 각 항목은 1문장, 짧고 구체적으로.\n"
            "- 추측/과장/인과 단정 금지. 대화에 없으면 넣지 말 것.\n"
            "- 아무것도 없으면 각 배열을 빈 배열로 둔다.\n\n"
            f"아이 발화(근거):\n{user_conversation_text}\n\n"
            f"AI 발화(참고 문맥):\n{ai_conversation_text}\n"
        )

        raw = await llm_service.generate_response(prompt)
        parsed = _extract_first_json(raw if isinstance(raw, str) else "")
        if parsed is None:
            return

        for kind in ("facts", "preferences", "constraints"):
            items = parsed.get(kind)
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, str):
                    continue
                text = _normalize_memory_item(item)
                if not text:
                    continue

                emb = await self.embed_text(llm_service, text)
                mid = _memory_id(device_id=device_id, kind=kind, text=text)
                metadata: Dict[str, Any] = {
                    "timestamp": now_iso_utc(),
                    "device_id": device_id,
                    "kind": kind,
                    "source": "extract_recent",
                }
                try:
                    self.collection.add(
                        ids=[mid],
                        documents=[text],
                        embeddings=[emb],
                        metadatas=[metadata],
                    )
                except Exception:
                    # likely duplicate id or transient storage issue
                    continue

    async def build_system_instruction(
        self,
        *,
        base_system_instruction: str,
        device_id: str,
        user_text: str,
        llm_service: LLMHandler,
    ) -> str:
        """Augment base system instruction with retrieved long-term memories."""
        memories = await self.retrieve(
            device_id=device_id,
            query_text=user_text,
            llm_service=llm_service,
        )
        block = self.format_memories(memories)
        if not block:
            return base_system_instruction
        return (base_system_instruction.strip() + "\n\n" + block).strip()


memory_service = LongTermMemoryService()
