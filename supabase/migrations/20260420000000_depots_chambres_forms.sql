-- Migration: depots, chambres_froides, and forms tables
-- Timestamp: 20260420000000

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT DEFAULT ''::text,
  capacite_m3 NUMERIC DEFAULT 0,
  type_stockage TEXT DEFAULT 'ambiant'::text,
  responsable TEXT DEFAULT ''::text,
  actif BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.chambres_froides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
  temperature_min NUMERIC DEFAULT 0,
  temperature_max NUMERIC DEFAULT 4,
  temperature_actuelle NUMERIC DEFAULT 2,
  capacite_m3 NUMERIC DEFAULT 0,
  statut TEXT DEFAULT 'ok'::text,
  responsable TEXT DEFAULT ''::text,
  actif BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot TEXT NOT NULL,
  produit TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  quantite TEXT NOT NULL,
  unite TEXT DEFAULT 'kg'::text,
  categorie TEXT DEFAULT 'fruits-frais'::text,
  temperature_reception NUMERIC,
  dlc DATE,
  statut TEXT DEFAULT 'en_attente'::text,
  decision TEXT DEFAULT ''::text,
  motif_refus TEXT DEFAULT ''::text,
  observations TEXT DEFAULT ''::text,
  operateur TEXT DEFAULT ''::text,
  alerte TEXT,
  anomalie_id TEXT,
  score_couleur INTEGER,
  score_odeur INTEGER,
  score_texture INTEGER,
  score_gout INTEGER,
  poids_verifie BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.hygiene_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_session DATE NOT NULL,
  heure TEXT NOT NULL,
  score INTEGER NOT NULL,
  signataire TEXT NOT NULL,
  statut TEXT DEFAULT 'valide'::text,
  nok_count INTEGER DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.emballage_controles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur TEXT NOT NULL,
  reference TEXT NOT NULL,
  numero_lot TEXT NOT NULL,
  quantite NUMERIC NOT NULL,
  type_emballage TEXT NOT NULL,
  score_integrite INTEGER,
  score_proprete INTEGER,
  score_odeur INTEGER,
  score_etiquetage INTEGER,
  score_dimensions INTEGER,
  score_global INTEGER,
  score_percent INTEGER,
  conforme BOOLEAN DEFAULT false,
  responsable TEXT DEFAULT ''::text,
  observations TEXT DEFAULT ''::text,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.temperature_releves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  temperature NUMERIC NOT NULL,
  statut TEXT DEFAULT 'ok'::text,
  responsable TEXT DEFAULT ''::text,
  chambre_froide_id UUID REFERENCES public.chambres_froides(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  lot TEXT NOT NULL,
  zone TEXT NOT NULL,
  severite TEXT DEFAULT 'mineur'::text,
  responsable TEXT DEFAULT ''::text,
  statut TEXT DEFAULT 'ouvert'::text,
  description TEXT NOT NULL,
  source TEXT DEFAULT 'manuel'::text,
  date_ouverture TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom TEXT NOT NULL,
  date_facture DATE NOT NULL,
  date_echeance DATE NOT NULL,
  produit TEXT NOT NULL,
  quantite NUMERIC NOT NULL,
  prix_unitaire_ht NUMERIC NOT NULL,
  taux_tva NUMERIC DEFAULT 5.5,
  remise NUMERIC DEFAULT 0,
  montant_ht NUMERIC NOT NULL,
  montant_tva NUMERIC NOT NULL,
  montant_ttc NUMERIC NOT NULL,
  statut_paiement TEXT DEFAULT 'en_attente'::text,
  mode_paiement TEXT DEFAULT 'virement'::text,
  notes TEXT DEFAULT ''::text,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_depots_actif ON public.depots(actif);
CREATE INDEX IF NOT EXISTS idx_chambres_froides_depot ON public.chambres_froides(depot_id);
CREATE INDEX IF NOT EXISTS idx_chambres_froides_statut ON public.chambres_froides(statut);
CREATE INDEX IF NOT EXISTS idx_receptions_created_at ON public.receptions(created_at);
CREATE INDEX IF NOT EXISTS idx_hygiene_sessions_date ON public.hygiene_sessions(date_session);
CREATE INDEX IF NOT EXISTS idx_anomalies_statut ON public.anomalies(statut);
CREATE INDEX IF NOT EXISTS idx_factures_client ON public.factures(client_id);
CREATE INDEX IF NOT EXISTS idx_temperature_releves_created ON public.temperature_releves(created_at);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role_direction_or_manager(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.role::TEXT = ANY(required_roles)
)
$$;

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambres_froides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hygiene_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emballage_controles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_releves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- Depots: read for all authenticated, write for direction/manager
DROP POLICY IF EXISTS "depots_read_all" ON public.depots;
CREATE POLICY "depots_read_all" ON public.depots
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "depots_write_direction_manager" ON public.depots;
CREATE POLICY "depots_write_direction_manager" ON public.depots
FOR ALL TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']))
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- Chambres froides: read for all authenticated, write for direction/manager
DROP POLICY IF EXISTS "chambres_froides_read_all" ON public.chambres_froides;
CREATE POLICY "chambres_froides_read_all" ON public.chambres_froides
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chambres_froides_write_direction_manager" ON public.chambres_froides;
CREATE POLICY "chambres_froides_write_direction_manager" ON public.chambres_froides
FOR ALL TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']))
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- Receptions: all authenticated
DROP POLICY IF EXISTS "receptions_all_authenticated" ON public.receptions;
CREATE POLICY "receptions_all_authenticated" ON public.receptions
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Hygiene sessions: all authenticated
DROP POLICY IF EXISTS "hygiene_sessions_all_authenticated" ON public.hygiene_sessions;
CREATE POLICY "hygiene_sessions_all_authenticated" ON public.hygiene_sessions
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Emballage controles: all authenticated
DROP POLICY IF EXISTS "emballage_controles_all_authenticated" ON public.emballage_controles;
CREATE POLICY "emballage_controles_all_authenticated" ON public.emballage_controles
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Temperature releves: all authenticated
DROP POLICY IF EXISTS "temperature_releves_all_authenticated" ON public.temperature_releves;
CREATE POLICY "temperature_releves_all_authenticated" ON public.temperature_releves
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anomalies: all authenticated
DROP POLICY IF EXISTS "anomalies_all_authenticated" ON public.anomalies;
CREATE POLICY "anomalies_all_authenticated" ON public.anomalies
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Factures: direction and manager_production
DROP POLICY IF EXISTS "factures_direction_manager" ON public.factures;
CREATE POLICY "factures_direction_manager" ON public.factures
FOR ALL TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']))
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- ============================================================
-- 5. MOCK DATA
-- ============================================================

DO $$
DECLARE
  existing_user_id UUID;
  depot1_id UUID := gen_random_uuid();
  depot2_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

  -- Depots
  INSERT INTO public.depots (id, nom, adresse, capacite_m3, type_stockage, responsable, actif, created_by)
  VALUES
    (depot1_id, 'Dépôt Principal', 'Zone industrielle Nord, Bâtiment A', 500, 'ambiant', 'M. Leconte', true, existing_user_id),
    (depot2_id, 'Dépôt Secondaire', 'Zone industrielle Sud, Bâtiment C', 200, 'ambiant', 'T. Martin', true, existing_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Chambres froides
  INSERT INTO public.chambres_froides (id, nom, depot_id, temperature_min, temperature_max, temperature_actuelle, capacite_m3, statut, responsable, actif, created_by)
  VALUES
    (gen_random_uuid(), 'Chambre Froide 1', depot1_id, 0, 4, 2.1, 80, 'ok', 'T. Martin', true, existing_user_id),
    (gen_random_uuid(), 'Chambre Froide 2', depot1_id, 0, 4, 6.1, 80, 'danger', 'M. Leconte', true, existing_user_id),
    (gen_random_uuid(), 'Frigo Préparation A', depot2_id, 0, 6, 4.3, 30, 'ok', 'S. Benali', true, existing_user_id),
    (gen_random_uuid(), 'Chambre Surgelés', depot1_id, -20, -15, -17.5, 60, 'ok', 'L. Dupont', true, existing_user_id)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
