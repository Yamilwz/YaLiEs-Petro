const supabase = require('../config/supabase');
const { calcularCupoCliente } = require('../services/cupo.service');
const { validarStock, actualizarStockVenta } = require('../services/stock.service');

// GET /api/ventas
const getVentas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, clientes(nombre, placa_vehiculo, documento), tanques(codigo_tanque)')
      .order('fecha_hora', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las ventas: ' + error.message });
  }
};

// POST /api/ventas
const createVenta = async (req, res) => {
  try {
    const {
      documento,
      nombre,
      placa_vehiculo,
      tipo_cliente,
      id_tanque,
      cantidad_solicitada
    } = req.body;

    if (!documento || !placa_vehiculo || !id_tanque || !cantidad_solicitada) {
      return res.status(400).json({ error: 'El documento, la placa del vehículo, el tanque y la cantidad solicitada son obligatorios.' });
    }

    const cantidadSolicitadaFloat = parseFloat(cantidad_solicitada);
    if (isNaN(cantidadSolicitadaFloat) || cantidadSolicitadaFloat <= 0) {
      return res.status(400).json({ error: 'La cantidad solicitada debe ser un número mayor a cero.' });
    }

    // 1. Fetch tank details to check type of fuel
    const { data: tanque, error: tankError } = await supabase
      .from('tanques')
      .select('*')
      .eq('id_tanque', id_tanque)
      .single();

    if (tankError || !tanque) {
      return res.status(404).json({ error: 'Tanque no encontrado.' });
    }

    if (tanque.estado !== 'Activo') {
      return res.status(400).json({ error: `El tanque ${tanque.codigo_tanque} no está activo.` });
    }

    // 2. Fetch or auto-register client
    let clienteId = null;
    let clienteEstado = 'Activo';
    
    const { data: clienteExistente, error: clientFetchError } = await supabase
      .from('clientes')
      .select('*')
      .or(`documento.eq.${documento},placa_vehiculo.eq.${placa_vehiculo.toUpperCase()}`)
      .limit(1);

    if (clientFetchError) throw clientFetchError;

    let cliente;
    if (!clienteExistente || clienteExistente.length === 0) {
      // Auto-register client with "Activo" state
      const { data: nuevoCliente, error: createClientError } = await supabase
        .from('clientes')
        .insert([{
          documento,
          nombre: nombre || 'Cliente Auto-registrado',
          placa_vehiculo: placa_vehiculo.toUpperCase(),
          tipo_cliente: tipo_cliente || 'Particular',
          estado: 'Activo'
        }])
        .select()
        .single();

      if (createClientError) {
        return res.status(400).json({ error: 'Error al auto-registrar el cliente: ' + createClientError.message });
      }
      cliente = nuevoCliente;
    } else {
      cliente = clienteExistente[0];
    }

    clienteId = cliente.id_cliente;
    clienteEstado = cliente.estado;

    // 3. Process blocked sale if customer is suspended
    if (clienteEstado === 'Suspendido') {
      // Log as a Bloqueada sale
      const { data: ventaBloqueada, error: blockError } = await supabase
        .from('ventas')
        .insert([{
          id_cliente: clienteId,
          id_tanque: id_tanque,
          tipo_carburante: tanque.tipo_carburante,
          cantidad_solicitada: cantidadSolicitadaFloat,
          cantidad_autorizada: 0.00,
          promedio_semanal: 0.00,
          holgura_aplicada: 0.00,
          total_litros_permitido: 0.00,
          estado_venta: 'Bloqueada',
          observacion: 'Venta bloqueada: El cliente está suspendido.'
        }])
        .select('*, clientes(nombre, placa_vehiculo), tanques(codigo_tanque)')
        .single();

      if (blockError) throw blockError;

      return res.status(200).json({
        success: false,
        estado_venta: 'Bloqueada',
        mensaje: 'La venta ha sido BLOQUEADA porque el cliente está suspendido.',
        venta: ventaBloqueada
      });
    }

    // 4. Calculate client's fuel quota
    const quota = await calcularCupoCliente(clienteId);
    
    const promedioSemanal = quota.promedio_semanal;
    const holguraAplicada = quota.holgura_aplicada;
    const totalLitrosPermitido = quota.total_litros_permitido;

    let cantidadAutorizada = 0;
    let estadoVenta = 'Autorizada';
    let observacion = '';

    if (cantidadSolicitadaFloat <= totalLitrosPermitido) {
      cantidadAutorizada = cantidadSolicitadaFloat;
      estadoVenta = 'Autorizada';
      observacion = 'Venta autorizada dentro del límite establecido.';
    } else {
      cantidadAutorizada = totalLitrosPermitido;
      estadoVenta = 'Limitada';
      observacion = `Cantidad solicitada (${cantidadSolicitadaFloat} L) supera el límite de ${totalLitrosPermitido} L. Se autoriza el máximo permitido.`;
    }

    // 5. Validate tank stock for the authorized amount
    try {
      await validarStock(id_tanque, cantidadAutorizada);
    } catch (stockError) {
      return res.status(400).json({ error: stockError.message });
    }

    // 6. Update tank stock (subtract)
    await actualizarStockVenta(id_tanque, cantidadAutorizada);

    // 7. Register the sale
    const { data: venta, error: insertVentaError } = await supabase
      .from('ventas')
      .insert([{
        id_cliente: clienteId,
        id_tanque: id_tanque,
        tipo_carburante: tanque.tipo_carburante,
        cantidad_solicitada: cantidadSolicitadaFloat,
        cantidad_autorizada: parseFloat(cantidadAutorizada.toFixed(2)),
        promedio_semanal: promedioSemanal,
        holgura_aplicada: holguraAplicada,
        total_litros_permitido: totalLitrosPermitido,
        estado_venta: estadoVenta,
        observacion: observacion
      }])
      .select('*, clientes(nombre, placa_vehiculo), tanques(codigo_tanque)')
      .single();

    if (insertVentaError) {
      // Rollback stock update
      try {
        await actualizarStockVenta(id_tanque, -cantidadAutorizada);
      } catch (rollbackErr) {
        console.error('CRITICAL: Failed to rollback tank stock after sale insert failure!', rollbackErr);
      }
      throw insertVentaError;
    }

    return res.status(201).json({
      success: true,
      estado_venta: estadoVenta,
      mensaje: estadoVenta === 'Limitada' 
        ? `Venta LIMITADA. Se autorizaron solo ${cantidadAutorizada} L de los ${cantidadSolicitadaFloat} L solicitados.`
        : `Venta AUTORIZADA por ${cantidadAutorizada} L.`,
      venta
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al procesar la venta: ' + error.message });
  }
};

module.exports = {
  getVentas,
  createVenta
};
