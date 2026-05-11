-- SQL fixes and missing tables for the database

-- 1. Create missing tables for product categories

-- Countries/Origins table
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT countries_pkey PRIMARY KEY (id)
);

-- Product Marks/Brands table
CREATE TABLE IF NOT EXISTS public.product_marks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_marks_pkey PRIMARY KEY (id)
);

-- 2. Alter products table to use foreign keys for better data integrity

-- Add foreign key constraints for products table (if not already exists)
ALTER TABLE public.products
  ADD CONSTRAINT products_pays_origine_fkey FOREIGN KEY (pays_origine) REFERENCES public.countries(name) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.products
  ADD CONSTRAINT products_mark_fkey FOREIGN KEY (mark) REFERENCES public.product_marks(name) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- 3. Insert default countries
INSERT INTO public.countries (name, code) VALUES
  ('France', 'FR'),
  ('USA', 'US'),
  ('Allemagne', 'DE'),
  ('Suisse', 'CH'),
  ('Chine', 'CN'),
  ('Japon', 'JP'),
  ('Algérie', 'DZ'),
  ('Maroc', 'MA'),
  ('Tunisie', 'TN')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert default marks/brands
INSERT INTO public.product_marks (name) VALUES
  ('Dell'),
  ('Logitech'),
  ('Corsair'),
  ('HP'),
  ('ASUS'),
  ('Apple'),
  ('Samsung'),
  ('LG'),
  ('Sony')
ON CONFLICT (name) DO NOTHING;

-- 5. Insert default units of measure
INSERT INTO public.units_of_measure (name, abbr) VALUES
  ('Unité', 'U'),
  ('Carton', 'CTN'),
  ('Palette', 'PAL'),
  ('Kilogramme', 'KG'),
  ('Litre', 'L')
ON CONFLICT (name) DO NOTHING;

-- 6. Insert default storage locations
INSERT INTO public.storage_locations (name, notes) VALUES
  ('Étagère A1', 'Étagère standard zone A1'),
  ('Étagère B2', 'Étagère standard zone B2'),
  ('Étagère C3', 'Étagère standard zone C3'),
  ('Entrepôt 1', 'Entrepôt principal'),
  ('Entrepôt 2', 'Entrepôt secondaire')
ON CONFLICT (name) DO NOTHING;

-- 7. Insert default product families
INSERT INTO public.product_families (name) VALUES
  ('Électronique'),
  ('Accessoires'),
  ('Vêtements'),
  ('Alimentaire')
ON CONFLICT (name) DO NOTHING;

-- 8. Grant appropriate permissions (if using RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_marks TO authenticated;
GRANT SELECT ON public.units_of_measure TO authenticated;
GRANT SELECT ON public.storage_locations TO authenticated;
GRANT SELECT ON public.product_families TO authenticated;

-- Note: The prix_achat_ttc column is a GENERATED column (calculated automatically)
-- Do NOT insert values into it - let the database calculate it
