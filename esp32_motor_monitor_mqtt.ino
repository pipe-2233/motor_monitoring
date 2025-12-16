#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <PZEM004Tv30.h>
#include "DHTesp.h"
#include <ArduinoJson.h>

// ================================
// CONFIGURACIÓN WIFI
// ================================
const char* ssid = "iPhone de Mayra";           // Cambia esto
const char* password = "may112233";   // Cambia esto

// ================================
// CONFIGURACIÓN MQTT (Test Mosquitto - público)
// ================================
const char* mqtt_server = "087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "motor_admin";
const char* mqtt_pass = "motor1234L";

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ================================
// DHT22
// ================================
#define DHT_PIN 12
DHTesp dht;
unsigned long lastDHT = 0;
const unsigned long DHT_INTERVAL = 5000;  // Publicar cada 5s (temperatura cambia lento)

// ================================
// PZEM-004T v3 (3 Sensores Trifásicos)
// Todos conectados al mismo UART (Serial2) con diferentes direcciones Modbus
// ================================
#define RXD2 16
#define TXD2 17

HardwareSerial pzemSerial(2);  // Usar UART2

// Constructores CORRECTOS
PZEM004Tv30 pzemA(pzemSerial, RXD2, TXD2, 0x01);  // Dirección 0x01
PZEM004Tv30 pzemB(pzemSerial, RXD2, TXD2, 0x02);  // Dirección 0x02
PZEM004Tv30 pzemC(pzemSerial, RXD2, TXD2, 0x03);  // Dirección 0x03

unsigned long lastPZEM = 0;
const unsigned long PZEM_INTERVAL = 5000;  // Publicar cada 5s (evitar saturación)

// ================================
// SENSOR RPM
// ================================
#define SENSOR_RPM 35
#define PULSOS_POR_REV 1

volatile unsigned long pulsos = 0;
unsigned long tPrevRPM = 0;
float rpm = 0;

// ================================
// RELÉS (Control de Motor)
// ================================
#define RELAY_19 19   // normalmente energizado (STOP)
#define RELAY_23 23   // normalmente apagado (START)

unsigned long t19 = 0, t23 = 0;
bool activo19 = false;
bool activo23 = false;

// ================================
// VARIABLES GLOBALES
// ================================
unsigned long lastReconnect = 0;
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 1000;  // Publicar cada 1 segundo

// ================================
// INTERRUPCIÓN RPM
// ================================
void IRAM_ATTR contarPulsos() {
  pulsos++;
}

// ================================
// CALLBACK MQTT
// ================================
void callback(char* topic, byte* payload, unsigned int length) {
  String mensaje = "";
  for (int i = 0; i < length; i++) {
    mensaje += (char)payload[i];
  }
  
  Serial.print("📥 Mensaje recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(mensaje);

  // ===== CONTROL DE MOTOR =====
  String topicStr = String(topic);
  
  // START Motor - Encender relé 23 por 2s
  if (topicStr == "motor/control/start" && mensaje == "1") {
    if (!activo23) {
      digitalWrite(RELAY_23, HIGH);
      activo23 = true;
      t23 = millis();
      Serial.println("🟢 MOTOR START - Relé 23 ON (2s)");
      client.publish("motor/status", "starting");
    }
  }
  
  // STOP Motor - Apagar relé 19 por 2s
  else if (topicStr == "motor/control/stop" && mensaje == "0") {
    if (!activo19) {
      digitalWrite(RELAY_19, LOW);
      activo19 = true;
      t19 = millis();
      Serial.println("🔴 MOTOR STOP - Relé 19 OFF (2s)");
      client.publish("motor/status", "stopping");
    }
  }

  // ===== COMANDOS DE MANTENIMIENTO (Laboratorio) =====
  // Reiniciar energía acumulada
  else if (topicStr == "motor/maintenance/reset_energy") {
    pzemA.resetEnergy();
    pzemB.resetEnergy();
    pzemC.resetEnergy();
    Serial.println("⚡ Energía reseteada en todos los PZEM");
    client.publish("motor/maintenance/status", "energy_reset_ok");
  }
  
  // Test de vibración (simular lectura alta)
  else if (topicStr == "motor/maintenance/test_vibration") {
    // Publicar valor de prueba alto
    client.publish("motor/vibracion", "15.5");
    Serial.println("🔬 Test de vibración: 15.5 mm/s");
    client.publish("motor/maintenance/status", "vibration_test_ok");
  }
  
  // Test de temperatura (simular alta temperatura)
  else if (topicStr == "motor/maintenance/test_temperature") {
    client.publish("motor/temperatura", "85.0");
    Serial.println("🌡️ Test de temperatura: 85°C");
    client.publish("motor/maintenance/status", "temperature_test_ok");
  }
  
  // Calibrar sensores PZEM
  else if (topicStr == "motor/maintenance/calibrate") {
    Serial.println("🔧 Calibrando sensores PZEM...");
    // Los PZEM se auto-calibran, solo confirmamos
    delay(100);
    client.publish("motor/maintenance/status", "calibration_ok");
  }
}

// ================================
// SETUP WIFI
// ================================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("📡 Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi conectado");
    Serial.print("📍 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ Error: No se pudo conectar a WiFi");
  }
}

// ================================
// RECONECTAR MQTT
// ================================
void reconnect() {
  if (millis() - lastReconnect < 3000) return;  // Intentar cada 3s (más rápido)
  lastReconnect = millis();

  // VERIFICAR WIFI PRIMERO
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado! Reconectando...");
    setup_wifi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("❌ No se pudo reconectar WiFi. Abortando intento MQTT.");
      return;
    }
  }

  Serial.println();
  Serial.println("========================================");
  Serial.print("🔄 Intentando conexión MQTT a: ");
  Serial.println(mqtt_server);
  Serial.print("📡 Puerto: ");
  Serial.println(mqtt_port);
  
  String clientId = "ESP32_Motor_" + String(random(0xffff), HEX);
  Serial.print("🆔 Client ID: ");
  Serial.println(clientId);
  
  Serial.println("🔐 Conectando a HiveMQ Cloud...");
  Serial.print("📶 WiFi RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("🌐 IP Local: ");
  Serial.println(WiFi.localIP());
  
  espClient.setInsecure();  // Acepta cualquier certificado SSL
  bool conectado = client.connect(clientId.c_str(), mqtt_user, mqtt_pass);
  
  if (conectado) {
    Serial.println("✅ ¡MQTT CONECTADO EXITOSAMENTE!");
    Serial.println("========================================");
    
    // Suscribirse a topics de control con QoS 1 (prioridad alta)
    client.subscribe("motor/control/start", 1);
    client.subscribe("motor/control/stop", 1);
    client.subscribe("motor/maintenance/#", 0);  // Todos los comandos de mantenimiento
    
    Serial.println("📨 Suscrito a topics:");
    Serial.println("  - motor/control/start");
    Serial.println("  - motor/control/stop");
    Serial.println("  - motor/maintenance/#");
    
    // Publicar estado inicial
    client.publish("motor/status", "connected");
    Serial.println("✉️ Estado publicado: connected");
    
  } else {
    Serial.print("❌ ERROR DE CONEXIÓN, código: ");
    int rc = client.state();
    Serial.print(rc);
    Serial.print(" - ");
    
    // Explicar códigos de error
    switch(rc) {
      case -4: Serial.println("Timeout en conexión"); break;
      case -3: Serial.println("Conexión perdida"); break;
      case -2: Serial.println("Falló conexión de red"); break;
      case -1: Serial.println("Cliente desconectado"); break;
      case 1: Serial.println("Versión de protocolo incorrecta"); break;
      case 2: Serial.println("ID de cliente rechazado"); break;
      case 3: Serial.println("Servidor no disponible"); break;
      case 4: Serial.println("Credenciales incorrectas"); break;
      case 5: Serial.println("No autorizado"); break;
      default: Serial.println("Error desconocido"); break;
    }
    Serial.println("========================================");
  }
}

// ================================
// SETUP
// ================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("🚀 Sistema de Monitoreo de Motor");
  Serial.println("=================================\n");

  // WiFi
  setup_wifi();

  // MQTT (Optimizado para estabilidad)
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(2048);  // Buffer muy grande
  client.setKeepAlive(60);  // Keepalive cada 60s
  client.setSocketTimeout(20);  // Timeout de 20s

  // Relés
  pinMode(RELAY_19, OUTPUT);
  pinMode(RELAY_23, OUTPUT);
  digitalWrite(RELAY_19, HIGH);  // normalmente energizado
  digitalWrite(RELAY_23, LOW);   // normalmente apagado
  Serial.println("⚡ Relés inicializados");

  // Sensor RPM
  pinMode(SENSOR_RPM, INPUT);
  attachInterrupt(digitalPinToInterrupt(SENSOR_RPM), contarPulsos, RISING);
  tPrevRPM = millis();
  Serial.println("🔄 Sensor RPM configurado");

  // DHT22
  dht.setup(DHT_PIN, DHTesp::DHT22);
  Serial.println("🌡️ DHT22 configurado");

  // PZEM-004T (Inicializar UART2)
  Serial.println("⚡ Inicializando PZEM-004T...");
  pzemSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);  // Iniciar puerto serial
  delay(1000);  // Esperar estabilización
  
  Serial.println("✅ Sistema listo!\n");
}

// ================================
// LEER Y PUBLICAR PZEM (TRIFÁSICO) - JSON
// ================================
void publicarPZEM() {
  unsigned long now = millis();
  if (now - lastPZEM < PZEM_INTERVAL) return;
  lastPZEM = now;

  StaticJsonDocument<256> doc;
  char jsonBuffer[256];

  // ===== FASE A =====
  float voltA = pzemA.voltage();
  float corrA = pzemA.current();
  float potA = pzemA.power();
  float energA = pzemA.energy();
  float freqA = pzemA.frequency();
  float pfA = pzemA.pf();

  if (!isnan(voltA) && voltA > 0) {
    doc.clear();
    doc["voltaje"] = round(voltA * 100) / 100.0;
    doc["corriente"] = round(corrA * 100) / 100.0;
    doc["potencia"] = round(potA * 100) / 100.0;
    doc["energia"] = round(energA * 1000) / 1000.0;
    doc["frecuencia"] = round(freqA * 100) / 100.0;
    doc["factor_potencia"] = round(pfA * 100) / 100.0;
    
    serializeJson(doc, jsonBuffer);
    client.publish("motor/fase_a", jsonBuffer);
    
    Serial.print("📊 Fase A - V:");
    Serial.print(voltA);
    Serial.print("V | I:");
    Serial.print(corrA);
    Serial.print("A | P:");
    Serial.print(potA);
    Serial.println("W");
  }
  
  client.loop(); // Mantener conexión
  delay(50);

  // ===== FASE B =====
  float voltB = pzemB.voltage();
  float corrB = pzemB.current();
  float potB = pzemB.power();
  float energB = pzemB.energy();
  float freqB = pzemB.frequency();
  float pfB = pzemB.pf();

  if (!isnan(voltB) && voltB > 0) {
    doc.clear();
    doc["voltaje"] = round(voltB * 100) / 100.0;
    doc["corriente"] = round(corrB * 100) / 100.0;
    doc["potencia"] = round(potB * 100) / 100.0;
    doc["energia"] = round(energB * 1000) / 1000.0;
    doc["frecuencia"] = round(freqB * 100) / 100.0;
    doc["factor_potencia"] = round(pfB * 100) / 100.0;
    
    serializeJson(doc, jsonBuffer);
    client.publish("motor/fase_b", jsonBuffer);
    
    Serial.print("📊 Fase B - V:");
    Serial.print(voltB);
    Serial.print("V | I:");
    Serial.print(corrB);
    Serial.print("A | P:");
    Serial.print(potB);
    Serial.println("W");
  }
  
  client.loop(); // Mantener conexión
  delay(50);

  // ===== FASE C =====
  float voltC = pzemC.voltage();
  float corrC = pzemC.current();
  float potC = pzemC.power();
  float energC = pzemC.energy();
  float freqC = pzemC.frequency();
  float pfC = pzemC.pf();

  if (!isnan(voltC) && voltC > 0) {
    doc.clear();
    doc["voltaje"] = round(voltC * 100) / 100.0;
    doc["corriente"] = round(corrC * 100) / 100.0;
    doc["potencia"] = round(potC * 100) / 100.0;
    doc["energia"] = round(energC * 1000) / 1000.0;
    doc["frecuencia"] = round(freqC * 100) / 100.0;
    doc["factor_potencia"] = round(pfC * 100) / 100.0;
    
    serializeJson(doc, jsonBuffer);
    client.publish("motor/fase_c", jsonBuffer);
    
    Serial.print("📊 Fase C - V:");
    Serial.print(voltC);
    Serial.print("V | I:");
    Serial.print(corrC);
    Serial.print("A | P:");
    Serial.print(potC);
    Serial.println("W");
  }
}

// ================================
// LOOP
// ================================
void loop() {
  // Comando de reinicio desde Serial Monitor
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'r' || cmd == 'R') {
      Serial.println();
      Serial.println("⚠️ REINICIANDO ESP32...");
      delay(500);
      ESP.restart();
    }
  }
  
  // Mantener conexión MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();

  // ===== TEMPORIZACIÓN RELÉS =====
  if (activo19 && now - t19 >= 2000) {
    digitalWrite(RELAY_19, HIGH);
    activo19 = false;
    Serial.println("✅ Relé 19 ON (motor corriendo)");
    client.publish("motor/status", "running");
  }

  if (activo23 && now - t23 >= 2000) {
    digitalWrite(RELAY_23, LOW);
    activo23 = false;
    Serial.println("✅ Relé 23 OFF (motor encendido)");
    client.publish("motor/status", "running");
  }

  // ===== RPM =====
  if (now - tPrevRPM >= 1000) {
    noInterrupts();
    unsigned long p = pulsos;
    pulsos = 0;
    interrupts();

    if (p == 0) rpm = 0.0f;
    else rpm = (p * 60.0f) / PULSOS_POR_REV;

    char buffer[10];
    dtostrf(rpm, 6, 2, buffer);
    client.publish("motor/rpm", buffer);

    Serial.print("🔄 RPM: ");
    Serial.println(rpm, 2);

    tPrevRPM = now;
  }

  // ===== DHT22 (Temperatura y Humedad) =====
  if (now - lastDHT >= DHT_INTERVAL) {
    lastDHT = now;

    float temp = dht.getTemperature();
    float hum = dht.getHumidity();

    if (!isnan(temp)) {
      char buffer[10];
      
      dtostrf(temp, 5, 2, buffer);
      client.publish("motor/temperatura", buffer);
      
      dtostrf(hum, 5, 2, buffer);
      client.publish("motor/humedad", buffer);

      Serial.print("🌡️ Temp: ");
      Serial.print(temp);
      Serial.print("°C | Hum: ");
      Serial.print(hum);
      Serial.println("%");
    } else {
      Serial.println("⚠️ Error DHT22");
    }
  }

  // ===== PZEM (Sensores Trifásicos) =====
  publicarPZEM();
  
  // Mantener conexión viva después de publicar
  client.loop();

  // Pequeño delay para no saturar el loop
  delay(50);  // 50ms es suficiente
}
