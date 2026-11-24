import asyncio
from unittest.mock import Mock

from backend.api.sse import SSEManager


def test_sse_manager_broadcasts_to_clients_and_cleans_up():
    manager = SSEManager()

    async def run():
        manager.set_loop(asyncio.get_running_loop())
        first_response = await manager.stream(Mock())
        second_response = await manager.stream(Mock())
        first_stream = first_response.body_iterator
        second_stream = second_response.body_iterator

        assert first_response.media_type == "text/event-stream"
        assert first_response.headers["cache-control"] == "no-cache"

        await asyncio.to_thread(
            manager.broadcast,
            {"type": "ENGINE_EVENT", "event": {"event_type": "TRANSITION"}},
        )
        first_message, second_message = await asyncio.wait_for(
            asyncio.gather(first_stream.__anext__(), second_stream.__anext__()),
            timeout=1,
        )

        assert '"type": "ENGINE_EVENT"' in first_message
        assert '"event_type": "TRANSITION"' in first_message
        assert first_message == second_message

        await first_stream.aclose()
        await second_stream.aclose()
        assert not manager._clients

    asyncio.run(run())
