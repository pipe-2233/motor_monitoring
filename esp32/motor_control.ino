/*
 * Control de Motor Trifásico con ESP32
 * Relés para control de encendido/apagado vía MQTT
 * 
 * PIN 23: Relé START - Normalmente Abierto (pulso para encender)
 * PIN 19: Relé STOP - Normalmente Cerrado (energizado por defecto, desenergiza para apagar)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ===== CONFIGURACIÓN WIFI =====
const char* ssid = "univalle";
const char* password = "Univalle";

// ===== CONFIGURACIÓN MQTT =====
const char* mqtt_server = "087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "motor_moni";
const char* mqtt_password = "motor1234L";
const char* mqtt_client_id = "ESP32_Motor_Control";

// Topics MQTT
const char* topic_start = "motor/control/start";
const char* topic_stop = "motor/control/stop";

// ===== CONFIGURACIÓN DE PINES =====
const int PIN_RELE_START = 23;  // Relé START (NO - pulso)
const int PIN_RELE_STOP = 19;   // Relé STOP (NC - energizado normalmente)

// ===== VARIABLES GLOBALES =====
WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastReconnectAttempt = 0;
bool motorRunning = false;

// ===== FUNCIÓN: SETUP INICIAL =====
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n🚀 Iniciando ESP32 - Control de Motor");
  
  // Configurar pines
  pinMode(PIN_RELE_START, OUTPUT);
  pinMode(PIN_RELE_STOP, OUTPUT);
  
  // Estado inicial de los relés
  digitalWrite(PIN_RELE_START, LOW);   // START apagado (NO)
  digitalWrite(PIN_RELE_STOP, HIGH);   // STOP energizado (NC - motor puede arrancar)
  
  Serial.println("✅ Pines configurados:");
  Serial.println("   - PIN 23 (START): Normalmente Abierto (LOW)");
  Serial.println("   - PIN 19 (STOP): Energizado (HIGH) - Motor habilitado");
  
  // Conectar WiFi
  setup_wifi();
  
  // Configurar TLS (sin verificación de certificado)
  espClient.setInsecure();
  
  // Configurar MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqtt_callback);
  
  Serial.println("✅ Configuración completa (TLS habilitado)\n");
}

// ===== FUNCIÓN: CONECTAR WIFI =====
void setup_wifi() {
  delay(10);
  Serial.println("\n🌐 Conectando a WiFi...");
  Serial.print("   Red: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Señal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ Error: No se pudo conectar a WiFi");
    Serial.println("   Reiniciando en 5 segundos...");
    delay(5000);
    ESP.restart();
  }
}

// ===== FUNCIÓN: RECONECTAR MQTT =====
boolean reconnect() {
  if (client.connect(mqtt_client_id, mqtt_user, mqtt_password)) {
    Serial.println("✅ MQTT conectado!");
    
    // Suscribirse a topics de control
    client.subscribe(topic_start);
    client.subscribe(topic_stop);
    
    Serial.println("📥 Suscrito a topics:");
    Serial.print("   - ");
    Serial.println(topic_start);
    Serial.print("   - ");
    Serial.println(topic_stop);
    
    return true;
  }
  return false;
}

// ===== FUNCIÓN: CALLBACK MQTT =====
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  // Convertir payload a string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("\n📨 Mensaje recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);
  
  // Procesar comando START
  if (strcmp(topic, topic_start) == 0) {
    if (message == "1") {
      encenderMotor();
    }
  }
  
  // Procesar comando STOP
  else if (strcmp(topic, topic_stop) == 0) {
    if (message == "0") {
      apagarMotor();
    }
  }
}

// ===== FUNCIÓN: ENCENDER MOTOR =====
void encenderMotor() {
  Serial.println("\n▶️ ENCENDIENDO MOTOR...");
  
  // Pulso en relé START (simula presionar botón)
  digitalWrite(PIN_RELE_START, HIGH);
  Serial.println("   ⚡ Relé START activado");
  delay(500);  // Pulso de 500ms
  digitalWrite(PIN_RELE_START, LOW);
  Serial.println("   ⚡ Relé START desactivado");
  
  motorRunning = true;
  Serial.println("✅ Motor encendido");
}

// ===== FUNCIÓN: APAGAR MOTOR =====
void apagarMotor() {
  Serial.println("\n🛑 APAGANDO MOTOR...");
  
  // Desenergizar relé STOP (abre el circuito NC)
  digitalWrite(PIN_RELE_STOP, LOW);
  Serial.println("   ⚡ Relé STOP desenergizado");
  delay(1000);  // Mantener desenergizado 1 segundo
  
  // Volver a energizar (restablecer estado normal)
  digitalWrite(PIN_RELE_STOP, HIGH);
  Serial.println("   ⚡ Relé STOP energizado (restaurado)");
  
  motorRunning = false;
  Serial.println("✅ Motor apagado");
}

// ===== LOOP PRINCIPAL =====
void loop() {
  // Mantener conexión MQTT
  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      Serial.println("\n🔄 Reconectando MQTT...");
      if (reconnect()) {
        lastReconnectAttempt = 0;
      } else {
        Serial.print("❌ Falló reconexión MQTT. Estado: ");
        Serial.println(client.state());
      }
    }
  } else {
    client.loop();
  }
  
  // Mantener conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n⚠️ WiFi desconectado. Reconectando...");
    setup_wifi();
  }
  
  delay(10);
}
