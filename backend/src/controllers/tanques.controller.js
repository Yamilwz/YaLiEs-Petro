const supabase = require('../config/supabase');

// GET /api/tanques
const getTanques = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tanques')
      .select('*')
      .order('codigo_tanque', { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los tanques: ' + error.message });
  }
};

// POST /api/tanques
const createTanque = async (req, res) => {
  try {
    const { id_empresa, codigo_tanque, tipo_carburante, capacidad_maxima, stock_minimo_seguridad, stock_actual, estado } = req.body;

    if (!id_empresa || !codigo_tanque || !tipo_carburante || !capacidad_maxima || !stock_minimo_seguridad) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes.' });
    }

    if (!['Gasolina', 'Diesel'].includes(tipo_carburante)) {
      return res.status(400).json({ error: 'El tipo de carburante debe ser Gasolina o Diesel.' });
    }

    const { data, error } = await supabase
      .from('tanques')
      .insert([{
        id_empresa: parseInt(id_empresa),
        codigo_tanque,
        tipo_carburante,
        capacidad_maxima: parseFloat(capacidad_maxima),
        stock_minimo_seguridad: parseFloat(stock_minimo_seguridad),
        stock_actual: parseFloat(stock_actual) || 0.00,
        estado: estado || 'Activo'
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el tanque: ' + error.message });
  }
};

// PUT /api/tanques/:id
const updateTanque = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_tanque, tipo_carburante, capacidad_maxima, stock_minimo_seguridad, stock_actual, estado } = req.body;

    if (!codigo_tanque || !tipo_carburante || !capacidad_maxima || !stock_minimo_seguridad) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes.' });
    }

    if (!['Gasolina', 'Diesel'].includes(tipo_carburante)) {
      return res.status(400).json({ error: 'El tipo de carburante debe ser Gasolina o Diesel.' });
    }

    const { data, error } = await supabase
      .from('tanques')
      .update({
        codigo_tanque,
        tipo_carburante,
        capacidad_maxima: parseFloat(capacidad_maxima),
        stock_minimo_seguridad: parseFloat(stock_minimo_seguridad),
        stock_actual: parseFloat(stock_actual),
        estado
      })
      .eq('id_tanque', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el tanque: ' + error.message });
  }
};

// DELETE /api/tanques/:id
const deleteTanque = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tanques')
      .delete()
      .eq('id_tanque', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Tanque eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el tanque: ' + error.message });
  }
};

module.exports = {
  getTanques,
  createTanque,
  updateTanque,
  deleteTanque
};
