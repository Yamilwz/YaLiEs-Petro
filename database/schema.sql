-- Database Schema for YaLiEs Petrol

-- Drop tables if they exist (order is important due to foreign key constraints)
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS ingresos CASCADE;
DROP TABLE IF EXISTS tanques CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS empresa CASCADE;

-- 1. Tabla empresa
CREATE TABLE empresa (
    id_empresa SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    nit VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    telefono VARCHAR(50),
    correo VARCHAR(150),
    stock_minimo_alerta NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    factor_holgura NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    cupo_base_cliente_nuevo NUMERIC(10, 2) NOT NULL DEFAULT 50.00
);

-- 2. Tabla tanques
CREATE TABLE tanques (
    id_tanque SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL,
    codigo_tanque VARCHAR(50) NOT NULL UNIQUE,
    tipo_carburante VARCHAR(50) NOT NULL CHECK (tipo_carburante IN ('Gasolina', 'Diesel')),
    capacidad_maxima NUMERIC(10, 2) NOT NULL,
    stock_minimo_seguridad NUMERIC(10, 2) NOT NULL,
    stock_actual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(50) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Mantenimiento')),
    CONSTRAINT fk_tanques_empresa FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa) ON DELETE CASCADE
);

-- 3. Tabla clientes
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    documento VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    placa_vehiculo VARCHAR(20) NOT NULL UNIQUE,
    tipo_cliente VARCHAR(50) NOT NULL CHECK (tipo_cliente IN ('Particular', 'Transporte Publico', 'Empresa')),
    estado VARCHAR(50) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Suspendido')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla ingresos
CREATE TABLE ingresos (
    id_ingreso SERIAL PRIMARY KEY,
    id_tanque INT NOT NULL,
    cantidad_litros NUMERIC(10, 2) NOT NULL,
    numero_factura VARCHAR(100) NOT NULL,
    proveedor VARCHAR(255) NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ingresos_tanque FOREIGN KEY (id_tanque) REFERENCES tanques (id_tanque) ON DELETE CASCADE
);

-- 5. Tabla ventas
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_tanque INT NOT NULL,
    tipo_carburante VARCHAR(50) NOT NULL CHECK (tipo_carburante IN ('Gasolina', 'Diesel')),
    cantidad_solicitada NUMERIC(10, 2) NOT NULL,
    cantidad_autorizada NUMERIC(10, 2) NOT NULL,
    promedio_semanal NUMERIC(10, 2) NOT NULL,
    holgura_aplicada NUMERIC(10, 2) NOT NULL,
    total_litros_permitido NUMERIC(10, 2) NOT NULL,
    estado_venta VARCHAR(50) NOT NULL CHECK (estado_venta IN ('Autorizada', 'Limitada', 'Bloqueada')),
    observacion TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente) ON DELETE CASCADE,
    CONSTRAINT fk_ventas_tanque FOREIGN KEY (id_tanque) REFERENCES tanques (id_tanque) ON DELETE CASCADE
);

-- Seed Initial Data
INSERT INTO empresa (nombre, nit, direccion, ciudad, telefono, correo, stock_minimo_alerta, factor_holgura, cupo_base_cliente_nuevo)
VALUES ('Estación de Servicio YaLiEs Petrol', '900.123.456-7', 'Avenida Principal 123', 'La Paz', '+591 2 2444444', 'contacto@yaliespetrol.com', 1500.00, 15.00, 60.00);

-- Get the ID of the first company to relate tanks (it should be 1, but we select dynamically or assume 1)
INSERT INTO tanques (id_empresa, codigo_tanque, tipo_carburante, capacidad_maxima, stock_minimo_seguridad, stock_actual, estado)
VALUES 
(1, 'T-GAS-01', 'Gasolina', 10000.00, 1000.00, 5000.00, 'Activo'),
(1, 'T-DIE-01', 'Diesel', 12000.00, 1500.00, 6000.00, 'Activo');

-- Seed initial clients
INSERT INTO clientes (documento, nombre, placa_vehiculo, tipo_cliente, estado)
VALUES
('1234567', 'Juan Pérez', 'ABC-123', 'Particular', 'Activo'),
('9876543', 'Cooperativa de Transportes Norte', 'XYZ-789', 'Transporte Publico', 'Activo'),
('1122334', 'Distribuidora S.A.', 'MNO-456', 'Empresa', 'Activo'),
('5555555', 'Pedro Infractor (Suspendido)', 'SUS-000', 'Particular', 'Suspendido');

-- Seed initial ingresos
INSERT INTO ingresos (id_tanque, cantidad_litros, numero_factura, proveedor, fecha_hora)
VALUES
(1, 2000.00, 'FAC-001', 'Refinería del Sur', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(2, 3000.00, 'FAC-002', 'Refinería del Sur', CURRENT_TIMESTAMP - INTERVAL '4 days');

-- Seed historical sales (to test quota calculation)
-- Note: 'Juan Pérez' (id_cliente=1, document=1234567, plate=ABC-123)
-- We need some sales in the last 28 days to establish a weekly average.
-- Let's put a couple of sales:
INSERT INTO ventas (id_cliente, id_tanque, tipo_carburante, cantidad_solicitada, cantidad_autorizada, promedio_semanal, holgura_aplicada, total_litros_permitido, estado_venta, observacion, fecha_hora)
VALUES
(1, 1, 'Gasolina', 40.00, 40.00, 0.00, 0.00, 60.00, 'Autorizada', 'Venta inicial cliente nuevo', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(1, 1, 'Gasolina', 50.00, 50.00, 10.00, 1.50, 11.50, 'Limitada', 'Se limita por cupo semanal', CURRENT_TIMESTAMP - INTERVAL '10 days'),
(2, 2, 'Diesel', 100.00, 100.00, 0.00, 0.00, 60.00, 'Limitada', 'Autorizado cupo base empresa nueva', CURRENT_TIMESTAMP - INTERVAL '15 days');
