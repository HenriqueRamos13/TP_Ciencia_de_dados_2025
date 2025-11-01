-- Worten Scraper Database Schema

-- Create products table with URL as primary key
CREATE TABLE IF NOT EXISTS products (
    url VARCHAR(500) PRIMARY KEY,
    title VARCHAR(500),
    removed_at TIMESTAMP DEFAULT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_checks table for historical price tracking
CREATE TABLE IF NOT EXISTS product_checks (
    id SERIAL PRIMARY KEY,
    product_url VARCHAR(500) NOT NULL REFERENCES products(url) ON DELETE CASCADE,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(10, 2),
    original_price DECIMAL(10, 2),
    has_promotion BOOLEAN DEFAULT FALSE,
    discount_percentage INTEGER,
    in_stock BOOLEAN DEFAULT TRUE,
    rating DECIMAL(2, 1),
    review_count INTEGER,
    additional_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_removed_at ON products(removed_at);
CREATE INDEX IF NOT EXISTS idx_products_last_checked ON products(last_checked);
CREATE INDEX IF NOT EXISTS idx_product_checks_product_url ON product_checks(product_url);
CREATE INDEX IF NOT EXISTS idx_product_checks_checked_at ON product_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_product_checks_has_promotion ON product_checks(has_promotion);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE products IS 'Stores unique product URLs with availability tracking';
COMMENT ON TABLE product_checks IS 'Historical data of product prices and availability';
COMMENT ON COLUMN products.url IS 'Primary key - unique product URL from Worten';
COMMENT ON COLUMN products.removed_at IS 'Timestamp when product was removed from homepage. NULL means currently available';
COMMENT ON COLUMN product_checks.has_promotion IS 'Indicates if product has active promotion';
COMMENT ON COLUMN product_checks.discount_percentage IS 'Discount percentage if promotion exists';
