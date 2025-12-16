import paho.mqtt.client as mqtt
import json
import asyncio
import ssl
from datetime import datetime, timedelta
from app.config import settings
from app.database import async_session_maker
from app.database import MotorReading, Alert, SystemLog, ThresholdSettings as ThresholdSettingsDB
from app.ml_detector import AnomalyDetector
from sqlalchemy import select, desc, and_

class MQTTHandler:
    def __init__(self):
        self.client = None
        self.connected = False
        self.ml_detector = AnomalyDetector()
        self.loop = None
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            print(f"Connected to MQTT broker: {settings.MQTT_BROKER}")
            self.connected = True
            # Subscribe to motor data topics
            topics = [
                f"{settings.MQTT_TOPIC_PREFIX}phase_a",
                f"{settings.MQTT_TOPIC_PREFIX}phase_b",
                f"{settings.MQTT_TOPIC_PREFIX}phase_c",
                f"{settings.MQTT_TOPIC_PREFIX}motor_metrics",
                f"{settings.MQTT_TOPIC_PREFIX}thresholds/update"  # Nuevo: recibir umbrales
            ]
            for topic in topics:
                client.subscribe(topic)
                print(f"Subscribed to {topic}")
        else:
            print(f"Failed to connect to MQTT broker. Return code: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        print(f"Disconnected from MQTT broker. Return code: {rc}")
        
    def on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic
            
            # Process message in event loop
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.process_message(topic, payload),
                    self.loop
                )
        except Exception as e:
            print(f"Error processing MQTT message: {e}")
    
    async def process_message(self, topic, payload):
        """Process incoming MQTT messages and store to database"""
        try:
            async with async_session_maker() as session:
                # Check if this is a threshold update message
                if topic.endswith("thresholds/update"):
                    await self.update_thresholds_from_mqtt(payload, session)
                    return
                
                # Check if we have a complete reading (all phases + motor metrics)
                if "complete_reading" in payload and payload["complete_reading"]:
                    # Create motor reading
                    reading_data = {
                        "voltage_a": payload.get("voltage_a", 0),
                        "current_a": payload.get("current_a", 0),
                        "power_a": payload.get("power_a", 0),
                        "energy_a": payload.get("energy_a", 0),
                        "frequency_a": payload.get("frequency_a", 0),
                        "pf_a": payload.get("pf_a", 0),
                        "voltage_b": payload.get("voltage_b", 0),
                        "current_b": payload.get("current_b", 0),
                        "power_b": payload.get("power_b", 0),
                        "energy_b": payload.get("energy_b", 0),
                        "frequency_b": payload.get("frequency_b", 0),
                        "pf_b": payload.get("pf_b", 0),
                        "voltage_c": payload.get("voltage_c", 0),
                        "current_c": payload.get("current_c", 0),
                        "power_c": payload.get("power_c", 0),
                        "energy_c": payload.get("energy_c", 0),
                        "frequency_c": payload.get("frequency_c", 0),
                        "pf_c": payload.get("pf_c", 0),
                        "temperature": payload.get("temperature", 0),
                        "vibration": payload.get("vibration", 0),
                        "rpm": payload.get("rpm", 0),
                    }
                    
                    # Run anomaly detection
                    anomaly_score, is_anomaly = await self.ml_detector.detect_anomaly(reading_data)
                    reading_data["anomaly_score"] = anomaly_score
                    reading_data["is_anomaly"] = is_anomaly
                    
                    # Save reading to database
                    reading = MotorReading(**reading_data)
                    session.add(reading)
                    
                    # Check thresholds and create alerts
                    alerts = await self.check_thresholds(reading_data, session)
                    
                    # Si la IA detecta anomalía, agregar alerta de ML
                    if is_anomaly:
                        ml_alert = {
                            "severity": "warning",
                            "category": "ml_anomaly",
                            "message": f"⚡ IA detectó comportamiento anómalo (score: {anomaly_score:.2f})",
                            "value": anomaly_score,
                            "threshold": 0.0
                        }
                        alerts.append(ml_alert)
                        print(f"🤖 IA DETECTÓ ANOMALÍA - Score: {anomaly_score:.2f}")
                    
                    if alerts:
                        print(f"🚨 Se detectaron {len(alerts)} alertas:")

                    # Si hay alertas críticas o la IA detectó una anomalía fuerte, generar una alerta de 'failure' y publicar MQTT
                    try:
                        critical_exists = any(a.get('severity') == 'critical' for a in alerts)
                        strong_ml_failure = is_anomaly and anomaly_score >= 0.7

                        if critical_exists or strong_ml_failure:
                            # Evitar duplicados
                            if not any(a.get('category') == 'failure' for a in alerts):
                                failure_alert = {
                                    "severity": "critical",
                                    "category": "failure",
                                    "message": f"🚨 Motor failure detected: anomaly_score={anomaly_score:.2f}" if is_anomaly else "🚨 Motor failure detected: threshold breach",
                                    "value": anomaly_score if is_anomaly else None,
                                    "threshold": None
                                }
                                alerts.append(failure_alert)
                                print("🔥 FAILURE alert appended due to critical condition or strong ML anomaly")

                                # Publicar un mensaje MQTT para que frontends y sistemas externos reaccionen
                                try:
                                    if self.client:
                                        pub_payload = {
                                            "type": "failure",
                                            "message": failure_alert["message"],
                                            "reading": reading_data,
                                            "timestamp": datetime.now().isoformat()
                                        }
                                        self.client.publish('motor/failure', json.dumps(pub_payload), qos=1)
                                        print("📡 Published motor/failure to MQTT")
                                except Exception as e:
                                    print(f"Error publishing failure MQTT: {e}")
                    except Exception as e:
                        print(f"Error generating failure alert: {e}")
                    
                    for alert_data in alerts:
                        print(f"   - Severidad: {alert_data['severity']} | Categoría: {alert_data['category']} | Mensaje: {alert_data['message']}")
                        alert = Alert(**alert_data)
                        session.add(alert)
                        print(f"   ✅ Alerta agregada a la sesión: ID pendiente hasta commit")
                    
                    # Auto-resolve old alerts (older than 2 minutes)
                    two_minutes_ago = datetime.now() - timedelta(minutes=2)
                    old_alerts_query = select(Alert).where(
                        and_(
                            Alert.resolved == False,
                            Alert.timestamp < two_minutes_ago
                        )
                    )
                    old_alerts_result = await session.execute(old_alerts_query)
                    old_alerts = old_alerts_result.scalars().all()
                    
                    for old_alert in old_alerts:
                        old_alert.resolved = True
                        old_alert.resolved_at = datetime.now()
                    
                    if old_alerts:
                        print(f"🔄 Auto-resolved {len(old_alerts)} old alerts")
                    
                    # Log if anomaly detected
                    if is_anomaly:
                        log = SystemLog(
                            level="warning",
                            source="ml",
                            message=f"Anomaly detected with score {anomaly_score:.2f}",
                            details=json.dumps(reading_data)
                        )
                        session.add(log)
                    
                    await session.commit()
                    
                    if alerts:
                        print(f"💾 Commit exitoso - {len(alerts)} alertas guardadas en la base de datos")
                    
        except Exception as e:
            print(f"Error processing message: {e}")
            async with async_session_maker() as session:
                log = SystemLog(
                    level="error",
                    source="mqtt",
                    message="Error processing MQTT message",
                    details=str(e)
                )
                session.add(log)
                await session.commit()
    
    async def check_thresholds(self, data, session):
        """Check if any values exceed thresholds and create alerts"""
        alerts = []
        
        # Get current thresholds from database
        query = select(ThresholdSettingsDB).order_by(desc(ThresholdSettingsDB.id)).limit(1)
        result = await session.execute(query)
        thresholds = result.scalar_one_or_none()
        
        # If no thresholds in DB, use defaults from config
        if not thresholds:
            thresholds = ThresholdSettingsDB()
            session.add(thresholds)
            await session.flush()
        
        # Temperature checks
        if data["temperature"] >= thresholds.temp_critical:
            alerts.append({
                "severity": "critical",
                "category": "temperature",
                "message": f"Temperature critical: {data['temperature']:.1f}°C",
                "value": data["temperature"],
                "threshold": thresholds.temp_critical
            })
        elif data["temperature"] >= thresholds.temp_warning:
            alerts.append({
                "severity": "warning",
                "category": "temperature",
                "message": f"Temperature warning: {data['temperature']:.1f}°C",
                "value": data["temperature"],
                "threshold": thresholds.temp_warning
            })
        
        # Vibration checks
        if data["vibration"] >= thresholds.vibration_critical:
            alerts.append({
                "severity": "critical",
                "category": "vibration",
                "message": f"Vibration critical: {data['vibration']:.1f} mm/s",
                "value": data["vibration"],
                "threshold": thresholds.vibration_critical
            })
        elif data["vibration"] >= thresholds.vibration_warning:
            alerts.append({
                "severity": "warning",
                "category": "vibration",
                "message": f"Vibration warning: {data['vibration']:.1f} mm/s",
                "value": data["vibration"],
                "threshold": thresholds.vibration_warning
            })
        
        # RPM checks
        if data["rpm"] >= thresholds.rpm_critical:
            alerts.append({
                "severity": "critical",
                "category": "rpm",
                "message": f"RPM critical: {data['rpm']:.0f}",
                "value": data["rpm"],
                "threshold": thresholds.rpm_critical
            })
        elif data["rpm"] >= thresholds.rpm_warning:
            alerts.append({
                "severity": "warning",
                "category": "rpm",
                "message": f"RPM warning: {data['rpm']:.0f}",
                "value": data["rpm"],
                "threshold": thresholds.rpm_warning
            })
        
        return alerts
    
    async def start(self, loop):
        """Start MQTT client"""
        self.loop = loop
        
        self.client = mqtt.Client()
        
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        
        # Enable TLS for HiveMQ Cloud
        if settings.MQTT_USE_TLS or settings.MQTT_PORT == 8883:
            try:
                import certifi
                self.client.tls_set(ca_certs=certifi.where(), cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
            except:
                # Fallback sin verificación de certificado
                self.client.tls_set(cert_reqs=ssl.CERT_NONE, tls_version=ssl.PROTOCOL_TLS)
                self.client.tls_insecure_set(True)
        
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        
        try:
            self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
            self.client.loop_start()
            print("MQTT client started")
            
            # Log startup
            async with async_session_maker() as session:
                log = SystemLog(
                    level="info",
                    source="mqtt",
                    message="MQTT client started successfully"
                )
                session.add(log)
                await session.commit()
                
        except Exception as e:
            print(f"Error starting MQTT client: {e}")
            async with async_session_maker() as session:
                log = SystemLog(
                    level="error",
                    source="mqtt",
                    message="Failed to start MQTT client",
                    details=str(e)
                )
                session.add(log)
                await session.commit()
    
    async def update_thresholds_from_mqtt(self, payload, session):
        """Update thresholds in database when received from MQTT"""
        try:
            print(f"📥 Received threshold update from MQTT")
            print(f"   Topic detected: motor/thresholds/update")
            print(f"   Payload: {payload}")
            
            # Get current thresholds or create new
            query = select(ThresholdSettingsDB).order_by(desc(ThresholdSettingsDB.id)).limit(1)
            result = await session.execute(query)
            thresholds = result.scalar_one_or_none()
            
            if not thresholds:
                print("   Creating new threshold record...")
                thresholds = ThresholdSettingsDB()
                session.add(thresholds)
            else:
                print(f"   Updating existing threshold record (ID: {thresholds.id})...")
            
            # Update threshold values
            if "voltage_min" in payload: thresholds.voltage_min = payload["voltage_min"]
            if "voltage_max" in payload: thresholds.voltage_max = payload["voltage_max"]
            if "current_warning" in payload: thresholds.current_warning = payload["current_warning"]
            if "current_critical" in payload: thresholds.current_critical = payload["current_critical"]
            if "temp_warning" in payload: thresholds.temp_warning = payload["temp_warning"]
            if "temp_critical" in payload: thresholds.temp_critical = payload["temp_critical"]
            if "vibration_warning" in payload: thresholds.vibration_warning = payload["vibration_warning"]
            if "vibration_critical" in payload: thresholds.vibration_critical = payload["vibration_critical"]
            if "rpm_warning" in payload: thresholds.rpm_warning = payload["rpm_warning"]
            if "rpm_critical" in payload: thresholds.rpm_critical = payload["rpm_critical"]
            if "power_warning" in payload: thresholds.power_warning = payload["power_warning"]
            if "power_critical" in payload: thresholds.power_critical = payload["power_critical"]
            if "frequency_min" in payload: thresholds.frequency_min = payload["frequency_min"]
            if "frequency_max" in payload: thresholds.frequency_max = payload["frequency_max"]
            if "pf_min" in payload: thresholds.pf_min = payload["pf_min"]
            if "energy_warning" in payload: thresholds.energy_warning = payload["energy_warning"]
            
            await session.commit()
            print(f"   ✅ Database committed successfully")
            
            # Log the update
            log = SystemLog(
                level="info",
                source="mqtt",
                message="Thresholds updated via MQTT",
                details=json.dumps(payload)
            )
            session.add(log)
            await session.commit()
            
            print(f"✅ Thresholds updated successfully from MQTT!")
            print(f"   Example: temp_critical = {thresholds.temp_critical}")
            
        except Exception as e:
            print(f"❌ Error updating thresholds from MQTT: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
    
    async def stop(self):
        """Stop MQTT client"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            print("MQTT client stopped")
            
            async with async_session_maker() as session:
                log = SystemLog(
                    level="info",
                    source="mqtt",
                    message="MQTT client stopped"
                )
                session.add(log)
                await session.commit()

# Global MQTT handler instance
mqtt_handler = MQTTHandler()
