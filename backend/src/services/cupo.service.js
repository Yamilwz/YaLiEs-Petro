const supabase = require('../config/supabase');

/**
 * Calculates the weekly average and maximum allowed limit for a customer.
 * 
 * Formula:
 * - promedio_semanal = total_litros_ultimos_28_dias / 4
 * - limite = promedio_semanal + (promedio_semanal * factor_holgura / 100)
 * - If new customer (no history in last 28 days), use cupo_base_cliente_nuevo.
 * - If customer is suspended, sale is blocked (no limit allowed).
 * 
 * @param {number} idCliente - Client ID
 * @returns {Promise<Object>} Calculated quota details
 */
async function calcularCupoCliente(idCliente) {
  // 1. Get client information
  const { data: cliente, error: clientError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', idCliente)
    .single();

  if (clientError || !cliente) {
    throw new Error('Cliente no encontrado.');
  }

  // If customer is suspended, they have 0 allowed limit
  if (cliente.estado === 'Suspendido') {
    return {
      autorizado: false,
      motivo: 'Cliente suspendido',
      estado_venta: 'Bloqueada',
      promedio_semanal: 0,
      holgura_aplicada: 0,
      total_litros_permitido: 0,
      cliente
    };
  }

  // 2. Get company configuration parameters
  const { data: empresa, error: empresaError } = await supabase
    .from('empresa')
    .select('*')
    .limit(1)
    .single();

  if (empresaError || !empresa) {
    throw new Error('Configuración de la empresa no encontrada.');
  }

  const factorHolgura = parseFloat(empresa.factor_holgura);
  const cupoBaseNuevo = parseFloat(empresa.cupo_base_cliente_nuevo);

  // 3. Get total fuel purchased (amount authorized) in the last 28 days
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 28);

  const { data: ventas, error: ventasError } = await supabase
    .from('ventas')
    .select('cantidad_autorizada')
    .eq('id_cliente', idCliente)
    .in('estado_venta', ['Autorizada', 'Limitada'])
    .gte('fecha_hora', fechaLimite.toISOString());

  if (ventasError) {
    throw new Error('Error al consultar el historial de ventas del cliente: ' + ventasError.message);
  }

  const totalLitrosUltimos28Dias = ventas.reduce((acc, v) => acc + parseFloat(v.cantidad_autorizada || 0), 0);

  let promedioSemanal = 0;
  let holguraAplicada = 0;
  let totalLitrosPermitido = 0;

  if (ventas.length === 0 || totalLitrosUltimos28Dias === 0) {
    // New customer or customer with no sales history in the last 28 days
    promedioSemanal = 0;
    holguraAplicada = 0;
    totalLitrosPermitido = cupoBaseNuevo;
  } else {
    promedioSemanal = totalLitrosUltimos28Dias / 4;
    holguraAplicada = promedioSemanal * (factorHolgura / 100);
    totalLitrosPermitido = promedioSemanal + holguraAplicada;
  }

  return {
    autorizado: true,
    promedio_semanal: parseFloat(promedioSemanal.toFixed(2)),
    holgura_aplicada: parseFloat(holguraAplicada.toFixed(2)),
    total_litros_permitido: parseFloat(totalLitrosPermitido.toFixed(2)),
    factor_holgura: factorHolgura,
    cliente
  };
}

module.exports = {
  calcularCupoCliente
};
