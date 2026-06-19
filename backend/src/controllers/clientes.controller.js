const supabase = require('../config/supabase');
const { calcularCupoCliente } = require('../services/cupo.service');

// GET /api/clientes
const getClientes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los clientes: ' + error.message });
  }
};

// POST /api/clientes
const createCliente = async (req, res) => {
  try {
    const { documento, nombre, placa_vehiculo, tipo_cliente, estado } = req.body;

    if (!documento || !nombre || !placa_vehiculo) {
      return res.status(400).json({ error: 'Documento, nombre y placa son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        documento,
        nombre,
        placa_vehiculo,
        tipo_cliente: tipo_cliente || 'Particular',
        estado: estado || 'Activo'
      }])
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El documento o la placa de vehículo ya se encuentra registrado.' });
      }
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el cliente: ' + error.message });
  }
};

// PUT /api/clientes/:id
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { documento, nombre, placa_vehiculo, tipo_cliente, estado } = req.body;

    if (!documento || !nombre || !placa_vehiculo) {
      return res.status(400).json({ error: 'Documento, nombre y placa son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('clientes')
      .update({
        documento,
        nombre,
        placa_vehiculo,
        tipo_cliente,
        estado
      })
      .eq('id_cliente', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El documento o la placa del vehículo ya están en uso por otro cliente.' });
      }
      throw error;
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el cliente: ' + error.message });
  }
};

// DELETE /api/clientes/:id
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id_cliente', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Cliente eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el cliente: ' + error.message });
  }
};

// GET /api/clientes/buscar/:dato
// Search by license plate or document
const buscarCliente = async (req, res) => {
  try {
    const { dato } = req.params;
    
    if (!dato) {
      return res.status(400).json({ error: 'Dato de búsqueda vacío.' });
    }

    // Query by documento or placa_vehiculo
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`documento.eq.${dato},placa_vehiculo.eq.${dato.toUpperCase()}`);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ found: false, message: 'Cliente no encontrado.' });
    }

    return res.status(200).json({ found: true, cliente: data[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al buscar el cliente: ' + error.message });
  }
};

// GET /api/clientes/:id/cupo
const getCupo = async (req, res) => {
  try {
    const { id } = req.params;
    const cupoData = await calcularCupoCliente(id);
    return res.status(200).json(cupoData);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  buscarCliente,
  getCupo
};
