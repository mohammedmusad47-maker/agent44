-- Add special_instructions column to order_items table
ALTER TABLE public.order_items
ADD COLUMN special_instructions text;