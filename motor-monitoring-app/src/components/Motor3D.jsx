import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useRef, useEffect, Suspense, Component } from 'react';
import { useMQTT } from '../context/MQTTContext';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

// Error Boundary para capturar errores de carga del modelo
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Error cargando el modelo 3D:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Componente del Motor desde GLB
const MotorModel = ({ rpm, temperatura, vibracion }) => {
  const groupRef = useRef();
  const gltf = useLoader(GLTFLoader, '/models/motor.glb');
  
  useEffect(() => {
    if (groupRef.current) {
      // Rotación basada en RPM
      const speed = rpm / 3000;
      groupRef.current.rotation.y += speed * 0.01;
      
      // Vibración - sacudir el motor según el nivel
      const vibracionNivel = vibracion / 10; // Normalizar
      if (vibracion > 5) { // Vibración moderada
        groupRef.current.position.x = Math.sin(Date.now() * 0.01) * vibracionNivel * 0.02;
        groupRef.current.position.y = Math.cos(Date.now() * 0.015) * vibracionNivel * 0.02;
      } else {
        // Volver a posición original suavemente
        groupRef.current.position.x *= 0.9;
        groupRef.current.position.y *= 0.9;
      }
    }
  });

  // Color según temperatura
  const getTemperaturaColor = () => {
    if (temperatura > 80) return '#ff0000'; // Rojo - Crítico
    if (temperatura > 60) return '#ff6b00'; // Naranja - Advertencia
    if (temperatura > 40) return '#ffaa00'; // Amarillo - Precaución
    return null; // Normal - sin overlay
  };

  const tempColor = getTemperaturaColor();

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} scale={1.5} />
      
      {/* Overlay de color cuando hay sobrecalentamiento */}
      {tempColor && (
        <pointLight 
          position={[0, 0, 0]} 
          color={tempColor} 
          intensity={temperatura > 80 ? 3 : temperatura > 60 ? 2 : 1}
          distance={5}
          decay={2}
        />
      )}
      
      {/* Efecto de pulsación en vibración alta */}
      {vibracion > 8 && (
        <pointLight 
          position={[0, 0, 0]} 
          color="#ff0000" 
          intensity={Math.sin(Date.now() * 0.01) * 2 + 2}
          distance={4}
        />
      )}
    </group>
  );
};

// Componente del Motor 3D (fallback si no hay modelo GLB)
const MotorMesh = ({ rpm, temperatura, vibracion }) => {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      // Rotación basada en RPM
      const speed = rpm / 3000;
      meshRef.current.rotation.x += speed * 0.01;
      
      // Vibración - sacudir el motor según el nivel
      const vibracionNivel = vibracion / 10;
      if (vibracion > 5) {
        meshRef.current.position.x = Math.sin(Date.now() * 0.01) * vibracionNivel * 0.02;
        meshRef.current.position.y = Math.cos(Date.now() * 0.015) * vibracionNivel * 0.02;
      } else {
        meshRef.current.position.x *= 0.9;
        meshRef.current.position.y *= 0.9;
      }
    }
  });

  // Color según temperatura
  const getMotorColor = () => {
    if (temperatura > 80) return '#ff0000'; // Rojo - Crítico
    if (temperatura > 60) return '#ff6b00'; // Naranja - Advertencia
    if (temperatura > 40) return '#ffaa00'; // Amarillo - Precaución
    return '#4a5568'; // Normal - gris
  };

  return (
    <group ref={meshRef}>
      {/* Cuerpo principal */}
      <mesh castShadow>
        <cylinderGeometry args={[0.8, 0.8, 1.5, 32]} />
        <meshStandardMaterial color={getMotorColor()} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Eje */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
        <meshStandardMaterial color="#718096" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tapas */}
      <mesh position={[-0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.2, 32]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.2, 32]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Luz de advertencia en vibración alta */}
      {vibracion > 8 && (
        <pointLight 
          position={[0, 0, 0]} 
          color="#ff0000" 
          intensity={Math.sin(Date.now() * 0.01) * 2 + 2}
          distance={4}
        />
      )}
    </group>
  );
};

// Componente Scene
const Scene = ({ rpm, temperatura, vibracion }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[3, 3, 5]} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={10} />
      
      {/* Luces */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[0, 2, 0]} intensity={0.8} color="#a78bfa" />
      <pointLight position={[-3, 0, 3]} intensity={0.5} color="#3b82f6" />
      
      {/* Motor con ErrorBoundary y Suspense para cargar el modelo */}
      <ErrorBoundary fallback={<MotorMesh rpm={rpm} temperatura={temperatura} vibracion={vibracion} />}>
        <Suspense fallback={<MotorMesh rpm={rpm} temperatura={temperatura} vibracion={vibracion} />}>
          <MotorModel rpm={rpm} temperatura={temperatura} vibracion={vibracion} />
        </Suspense>
      </ErrorBoundary>
      
      {/* Environment */}
      <Environment preset="city" />
    </>
  );
};

// Componente principal Motor3D
const Motor3D = () => {
  const { generalData, hasActiveAlerts, hasWarnings } = useMQTT();

  // DEBUG: Log para verificar el estado
  console.log('🖼️ Motor3D - hasActiveAlerts:', hasActiveAlerts, 'hasWarnings:', hasWarnings);

  // Determinar estilo del borde
  const getBorderClass = () => {
    if (hasActiveAlerts) return 'border-2 border-red-500 animate-pulse';
    if (hasWarnings) return 'border-2 border-yellow-500';
    return '';
  };

  // Determinar mensaje de alerta
  const getAlertMessage = () => {
    if (hasActiveAlerts) return { icon: '🚨', text: 'ALERTA CRÍTICA', color: 'text-red-500' };
    if (hasWarnings) return { icon: '⚠️', text: 'ADVERTENCIA', color: 'text-yellow-500' };
    return null;
  };

  const alertInfo = getAlertMessage();

  return (
    <div className={`glass-card p-4 h-full flex flex-col overflow-hidden ${getBorderClass()}`}>
      <h2 className="text-lg font-bold text-purple-light mb-2 text-center flex items-center justify-center gap-2 flex-shrink-0">
        {alertInfo && (
          <span className={`${alertInfo.color} text-xl`}>{alertInfo.icon}</span>
        )}
        Motor Trifásico 3D
        {alertInfo && (
          <span className={`${alertInfo.color} text-xs font-normal`}>({alertInfo.text})</span>
        )}
      </h2>
      
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/10 to-blue-900/10">
        <Canvas shadows>
          <Scene 
            rpm={generalData.rpm} 
            temperatura={generalData.temperatura}
            vibracion={generalData.vibracion}
          />
        </Canvas>
      </div>

      <div className="mt-3 text-center flex-shrink-0">
        <button 
          className="px-3 py-2 bg-purple-main hover:bg-purple-dark rounded-lg transition-colors font-semibold text-sm"
          onClick={() => window.location.reload()}
        >
          ↻ Resetear Vista
        </button>
      </div>
    </div>
  );
};

export default Motor3D;
