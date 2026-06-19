const supabase = require('../config/supabase');
const { actualizarStockIngreso } = require('../services/stock.service');

// GET /api/ingresos
const getIngresos = async (req, res) => {
  try {
    // Select incomes and join with tank info to show details in frontend
    const { data, error } = await supabase
      .from('ingresos')
      .select('*, tanques(codigo_tanque, tipo_carburante)')
      .order('fecha_hora', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los ingresos de carburante: ' + error.message });
  }
};

// POST /api/ingresos
const createIngreso = async (req, res) => {
  try {
    const { id_tanque, cantidad_litros, numero_factura, proveedor } = req.body;

    if (!id_tanque || !cantidad_litros || !numero_factura || !proveedor) {
      return res.status(400).json({ error: 'Todos los campos (tanque, cantidad de litros, número factura y proveedor) son obligatorios.' });
    }

    const litros = parseFloat(cantidad_litros);
    if (isNaN(litros) || litros <= 0) {
      return res.status(400).json({ error: 'La cantidad de litros debe ser un número mayor a cero.' });
    }

    // 1. Update the tank's stock actual using the service. This validates capacity limits.
    // If it fails, it will throw an error and abort the creation.
    await actualizarStockIngreso(id_tanque, litros);

    // 2. Register the income log
    const { data: ingreso, error: insertError } = await supabase
      .from('ingresos')
      .insert([{
        id_tanque: parseInt(id_tanque),
        cantidad_litros: litros,
        numero_factura,
        proveedor
      }])
      .select()
      .single();

    if (insertError) {
      // Rollback stock is a bit complex since it's not a transaction, but let's try to restore if write fails:
      try {
        await actualizarStockIngreso(id_tanque, -litros);
      } catch (rollbackErr) {
        console.error('CRITICAL: Failed to rollback tank stock after income insert failure!', rollbackErr);
      }
      throw insertError;
    }

    return res.status(201).json(ingreso);
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el ingreso: ' + error.message });
  }
};

module.exports = {
  getIngresos,
  createIngreso
};
