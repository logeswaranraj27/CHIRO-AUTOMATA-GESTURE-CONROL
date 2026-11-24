import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional, Set

from fastapi import Request
from starlette.responses import StreamingResponse

logger = logging.getLogger("chiro.sse")


class SSEManager:
    """Broadcasts bounded, non-blocking SSE events to connected clients."""

    def __init__(self) -> None:
        self._clients: Set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    @staticmethod
    def _format_event(payload: Dict[str, Any]) -> str:
        data = json.dumps(payload, default=str, ensure_ascii=False)
        return f"data: {data}\n\n"

    def broadcast(self, payload: Dict[str, Any]) -> None:
        """Schedule a broadcast safely from camera and other worker threads."""
        loop = self._loop
        if loop is None or not loop.is_running():
            return

        try:
            message = self._format_event(payload)
        except (TypeError, ValueError):
            logger.exception("Could not serialize SSE event")
            return

        try:
            loop.call_soon_threadsafe(self._broadcast_on_loop, message)
        except RuntimeError:
            logger.debug("SSE event dropped because the event loop is stopping")

    def _broadcast_on_loop(self, message: str) -> None:
        for client_queue in tuple(self._clients):
            if client_queue.full():
                try:
                    client_queue.get_nowait()
                    client_queue.task_done()
                except asyncio.QueueEmpty:
                    pass
            try:
                client_queue.put_nowait(message)
            except asyncio.QueueFull:
                logger.warning("Dropping SSE event for a full client queue")

    async def stream(
        self,
        request: Request,
        initial_payload: Optional[Dict[str, Any]] = None,
    ) -> StreamingResponse:
        client_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._clients.add(client_queue)

        if initial_payload is not None:
            client_queue.put_nowait(self._format_event(initial_payload))

        async def event_generator():
            try:
                while True:
                    try:
                        message = await asyncio.wait_for(client_queue.get(), timeout=15)
                    except asyncio.TimeoutError:
                        heartbeat = {
                            "type": "HEARTBEAT",
                            "timestamp": time.time(),
                        }
                        yield self._format_event(heartbeat)
                    else:
                        try:
                            yield message
                        finally:
                            client_queue.task_done()
            except asyncio.CancelledError:
                raise
            finally:
                self._clients.discard(client_queue)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )


sse_manager = SSEManager()
