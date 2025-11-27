-- Add restaurant information to order_items table
ALTER TABLE order_items 
ADD COLUMN restaurant_name text,
ADD COLUMN restaurant_image text;