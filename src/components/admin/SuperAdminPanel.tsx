import React, { useState, useEffect } from 'react';

const SuperAdminPanel = () => {
  const [modoOscuro, setModoOscuro] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [datosDashboard, setDatosDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarDatos = async (filtroFechaInicio?: string) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (filtroFechaInicio) {
        queryParams.append('fechaInicio', filtroFechaInicio);
      }
      const response = await fetch(`/api/superadmin/dashboard?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Error al cargar datos del dashboard');
      const data = await response.json();
      setDatosDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resetearFiltros = () => {
    setFechaInicio('');
    cargarDatos();
  };

  return (
    <div className={modoOscuro ? "bg-slate-50" : "bg-slate-900"}>
      <div className="min-h-screen p-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
          <button
            onClick={() => setModoOscuro(!modoOscuro)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {modoOscuro ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
          </button>
        </header>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Dashboard</h2>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={() => cargarDatos(fechaInicio)}
                className="px-6 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium"
              >
                Aplicar Filtro
              </button>
              <button
                onClick={() => cargarDatos()}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
              >
                Recargar Datos
              </button>
              <button
                onClick={() => resetearFiltros()}
                className="px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium"
              >
                Resetear Filtros
              </button>
            </div>

            {loading && (
              <div className="text-center py-8">
                <p className="text-white text-lg">Cargando datos...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-100 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!loading && !error && datosDashboard && (
              <div className="text-white">
                <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(datosDashboard, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Otras Acciones</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => cargarDatos()} className="px-4 py-2 rounded bg-purple-600 text-white">Sincronizar Datos</button>
            <button onClick={() => cargarDatos()} className="px-4 py-2 rounded bg-purple-600 text-white">Exportar Reporte</button>
            <button onClick={() => cargarDatos()} className="px-4 py-2 rounded bg-purple-600 text-white">Actualizar Estadísticas</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
