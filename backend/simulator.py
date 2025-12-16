"""
Simulador de datos de motor para pruebas
Envía datos aleatorios a shiftr.io
"""
import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# Configuración MQTT (shiftr.io)
BROKER = "valiantfish479.cloud.shiftr.io"
PORT = 1883
USERNAME = "valiantfish479"
PASSWORD = "HGdy7HvPWCBVXnwS"

# Topics (formato backend - JSON completo por fase)
TOPICS = {
    "phase_a": "motor/phase_a",
    "phase_b": "motor/phase_b",
    "phase_c": "motor/phase_c",
    "metrics": "motor/motor_metrics",
    # Topics individuales para frontend
    "fase_a": {
        "voltaje": "motor/fase_a/voltaje",
        "corriente": "motor/fase_a/corriente",
        "potencia": "motor/fase_a/potencia",
        "energia": "motor/fase_a/energia",
        "frecuencia": "motor/fase_a/frecuencia",
        "factor_potencia": "motor/fase_a/factor_potencia"
    },
    "fase_b": {
        "voltaje": "motor/fase_b/voltaje",
        "corriente": "motor/fase_b/corriente",
        "potencia": "motor/fase_b/potencia",
        "energia": "motor/fase_b/energia",
        "frecuencia": "motor/fase_b/frecuencia",
        "factor_potencia": "motor/fase_b/factor_potencia"
    },
    "fase_c": {
        "voltaje": "motor/fase_c/voltaje",
        "corriente": "motor/fase_c/corriente",
        "potencia": "motor/fase_c/potencia",
        "energia": "motor/fase_c/energia",
        "frecuencia": "motor/fase_c/frecuencia",
        "factor_potencia": "motor/fase_c/factor_potencia"
    },
    "general": {
        "temperatura": "motor/temperatura",
        "rpm": "motor/rpm",
        "vibracion": "motor/vibracion"
    }
}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Conectado a shiftr.io")
        print("📡 Enviando datos de prueba...")
    else:
        print(f"❌ Error de conexión: {rc}")

def generate_phase_data(phase_name):
    """Genera datos aleatorios para una fase"""
    return {
        "voltage": round(random.uniform(215, 225), 2),
        "current": round(random.uniform(8, 12), 2),
        "power": round(random.uniform(1800, 2200), 2),
        "energy": round(random.uniform(100, 150), 2),
        "frequency": round(random.uniform(59.5, 60.5), 2),
        "power_factor": round(random.uniform(0.85, 0.95), 2),
        "timestamp": datetime.now().isoformat()
    }

def generate_motor_metrics():
    """Genera métricas generales del motor"""
    return {
        "temperature": round(random.uniform(45, 65), 2),
        "rpm": round(random.uniform(1700, 1800), 2),
        "vibration": round(random.uniform(3, 6), 2),
        "timestamp": datetime.now().isoformat()
    }

def generate_complete_reading():
    """Genera una lectura completa con todas las fases y métricas"""
    phase_a = generate_phase_data("A")
    phase_b = generate_phase_data("B")
    phase_c = generate_phase_data("C")
    metrics = generate_motor_metrics()
    
    return {
        "complete_reading": True,
        "voltage_a": phase_a['voltage'],
        "current_a": phase_a['current'],
        "power_a": phase_a['power'],
        "energy_a": phase_a['energy'],
        "frequency_a": phase_a['frequency'],
        "pf_a": phase_a['power_factor'],
        "voltage_b": phase_b['voltage'],
        "current_b": phase_b['current'],
        "power_b": phase_b['power'],
        "energy_b": phase_b['energy'],
        "frequency_b": phase_b['frequency'],
        "pf_b": phase_b['power_factor'],
        "voltage_c": phase_c['voltage'],
        "current_c": phase_c['current'],
        "power_c": phase_c['power'],
        "energy_c": phase_c['energy'],
        "frequency_c": phase_c['frequency'],
        "pf_c": phase_c['power_factor'],
        "temperature": metrics['temperature'],
        "rpm": metrics['rpm'],
        "vibration": metrics['vibration'],
        "timestamp": datetime.now().isoformat()
    }

def main():
    # Crear cliente MQTT
    client = mqtt.Client(client_id="motor_simulator")
    client.username_pw_set(USERNAME, PASSWORD)
    client.on_connect = on_connect
    
    # Conectar
    try:
        client.connect(BROKER, PORT, 60)
        client.loop_start()
        time.sleep(2)  # Esperar conexión
        
        print("\n🔄 Enviando datos cada 2 segundos...")
        print("Presiona Ctrl+C para detener\n")
        
        count = 0
        while True:
            count += 1
            
            # Generar datos individuales para frontend
            data_a = generate_phase_data("A")
            data_b = generate_phase_data("B")
            data_c = generate_phase_data("C")
            metrics = generate_motor_metrics()
            
            # 1. Enviar lectura COMPLETA para BACKEND (procesa ML, guarda BD, checa umbrales)
            complete = generate_complete_reading()
            client.publish(TOPICS["phase_a"], json.dumps(complete))
            
            # 2. También enviar JSON por fase (compatibilidad)
            client.publish(TOPICS["phase_b"], json.dumps(data_b))
            client.publish(TOPICS["phase_c"], json.dumps(data_c))
            client.publish(TOPICS["metrics"], json.dumps(metrics))
            
            # 3. Enviar valores individuales para FRONTEND (actualiza interfaz en tiempo real)
            # Fase A
            client.publish(TOPICS["fase_a"]["voltaje"], str(data_a['voltage']))
            client.publish(TOPICS["fase_a"]["corriente"], str(data_a['current']))
            client.publish(TOPICS["fase_a"]["potencia"], str(data_a['power']))
            client.publish(TOPICS["fase_a"]["energia"], str(data_a['energy']))
            client.publish(TOPICS["fase_a"]["frecuencia"], str(data_a['frequency']))
            client.publish(TOPICS["fase_a"]["factor_potencia"], str(data_a['power_factor']))
            
            # Fase B
            client.publish(TOPICS["fase_b"]["voltaje"], str(data_b['voltage']))
            client.publish(TOPICS["fase_b"]["corriente"], str(data_b['current']))
            client.publish(TOPICS["fase_b"]["potencia"], str(data_b['power']))
            client.publish(TOPICS["fase_b"]["energia"], str(data_b['energy']))
            client.publish(TOPICS["fase_b"]["frecuencia"], str(data_b['frequency']))
            client.publish(TOPICS["fase_b"]["factor_potencia"], str(data_b['power_factor']))
            
            # Fase C
            client.publish(TOPICS["fase_c"]["voltaje"], str(data_c['voltage']))
            client.publish(TOPICS["fase_c"]["corriente"], str(data_c['current']))
            client.publish(TOPICS["fase_c"]["potencia"], str(data_c['power']))
            client.publish(TOPICS["fase_c"]["energia"], str(data_c['energy']))
            client.publish(TOPICS["fase_c"]["frecuencia"], str(data_c['frequency']))
            client.publish(TOPICS["fase_c"]["factor_potencia"], str(data_c['power_factor']))
            
            # Métricas generales
            client.publish(TOPICS["general"]["temperatura"], str(metrics['temperature']))
            client.publish(TOPICS["general"]["rpm"], str(metrics['rpm']))
            client.publish(TOPICS["general"]["vibracion"], str(metrics['vibration']))
            
            print(f"📤 Fase A: {data_a['voltage']}V, {data_a['current']}A, {data_a['power']}W")
            print(f"📤 Fase B: {data_b['voltage']}V, {data_b['current']}A, {data_b['power']}W")
            print(f"📤 Fase C: {data_c['voltage']}V, {data_c['current']}A, {data_c['power']}W")
            print(f"📤 Motor: {metrics['temperature']}°C, {metrics['rpm']} RPM, {metrics['vibration']} mm/s")
            
            # Mostrar si hay anomalía detectada (simulación)
            if metrics['temperature'] > 60 or metrics['vibration'] > 8:
                print(f"⚠️  ANOMALÍA DETECTADA - Temp: {metrics['temperature']}°C, Vib: {metrics['vibration']} mm/s")
            
            print(f"✅ Lote #{count} enviado (25 mensajes + lectura completa con ML)\n")
            
            time.sleep(2)  # Esperar 2 segundos
            
    except KeyboardInterrupt:
        print("\n\n🛑 Simulador detenido")
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("🎮 SIMULADOR DE MOTOR - shiftr.io")
    print("=" * 50)
    main()
