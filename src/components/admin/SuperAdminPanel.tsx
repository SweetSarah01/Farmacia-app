import React, { useState, useEffect } from 'react';
import { useTheme } from '../../App';

export default function SuperAdminPanel({ cerrarSesion }: { cerrarSesion: () => void }) {
  const { modoOscuro } = useTheme();
  const [fechaInicio, setFechaInicio] = useState('');
  const [datosDashboard, setDatosDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [farmacias, setFarmacias] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<any>(null);
  const [editandoUsuario, setEditandoUsuario] = useState<any>(null);
  const [rechazoModal, setRechazoModal] = useState<{ id: string; tipo: string } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarFarmacias = async () => {
    try {
      const response = await fetch('/api/superadmin/farmacias');
      if (!response.ok) throw new Error('Error al cargar farmacias');
      const data = await response.json();
      setFarmacias(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('/api/superadmin/usuarios');
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarFarmacias();
    cargarUsuarios();
  }, []);

  const resetearFiltros = () => {
    setFechaInicio('');
    cargarDatos();
  };

  const aprobarFarmacia = async (id: string) => {
    try {
      const response = await fetch(`/api/superadmin/farmacias/${id}/aprobar`, { method: 'POST' });
      if (!response.ok) throw new Error('Error al aprobar farmacia');
      cargarFarmacias();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const rechazarFarmacia = async (id: string, motivo: string) => {
    try {
      const response = await fetch(`/api/superadmin/farmacias/${id}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      if (!response.ok) throw new Error('Error al rechazar farmacia');
      setRechazoModal(null);
      cargarFarmacias();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const actualizarUsuario = async (id: string, datos: any) => {
    try {
      const response = await fetch(`/api/superadmin/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!response.ok) throw new Error('Error al actualizar usuario');
      setEditandoUsuario(null);
      cargarUsuarios();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const eliminarUsuario = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const response = await fetch(`/api/superadmin/usuarios/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar usuario');
      cargarUsuarios();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const farmaciasFiltradas = farmacias.filter(f => {
    if (filtroEstado && f.estado !== filtroEstado) return false;
    if (filtroBusqueda) {
      const search = filtroBusqueda.toLowerCase();
      return f.nombre?.toLowerCase().includes(search) || f.email?.toLowerCase().includes(search);
    }
    return true;
  });

  return (
    <div className={modoOscuro ? "bg-slate-900" : "bg-slate-50"}>
      <div className="min-h-screen p-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
          <button
            onClick={cerrarSesion}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
          >
            Cerrar Sesión
          </button>
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

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

            {!loading && !error && datosDashboard && (
              <div className="text-white">
                <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(datosDashboard, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Farmacias</h2>
            <button
              onClick={() => cargarDatos()}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Actualizar
            </button>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
            <div className="flex flex-wrap gap-4 mb-6">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>

            <div className="space-y-4">
              {farmaciasFiltradas.map((farmacia) => (
                <div key={farmacia.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-medium">{farmacia.nombre}</h3>
                      <p className="text-white/60 text-sm">{farmacia.email}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                        farmacia.estado === 'aprobada' ? 'bg-green-500/20 text-green-300' :
                        farmacia.estado === 'rechazada' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {farmacia.estado}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {farmacia.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => aprobarFarmacia(farmacia.id)}
                            className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 transition"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => setRechazoModal({ id: farmacia.id, tipo: 'farmacia' })}
                            className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setFarmaciaSeleccionada(farmacia)}
                        className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Usuarios</h2>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
            <div className="space-y-4">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-medium">{usuario.nombre}</h3>
                      <p className="text-white/60 text-sm">{usuario.email}</p>
                      <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                        {usuario.rol}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditandoUsuario(usuario)}
                        className="px-3 py-1 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarUsuario(usuario.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {rechazoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-white/20 max-w-md w-full">
              <h3 className="text-white text-lg font-semibold mb-4">Motivo de rechazo</h3>
              <textarea
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                rows={4}
                placeholder="Ingresa el motivo del rechazo..."
                id="motivoRechazo"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const motivo = (document.getElementById('motivoRechazo') as HTMLTextAreaElement).value;
                    rechazarFarmacia(rechazoModal.id, motivo);
                  }}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Confirmar Rechazo
                </button>
                <button
                  onClick={() => setRechazoModal(null)}
                  className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {farmaciaSeleccionada && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-white/20 max-w-lg w-full">
              <h3 className="text-white text-lg font-semibold mb-4">Detalles de Farmacia</h3>
              <div className="text-white/80 space-y-2 mb-4">
                <p><strong>Nombre:</strong> {farmaciaSeleccionada.nombre}</p>
                <p><strong>Email:</strong> {farmaciaSeleccionada.email}</p>
                <p><strong>Estado:</strong> {farmaciaSeleccionada.estado}</p>
                <p><strong>Dirección:</strong> {farmaciaSeleccionada.direccion}</p>
                <p><strong>Teléfono:</strong> {farmaciaSeleccionada.telefono}</p>
              </div>
              <button
                onClick={() => setFarmaciaSeleccionada(null)}
                className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {editandoUsuario && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-white/20 max-w-md w-full">
              <h3 className="text-white text-lg font-semibold mb-4">Editar Usuario</h3>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Nombre</label>
                  <input
                    type="text"
                    defaultValue={editandoUsuario.nombre}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="editNombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Rol</label>
                  <select
                    defaultValue={editandoUsuario.rol}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="editRol"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="farmaceutico">Farmacéutico</option>
                    <option value="domiciliario">Domiciliario</option>
                    <option value="admin">Admin Farmacia</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const nombre = (document.getElementById('editNombre') as HTMLInputElement).value;
                    const rol = (document.getElementById('editRol') as HTMLSelectElement).value;
                    actualizarUsuario(editandoUsuario.id, { nombre, rol });
                  }}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditandoUsuario(null)}
                  className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
