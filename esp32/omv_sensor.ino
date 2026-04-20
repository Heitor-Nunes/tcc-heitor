/*
  Estacionamento OMV — ESP32 Sensor
  ───────────────────────────────────
  Para cada vaga monitorada, conecta um sensor HC-SR04 (ultrassônico)
  ou sensor IR ao pino definido abaixo.
  Quando detecta presença, envia POST /api/spots/sensor para o backend.

  Bibliotecas necessárias (instale pelo Library Manager do Arduino IDE):
    - WiFi.h        (já inclusa no pacote ESP32)
    - HTTPClient.h  (já inclusa no pacote ESP32)
    - ArduinoJson   (instale: "ArduinoJson" by Benoit Blanchon)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── Configurações — EDITE AQUI ───────────────────────────
const char* WIFI_SSID     = "NOME_DA_SUA_REDE";
const char* WIFI_PASSWORD = "SENHA_DA_REDE";

// URL do seu backend (substitua pelo IP/domínio real em produção)
const char* BACKEND_URL = "http://192.168.1.100:5000/api/spots/sensor";
// Se publicar na internet ficará tipo: "https://omv-backend.onrender.com/api/spots/sensor"

// ── Definição das vagas monitoradas ─────────────────────
// Cada struct representa 1 sensor ligado a 1 vaga
// pinTrig / pinEcho = pinos do HC-SR04
// spotNumber        = número da vaga no sistema (1 a 20)
struct SpotSensor {
  int spotNumber;
  int pinTrig;
  int pinEcho;
  bool lastState; // estado anterior (para evitar envios repetidos)
};

// Ajuste os pinos conforme a sua maquete
SpotSensor sensors[] = {
  { 1,  5,  18, false },
  { 2,  19, 21, false },
  { 3,  22, 23, false },
  // Adicione mais conforme necessário...
};

const int NUM_SENSORS    = sizeof(sensors) / sizeof(sensors[0]);
const int TRIGGER_DIST_CM = 15; // Distância em cm abaixo da qual considera "ocupado"
const unsigned long SEND_INTERVAL = 2000; // ms entre leituras
unsigned long lastCheck = 0;

// ── Funções ──────────────────────────────────────────────
long readDistanceCM(int pinTrig, int pinEcho) {
  digitalWrite(pinTrig, LOW);
  delayMicroseconds(2);
  digitalWrite(pinTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pinTrig, LOW);
  long duration = pulseIn(pinEcho, HIGH, 30000); // timeout 30ms
  return duration * 0.034 / 2;
}

void sendSensorUpdate(int spotNumber, bool occupied) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Tentando reconectar...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["spotNumber"] = spotNumber;
  doc["occupied"]   = occupied;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200) {
    Serial.printf("✅ Vaga %d → %s (HTTP %d)\n", spotNumber, occupied ? "OCUPADA" : "LIVRE", code);
  } else {
    Serial.printf("❌ Erro ao atualizar vaga %d (HTTP %d)\n", spotNumber, code);
  }
  http.end();
}

// ── Setup ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NUM_SENSORS; i++) {
    pinMode(sensors[i].pinTrig, OUTPUT);
    pinMode(sensors[i].pinEcho, INPUT);
  }

  Serial.print("Conectando ao WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n✅ WiFi conectado! IP: %s\n", WiFi.localIP().toString().c_str());
}

// ── Loop ──────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastCheck < SEND_INTERVAL) return;
  lastCheck = now;

  for (int i = 0; i < NUM_SENSORS; i++) {
    long dist    = readDistanceCM(sensors[i].pinTrig, sensors[i].pinEcho);
    bool occupied = (dist > 0 && dist < TRIGGER_DIST_CM);

    // Só envia ao backend se o estado mudou (evita flood de requisições)
    if (occupied != sensors[i].lastState) {
      sendSensorUpdate(sensors[i].spotNumber, occupied);
      sensors[i].lastState = occupied;
    }
  }
}
