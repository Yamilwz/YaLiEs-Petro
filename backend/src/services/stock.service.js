const supabase = require('../config/supabase');

/**
 * Validates if a tank exists, is active, and has sufficient stock.
 * 
 * @param {number} idTanque - Tank ID
 * @param {number} cantidadSolicitada - Requested liters
 * @returns {Promise<Object>} Tank details if valid
 */
async function validarStock(idTanque, cantidadSolicitada) {
  const { data: tanque, error } = await supabase
    .from('tanques')
    .select('*')
    .eq('id_tanque', idTanque)
    .single();

  if (error || !tanque) {
    throw new Error('Tanque no encontrado.');
  }

  if (tanque.estado !== 'Activo') {
    throw new Error(`El tanque con código ${tanque.codigo_tanque} no está activo (Estado actual: ${tanque.estado}).`);
  }

  const stockActual = parseFloat(tanque.stock_actual || 0);
  if (stockActual < cantidadSolicitada) {
    throw new Error(`Stock insuficiente en el tanque. Disponible: ${stockActual} L, Solicitado: ${cantidadSolicitada} L.`);
  }

  return tanque;
}

/**
 * Increases the stock of a tank when an income is registered.
 * 
 * @param {number} idTanque - Tank ID
 * @param {number} cantidadLitros - Amount of liters added
 * @returns {Promise<Object>} Updated tank
 */
async function actualizarStockIngreso(idTanque, cantidadLitros) {
  // Get current stock
  const { data: tanque, error: selectError } = await supabase
    .from('tanques')
    .select('stock_actual, capacidad_maxima, codigo_tanque')
    .eq('id_tanque', idTanque)
    .single();

  if (selectError || !tanque) {
    throw new Error('Tanque no encontrado al intentar registrar el ingreso.');
  }

  const stockActual = parseFloat(tanque.stock_actual || 0);
  const capacidadMaxima = parseFloat(tanque.capacidad_maxima || 0);
  const nuevoStock = stockActual + parseFloat(cantidadLitros);

  if (nuevoStock > capacidadMaxima) {
    throw new Error(`El ingreso supera la capacidad máxima del tanque ${tanque.codigo_tanque} (${capacidadMaxima} L).`);
  }

  const { data: updatedTanque, error: updateError } = await supabase
    .from('tanques')
    .update({ stock_actual: parseFloat(nuevoStock.toFixed(2)) })
    .eq('id_tanque', idTanque)
    .select()
    .single();

  if (updateError) {
    throw new Error('Error al actualizar el stock del tanque por ingreso: ' + updateError.message);
  }

  return updatedTanque;
}

/**
 * Decreases the stock of a tank when a sale is registered.
 * 
 * @param {number} idTanque - Tank ID
 * @param {number} cantidadAutorizada - Amount of liters sold
 * @returns {Promise<Object>} Updated tank
 */
async function actualizarStockVenta(idTanque, cantidadAutorizada) {
  // Get current stock
  const { data: tanque, error: selectError } = await supabase
    .from('tanques')
    .select('stock_actual, codigo_tanque')
    .eq('id_tanque', idTanque)
    .single();

  if (selectError || !tanque) {
    throw new Error('Tanque no encontrado al intentar registrar la venta.');
  }

  const stockActual = parseFloat(tanque.stock_actual || 0);
  const nuevoStock = stockActual - parseFloat(cantidadAutorizada);

  if (nuevoStock < 0) {
    throw new Error(`Error crítico: Stock resultante sería negativo en tanque ${tanque.codigo_tanque}.`);
  }

  const { data: updatedTanque, error: updateError } = await supabase
    .from('tanques')
    .update({ stock_actual: parseFloat(nuevoStock.toFixed(2)) })
    .eq('id_tanque', idTanque)
    .select()
    .single();

  if (updateError) {
    throw new Error('Error al actualizar el stock del tanque por venta: ' + updateError.message);
  }

  return updatedTanque;
}

module.exports = {
  validarStock,
  actualizarStockIngreso,
  actualizarStockVenta
};
