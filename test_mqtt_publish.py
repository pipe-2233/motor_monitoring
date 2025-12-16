#!/usr/bin/env python3
"""
Script de prueba para publicar datos MQTT al broker HiveMQ Cloud
Publica valores de prueba para verificar la conexión
"""

import paho.mqtt.client as mqtt
import json
import time
import ssl

# Configuración MQTT (HiveMQ Cloud)
BROKER = "087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "motor_moni"
PASSWORD = "motor1234L"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Conectado al broker MQTT!")
        print(f"   Broker: {BROKER}")
        print(f"   Puerto: {PORT}")
    else:
        print(f"❌ Error de conexión. Código: {rc}")

def on_publish(client, userdata, mid):
    print(f"📤 Mensaje publicado (ID: {mid})")

def publicar_datos_prueba():
    """Publica datos de prueba en los topics del motor"""
    
    # Crear cliente MQTT
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    
    # Configurar TLS
    client.tls_set(cert_reqs=ssl.CERT_NONE, tls_version=ssl.PROTOCOL_TLS)
    client.tls_insecure_set(True)
    
    # Callbacks
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    try:
        print("\n🔌 Conectando al broker MQTT...")
        client.connect(BROKER, PORT, 60)
        client.loop_start()
        time.sleep(2)  # Esperar conexión
        
        # Datos de prueba
        print("\n📊 Publicando datos de prueba...\n")
        
        import random
        
        # Fase A - Valores aleatorios realistas
        voltaje_a = round(random.uniform(215, 225), 1)
        corriente_a = round(random.uniform(8, 12), 1)
        potencia_a = round(voltaje_a * corriente_a, 1)
        
        print(f"   Fase A:")
        client.publish("motor/fase_a/voltaje", str(voltaje_a))
        print(f"      - Voltaje: {voltaje_a}V")
        time.sleep(0.2)
        client.publish("motor/fase_a/corriente", str(corriente_a))
        print(f"      - Corriente: {corriente_a}A")
        time.sleep(0.2)
        client.publish("motor/fase_a/potencia", str(potencia_a))
        print(f"      - Potencia: {potencia_a}W")
        time.sleep(0.2)
        
        # Fase B
        voltaje_b = round(random.uniform(215, 225), 1)
        corriente_b = round(random.uniform(8, 12), 1)
        potencia_b = round(voltaje_b * corriente_b, 1)
        
        print(f"   Fase B:")
        client.publish("motor/fase_b/voltaje", str(voltaje_b))
        print(f"      - Voltaje: {voltaje_b}V")
        time.sleep(0.2)
        client.publish("motor/fase_b/corriente", str(corriente_b))
        print(f"      - Corriente: {corriente_b}A")
        time.sleep(0.2)
        client.publish("motor/fase_b/potencia", str(potencia_b))
        print(f"      - Potencia: {potencia_b}W")
        time.sleep(0.2)
        
        # Fase C
        voltaje_c = round(random.uniform(215, 225), 1)
        corriente_c = round(random.uniform(8, 12), 1)
        potencia_c = round(voltaje_c * corriente_c, 1)
        
        print(f"   Fase C:")
        client.publish("motor/fase_c/voltaje", str(voltaje_c))
        print(f"      - Voltaje: {voltaje_c}V")
        time.sleep(0.2)
        client.publish("motor/fase_c/corriente", str(corriente_c))
        print(f"      - Corriente: {corriente_c}A")
        time.sleep(0.2)
        client.publish("motor/fase_c/potencia", str(potencia_c))
        print(f"      - Potencia: {potencia_c}W")
        time.sleep(0.2)
        
        # Temperatura (variable entre 35-65°C)
        temperatura = round(random.uniform(35, 65), 1)
        client.publish("motor/temperatura", str(temperatura))
        print(f"   Temperatura: {temperatura}°C")
        time.sleep(0.2)
        
        # RPM (variable entre 1600-1900)
        rpm = random.randint(1600, 1900)
        client.publish("motor/rpm", str(rpm))
        print(f"   RPM: {rpm}")
        time.sleep(0.2)
        
        # Vibración (variable entre 2.0-8.0 mm/s)
        vibracion = round(random.uniform(2.0, 8.0), 1)
        client.publish("motor/vibracion", str(vibracion))
        print(f"   Vibración: {vibracion} mm/s")
        time.sleep(0.2)
        
        print("\n✅ Datos publicados correctamente!")
        print("   Revisa tu interfaz web en http://localhost:5413")
        
        time.sleep(2)
        client.loop_stop()
        client.disconnect()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("  MQTT TEST - Publicador de Datos de Prueba")
    print("=" * 60)
    publicar_datos_prueba()
    print("\n" + "=" * 60)
