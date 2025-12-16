#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <math.h>

// ================================
// CONFIGURACIÓN WIFI
// ================================
const char* ssid = "iPhone de Mayra";
const char* password = "may112233";

// ================================
// CONFIGURACIÓN MQTT
// ================================
const char* mqtt_server = "087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "motor_admin";
const char* mqtt_pass = "motor1234L";

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ================================
// LIS2DHTR - Acelerómetro
// ================================
#define LIS2DHTR_ADDR 0x19

// Registros
#define CTRL1    0x20
#define CTRL4    0x23
#define OUT_X_L  0x28

// Muestreo
#define SAMPLE_RATE 800
#define N_SAMPLES   400   // 0.5 s

// RPM fijo (ajusta según tu motor)
#define RPM_FIJO 4800
#define FREQ (RPM_FIJO / 60.0)

// HPF simple
float prevAz = 0;
float prevOut = 0;
#define HPF_ALPHA 0.90   // ≈ 10 Hz a 800 Hz

int16_t xRaw, yRaw, zRaw;

// Variables de vibración
float ARMS;
float APico;
float vibGeneral;  // Pico a pico
float VRMS;

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 1000;  // Publicar cada 1 segundo
unsigned long lastReconnect = 0;

// ================================
// FUNCIONES LIS2DHTR
// ================================
void writeRegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(LIS2DHTR_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

void readXYZ(int16_t &x, int16_t &y, int16_t &z) {
  Wire.beginTransmission(LIS2DHTR_ADDR);
  Wire.write(OUT_X_L | 0x80);
  Wire.endTransmission(false);
  Wire.requestFrom(LIS2DHTR_ADDR, 6, true);

  x = Wire.read() | (Wire.read() << 8);
  y = Wire.read() | (Wire.read() << 8);
  z = Wire.read() | (Wire.read() << 8);
}

float highPass(float input) {
  float output = HPF_ALPHA * (prevOut + input - prevAz);
  prevAz = input;
  prevOut = output;
  return output;
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
}

// ================================
// RECONECTAR MQTT
// ================================
void reconnect() {
  if (millis() - lastReconnect < 3000) return;
  lastReconnect = millis();

  // Verificar WiFi primero
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
  
  String clientId = "ESP32_Vibracion_" + String(random(0xffff), HEX);
  Serial.print("🆔 Client ID: ");
  Serial.println(clientId);
  
  Serial.println("🔐 Conectando a HiveMQ Cloud...");
  Serial.print("📶 WiFi RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  
  espClient.setInsecure();
  bool conectado = client.connect(clientId.c_str(), mqtt_user, mqtt_pass);
  
  if (conectado) {
    Serial.println("✅ ¡MQTT CONECTADO EXITOSAMENTE!");
    Serial.println("========================================");
    client.publish("motor/status", "vibration_sensor_connected");
  } else {
    Serial.print("❌ ERROR DE CONEXIÓN, código: ");
    Serial.println(client.state());
    Serial.println("========================================");
  }
}

// ================================
// MEDIR VIBRACIÓN
// ================================
void medirVibracion() {
  float sumSq = 0;
  APico = 0;

  for (int i = 0; i < N_SAMPLES; i++) {
    readXYZ(xRaw, yRaw, zRaw);

    // ±16g HR → 0.000732 g/LSB
    float az = zRaw * 0.000732;

    // Filtro pasa-altos (quita gravedad y baja frecuencia)
    az = highPass(az);

    sumSq += az * az;
    APico = max(APico, abs(az));

    delayMicroseconds(1000000 / SAMPLE_RATE);
  }

  // Aceleración RMS
  ARMS = sqrt(sumSq / N_SAMPLES);

  // Pico a pico
  vibGeneral = 2.0 * APico;

  // Conversión ISO 10816 → Velocidad RMS (mm/s)
  VRMS = (ARMS * 9806.65) / (2.0 * PI * FREQ);
}

// ================================
// PUBLICAR DATOS
// ================================
void publicarDatos() {
  char buffer[10];
  
  // Vibración RMS (mm/s) - Topic principal
  dtostrf(VRMS, 6, 2, buffer);
  client.publish("motor/vibracion", buffer);
  
  // ARMS (g) - Aceleración RMS
  dtostrf(ARMS, 6, 4, buffer);
  client.publish("motor/vibracion/arms", buffer);
  
  // APico (g) - Aceleración Pico
  dtostrf(APico, 6, 4, buffer);
  client.publish("motor/vibracion/apico", buffer);
  
  // Pico a Pico (g)
  dtostrf(vibGeneral, 6, 4, buffer);
  client.publish("motor/vibracion/pico_pico", buffer);
  
  Serial.println("---- LIS2DHTR ISO 10816 ----");
  Serial.print("VRMS (mm/s): ");
  Serial.println(VRMS, 2);
  Serial.print("ARMS (g): ");
  Serial.println(ARMS, 4);
  Serial.print("APico (g): ");
  Serial.println(APico, 4);
  Serial.print("Pico a Pico (g): ");
  Serial.println(vibGeneral, 4);
  Serial.println("---------------------------");
}

// ================================
// SETUP
// ================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("🔬 Sensor de Vibración LIS2DHTR");
  Serial.println("=================================\n");

  // WiFi
  setup_wifi();

  // MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setKeepAlive(60);
  client.setSocketTimeout(20);

  // I2C (SDA=21, SCL=22)
  Wire.begin(21, 22);
  delay(100);

  // Configurar LIS2DHTR
  Serial.println("⚙️ Configurando LIS2DHTR...");
  
  // 800 Hz, XYZ ON
  writeRegister(CTRL1, 0x97);
  
  // ±16g, High Resolution
  writeRegister(CTRL4, 0x38);
  
  Serial.println("✅ LIS2DHTR configurado (800 Hz, ±16g)");
  Serial.println("📊 RPM configurado: 4800");
  Serial.println("✅ Sistema listo!\n");
}

// ================================
// LOOP
// ================================
void loop() {
  // Comando de reinicio
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'r' || cmd == 'R') {
      Serial.println("\n⚠️ REINICIANDO ESP32...");
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
  
  // Medir y publicar cada segundo
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    
    // Medir vibración (toma ~0.5s)
    medirVibracion();
    
    // Publicar por MQTT
    if (client.connected()) {
      publicarDatos();
    }
  }
  
  delay(10);
}
