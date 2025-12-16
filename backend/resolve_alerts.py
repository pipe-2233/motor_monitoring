"""Script para resolver todas las alertas acumuladas"""
import requests

try:
    response = requests.post('http://localhost:8000/api/alerts/resolve-all')
    if response.status_code == 200:
        data = response.json()
        print(f"✅ {data['message']}")
        print(f"   Total resueltas: {data['count']}")
    else:
        print(f"❌ Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"❌ Error al conectar: {e}")
