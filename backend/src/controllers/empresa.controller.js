const supabase = require('../config/supabase');

// GET /api/empresa
const getEmpresa = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empresa')
      .select('*')
      .order('id_empresa', { ascending: true });

    if (error) throw error;

    // Return the first company found, or null if none
    return res.status(200).json(data[0] || null);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la configuración de la empresa: ' + error.message });
  }
};

// POST /api/empresa
const createEmpresa = async (req, res) => {
  try {
    const { nombre, nit, direccion, ciudad, telefono, correo, stock_minimo_alerta, factor_holgura, cupo_base_cliente_nuevo } = req.body;

    if (!nombre || !nit) {
      return res.status(400).json({ error: 'Nombre y NIT son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('empresa')
      .insert([{
        nombre,
        nit,
        direccion,
        ciudad,
        telefono,
        correo,
        stock_minimo_alerta: parseFloat(stock_minimo_alerta) || 1000.00,
        factor_holgura: parseFloat(factor_holgura) || 10.00,
        cupo_base_cliente_nuevo: parseFloat(cupo_base_cliente_nuevo) || 50.00
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear la configuración de la empresa: ' + error.message });
  }
};

// PUT /api/empresa/:id
const updateEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nit, direccion, ciudad, telefono, correo, stock_minimo_alerta, factor_holgura, cupo_base_cliente_nuevo } = req.body;

    if (!nombre || !nit) {
      return res.status(400).json({ error: 'Nombre y NIT son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('empresa')
      .update({
        nombre,
        nit,
        direccion,
        ciudad,
        telefono,
        correo,
        stock_minimo_alerta: parseFloat(stock_minimo_alerta),
        factor_holgura: parseFloat(factor_holgura),
        cupo_base_cliente_nuevo: parseFloat(cupo_base_cliente_nuevo)
      })
      .eq('id_empresa', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar la empresa: ' + error.message });
  }
};

module.exports = {
  getEmpresa,
  createEmpresa,
  updateEmpresa
};
