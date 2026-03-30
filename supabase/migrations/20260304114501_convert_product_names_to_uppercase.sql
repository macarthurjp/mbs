/*
  # Convertir nombres de productos a mayúsculas

  1. Cambios
    - Actualiza todos los nombres de productos existentes a mayúsculas usando UPPER()
    - Crea un trigger para convertir automáticamente nuevos productos a mayúsculas
    - Crea un trigger para convertir actualizaciones de productos a mayúsculas

  2. Notas
    - Esta operación afecta todos los productos en la base de datos
    - Los futuros productos se convertirán automáticamente a mayúsculas
*/

-- Convertir todos los nombres de productos existentes a mayúsculas
UPDATE products 
SET name = UPPER(name)
WHERE name != UPPER(name);

-- Crear función que convierte el nombre a mayúsculas
CREATE OR REPLACE FUNCTION uppercase_product_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name = UPPER(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT
DROP TRIGGER IF EXISTS uppercase_product_name_on_insert ON products;
CREATE TRIGGER uppercase_product_name_on_insert
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_product_name();

-- Crear trigger para UPDATE
DROP TRIGGER IF EXISTS uppercase_product_name_on_update ON products;
CREATE TRIGGER uppercase_product_name_on_update
  BEFORE UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION uppercase_product_name();
