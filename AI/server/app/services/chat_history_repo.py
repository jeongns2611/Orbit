from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ChatHistoryRepository:
    """
    Temporary chat history repository.

    - Always returns empty history.
    - Does not persist exchanges.

    This is useful when the client provides `history` explicitly and the server
    should treat missing/empty history as a new conversation.
    """

    def load_recent_by_device(
        self, *, device_id: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        return []

    def append_exchange(
        self, user_text: str, ai_text: str, *, device_id: str = "local"
    ) -> None:
        return None

    def load_all(
        self, *, device_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return []
