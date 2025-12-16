import asyncio
from app.database import async_session_maker, ThresholdSettings
from sqlalchemy import delete

async def reset():
    async with async_session_maker() as session:
        # Eliminar todos los umbrales existentes
        await session.execute(delete(ThresholdSettings))
        await session.commit()
        print("✅ Umbrales eliminados de la base de datos")
        print("✅ Los nuevos valores por defecto se aplicarán automáticamente")

if __name__ == "__main__":
    asyncio.run(reset())
