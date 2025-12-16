import { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  AlertTriangle, 
  Activity, 
  Beaker,
  FileText,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useSearch } from '../context/SearchContext';

const Sidebar = ({ currentView, onViewChange, isOpen, setIsOpen }) => {
  const { searchTerm, searchResults, performSearch, clearSearch } = useSearch();
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Laboratorio', icon: Beaker },
    { id: 'ai-reports', label: 'Reportes IA', icon: Sparkles },
    { id: 'errors', label: 'Errores', icon: AlertTriangle },
    { id: 'logs', label: 'Registros', icon: FileText },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    performSearch(value);
    setShowResults(value.length > 0);
  };

  const handleResultClick = (result) => {
    // Navegar a la vista correcta
    if (result.view) {
      onViewChange(result.view);
    }
    
    // Hacer scroll al elemento específico después de cambiar la vista
    if (result.targetId) {
      setTimeout(() => {
        const element = document.getElementById(result.targetId);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Resaltar el elemento brevemente
          element.classList.add('search-highlight');
          setTimeout(() => {
            element.classList.remove('search-highlight');
          }, 2000);
        }
      }, 300); // Delay para dar tiempo a que cargue la vista
    }
    
    setShowResults(false);
    clearSearch();
    // Cerrar sidebar en móvil
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleClearSearch = () => {
    clearSearch();
    setShowResults(false);
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-purple-900 to-purple-950 text-white transition-all duration-300 z-50 flex flex-col ${
          isOpen ? 'w-64' : 'w-20 -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo y Header */}
        <div className="p-4 flex items-center justify-between border-b border-purple-400/20">
          {isOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">MotorWatch</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Botón toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-20 bg-purple-600 hover:bg-purple-700 rounded-full p-1 border-2 border-purple-400 shadow-lg transition-colors z-50"
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Barra de búsqueda global */}
        {isOpen && (
          <div className="p-4 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input
                type="text"
                placeholder="Buscar en toda la app..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm && setShowResults(true)}
                className="w-full bg-purple-800/50 border border-purple-400/30 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-purple-900 border border-purple-400/30 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-800/50 transition-colors border-b border-purple-700/30 last:border-b-0 flex items-center gap-3"
                  >
                    <div className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                      result.type === 'view' ? 'bg-blue-500/20 text-blue-300' :
                      result.type === 'metric' ? 'bg-green-500/20 text-green-300' :
                      result.type === 'phase' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {result.type === 'view' ? 'Vista' :
                       result.type === 'metric' ? 'Métrica' :
                       result.type === 'phase' ? 'Fase' : 'Acción'}
                    </div>
                    <span className="text-white text-sm">{result.label}</span>
                  </button>
                ))}
              </div>
            )}

            {showResults && searchTerm && searchResults.length === 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-purple-900 border border-purple-400/30 rounded-lg shadow-xl p-4 z-50">
                <p className="text-purple-300 text-sm text-center">No se encontraron resultados</p>
              </div>
            )}
          </div>
        )}

        {/* Menú de navegación */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-2 relative">
            {/* Indicador deslizante de fondo */}
            <div 
              className="absolute left-0 w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg transition-all duration-300 ease-out shadow-lg"
              style={{
                top: `${menuItems.findIndex(item => item.id === currentView) * 56}px`,
                opacity: menuItems.some(item => item.id === currentView) ? 1 : 0
              }}
            />
            
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <li key={item.id} className="relative">
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 py-3 transition-all duration-200 group relative z-10 ${
                      isActive
                        ? 'bg-purple-600 text-white rounded-lg px-4'
                        : 'text-purple-100 hover:bg-purple-800/50 rounded-lg px-4 mr-2'
                    }`}
                  >
                    {/* Indicador activo */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-purple-400 rounded-r-full" />
                    )}
                    
                    <Icon className={`w-5 h-5 flex-shrink-0`} />
                    
                    {isOpen && (
                      <span className="font-medium">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip para cuando está cerrado */}
                    {!isOpen && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-purple-950 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-purple-600">
                        {item.label}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer con redes sociales */}
        {isOpen && (
          <div className="p-4 border-t border-purple-400/20">
            <div className="flex justify-center gap-4 text-purple-300">
              <a href="#" className="hover:text-white transition-colors">
                <span className="text-xs">Facebook</span>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="text-xs">Twitter</span>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="text-xs">Google+</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
