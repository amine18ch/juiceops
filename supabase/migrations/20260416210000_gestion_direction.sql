-- ============================================================
-- JuiceOps — Gestion Direction: Produits, Fournisseurs, Clients
-- ============================================================

-- 1. TABLES

CREATE TABLE IF NOT EXISTS public.produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL DEFAULT 'jus',
  description TEXT DEFAULT '',
  prix_unitaire DECIMAL(10,2) NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'bouteille',
  stock_actuel INTEGER NOT NULL DEFAULT 0,
  stock_minimum INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  categorie TEXT NOT NULL DEFAULT 'fruits',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  type_client TEXT NOT NULL DEFAULT 'distributeur',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_produits_reference ON public.produits(reference);
CREATE INDEX IF NOT EXISTS idx_produits_actif ON public.produits(actif);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_actif ON public.fournisseurs(actif);
CREATE INDEX IF NOT EXISTS idx_clients_actif ON public.clients(actif);

-- 3. UPDATED_AT TRIGGER (reuse existing function)
DROP TRIGGER IF EXISTS on_produits_updated ON public.produits;
CREATE TRIGGER on_produits_updated
  BEFORE UPDATE ON public.produits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_fournisseurs_updated ON public.fournisseurs;
CREATE TRIGGER on_fournisseurs_updated
  BEFORE UPDATE ON public.fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_clients_updated ON public.clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. ENABLE RLS
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. ROLE-BASED HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.role::TEXT = required_role
)
$$;

-- 6. RLS POLICIES — Produits
DROP POLICY IF EXISTS "authenticated_read_produits" ON public.produits;
CREATE POLICY "authenticated_read_produits"
ON public.produits FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "direction_manage_produits" ON public.produits;
CREATE POLICY "direction_manage_produits"
ON public.produits FOR ALL TO authenticated
USING (public.has_role('direction'))
WITH CHECK (public.has_role('direction'));

-- 7. RLS POLICIES — Fournisseurs
DROP POLICY IF EXISTS "authenticated_read_fournisseurs" ON public.fournisseurs;
CREATE POLICY "authenticated_read_fournisseurs"
ON public.fournisseurs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "direction_manage_fournisseurs" ON public.fournisseurs;
CREATE POLICY "direction_manage_fournisseurs"
ON public.fournisseurs FOR ALL TO authenticated
USING (public.has_role('direction'))
WITH CHECK (public.has_role('direction'));

-- 8. RLS POLICIES — Clients
DROP POLICY IF EXISTS "authenticated_read_clients" ON public.clients;
CREATE POLICY "authenticated_read_clients"
ON public.clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "direction_manage_clients" ON public.clients;
CREATE POLICY "direction_manage_clients"
ON public.clients FOR ALL TO authenticated
USING (public.has_role('direction'))
WITH CHECK (public.has_role('direction'));

-- 9. MOCK DATA
DO $$
DECLARE
  dir_user_id UUID;
BEGIN
  SELECT id INTO dir_user_id FROM public.user_profiles WHERE role = 'direction' LIMIT 1;

  IF dir_user_id IS NOT NULL THEN
    -- Produits
    INSERT INTO public.produits (id, nom, reference, categorie, description, prix_unitaire, unite, stock_actuel, stock_minimum, created_by) VALUES
      (gen_random_uuid(), 'Jus d''orange frais 25cl', 'JUS-OR-25', 'jus', 'Jus d''orange pressé à froid', 1.80, 'bouteille', 1200, 200, dir_user_id),
      (gen_random_uuid(), 'Jus d''orange frais 50cl', 'JUS-OR-50', 'jus', 'Jus d''orange pressé à froid grand format', 2.90, 'bouteille', 800, 150, dir_user_id),
      (gen_random_uuid(), 'Smoothie mangue-passion 33cl', 'SMO-MP-33', 'smoothie', 'Smoothie tropical mangue et fruit de la passion', 2.50, 'bouteille', 600, 100, dir_user_id),
      (gen_random_uuid(), 'Jus multifruits 50cl', 'JUS-MF-50', 'jus', 'Mélange de fruits de saison', 2.20, 'bouteille', 950, 180, dir_user_id),
      (gen_random_uuid(), 'Jus de pomme 1L', 'JUS-PM-1L', 'jus', 'Jus de pomme artisanal', 3.50, 'bouteille', 400, 80, dir_user_id)
    ON CONFLICT (reference) DO NOTHING;

    -- Fournisseurs
    INSERT INTO public.fournisseurs (id, nom, contact, email, telephone, adresse, categorie, created_by) VALUES
      (gen_random_uuid(), 'Agrumes du Sud', 'Pierre Martin', 'contact@agrumesdusud.fr', '04 91 23 45 67', '15 rue des Orangers, 13001 Marseille', 'fruits', dir_user_id),
      (gen_random_uuid(), 'Vergers de Normandie', 'Claire Dupont', 'claire@vergersdenormandie.fr', '02 31 45 67 89', '8 chemin des Pommiers, 14000 Caen', 'fruits', dir_user_id),
      (gen_random_uuid(), 'Emballages Pro', 'Jean Leclerc', 'j.leclerc@emballagespro.fr', '01 42 56 78 90', '22 avenue Industrielle, 75013 Paris', 'emballages', dir_user_id),
      (gen_random_uuid(), 'Fruits Exotiques SARL', 'Amina Benali', 'amina@fruitsexotiques.fr', '05 56 78 90 12', '3 quai des Tropiques, 33000 Bordeaux', 'fruits', dir_user_id)
    ON CONFLICT DO NOTHING;

    -- Clients
    INSERT INTO public.clients (id, nom, contact, email, telephone, adresse, type_client, created_by) VALUES
      (gen_random_uuid(), 'Carrefour Market', 'Sophie Renard', 's.renard@carrefour.fr', '01 58 79 00 00', '93 avenue de Paris, 75012 Paris', 'grande_surface', dir_user_id),
      (gen_random_uuid(), 'Biocoop', 'Thomas Girard', 'thomas@biocoop.fr', '01 44 82 00 00', '45 rue du Bio, 75011 Paris', 'bio', dir_user_id),
      (gen_random_uuid(), 'Monoprix', 'Isabelle Morel', 'i.morel@monoprix.fr', '01 40 01 00 00', '12 boulevard Haussmann, 75009 Paris', 'grande_surface', dir_user_id),
      (gen_random_uuid(), 'Hôtel Bellevue', 'Marc Fontaine', 'marc@hotelbellevue.fr', '04 93 12 34 56', '1 promenade des Anglais, 06000 Nice', 'horeca', dir_user_id),
      (gen_random_uuid(), 'Restauration Mairie', 'Lucie Bernard', 'lucie.bernard@mairie.fr', '01 42 76 40 00', '5 place de la République, 75003 Paris', 'collectivite', dir_user_id)
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE NOTICE 'No direction user found. Mock data skipped.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
