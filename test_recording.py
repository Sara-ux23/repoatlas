import asyncio
import sys
sys.path.append('backend')

async def test():
    from app.services.video_recorder import video_recorder
    try:
        result = await video_recorder.record_repo_walkthrough('test123', 'http://localhost:3001')
        print(f'SUCCESS: {result}')
    except Exception as e:
        import traceback
        print(f'FAILED: {e}')
        traceback.print_exc()

asyncio.run(test())
