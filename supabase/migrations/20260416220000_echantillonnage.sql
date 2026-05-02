-- Migration: echantillonnage module
-- Timestamp: 20260416220000

CREATE TABLE IF NOT EXISTS public.echantillonnage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  produit TEXT NOT NULL,
  reference_produit TEXT NOT NULL,
  numero_lot TEXT NOT NULL,
  date_prelevement DATE NOT NULL,
  heure_livraison TIME NOT NULL,
  temperature_prelevement NUMERIC(5,1) NOT NULL,
  client TEXT,
  type_echantillon TEXT NOT NULL,
  quantite_prelevee NUMERIC(10,2) NOT NULL,
  unite_prelevement TEXT NOT NULL DEFAULT 'ml',
  point_prelevement TEXT NOT NULL,
  operateur TEXT NOT NULL DEFAULT '',
  destinataire TEXT NOT NULL,
  objet_analyse TEXT[] NOT NULL DEFAULT '{}',
  conditions_transport TEXT,
  observations TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_echantillonnage_created_at ON public.echantillonnage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echantillonnage_statut ON public.echantillonnage(statut);
CREATE INDEX IF NOT EXISTS idx_echantillonnage_created_by ON public.echantillonnage(created_by);

ALTER TABLE public.echantillonnage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_echantillonnage" ON public.echantillonnage;
CREATE POLICY "authenticated_read_echantillonnage"
ON public.echantillonnage
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_echantillonnage" ON public.echantillonnage;
CREATE POLICY "authenticated_insert_echantillonnage"
ON public.echantillonnage
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_echantillonnage" ON public.echantillonnage;
CREATE POLICY "authenticated_update_echantillonnage"
ON public.echantillonnage
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Mock data
DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
  END IF;

  INSERT INTO public.echantillonnage (
    id, reference, produit, reference_produit, numero_lot,
    date_prelevement, heure_livraison, temperature_prelevement,
    client, type_echantillon, quantite_prelevee, unite_prelevement,
    point_prelevement, operateur, destinataire, objet_analyse,
    conditions_transport, observations, statut, created_by
  ) VALUES
  (
    gen_random_uuid(), 'ECH-2026-089', 'Jus d''orange frais', 'JUS-OR-25CL', 'L-2026-041',
    '2026-04-16', '08:30', 3.2,
    'Carrefour Market', 'produit_fini', 250, 'ml',
    'Ligne production A — sortie presse', 'Marie Leconte', 'Eurofins Analyses',
    ARRAY['Microbiologie (germes totaux, E.coli, Salmonella)', 'Physico-chimie (pH, Brix, acidité)'],
    'refrigere', NULL, 'en_attente', existing_user_id
  ),
  (
    gen_random_uuid(), 'ECH-2026-088', 'Smoothie mangue-passion', 'SMO-MG-33CL', 'L-2026-040',
    '2026-04-15', '14:15', 3.8,
    'Biocoop', 'produit_fini', 330, 'ml',
    'Poste de remplissage', 'Marie Leconte', 'Laboratoire interne',
    ARRAY['Microbiologie (germes totaux, E.coli, Salmonella)', 'Organoleptique (couleur, goût, odeur)'],
    'refrigere', NULL, 'conforme', existing_user_id
  ),
  (
    gen_random_uuid(), 'ECH-2026-087', 'Jus de carotte-gingembre', 'JUS-CG-25CL', 'L-2026-039',
    '2026-04-15', '09:00', 5.1,
    'Monoprix', 'produit_fini', 250, 'ml',
    'Cuve de mélange 1', 'Marie Leconte', 'SGS France',
    ARRAY['Microbiologie (germes totaux, E.coli, Salmonella)', 'Pesticides / résidus'],
    'refrigere', 'Température au-dessus du seuil lors du prélèvement', 'non_conforme', existing_user_id
  ),
  (
    gen_random_uuid(), 'ECH-2026-086', 'Jus de pomme', 'JUS-PM-1L', 'L-2026-038',
    '2026-04-14', '11:30', 2.9,
    'Leclerc', 'produit_fini', 1000, 'ml',
    'Chambre froide 1 — stock produit fini', 'Marie Leconte', 'Bureau Veritas',
    ARRAY['Physico-chimie (pH, Brix, acidité)', 'Durée de vie (DLC test)'],
    'refrigere', NULL, 'conforme', existing_user_id
  ),
  (
    gen_random_uuid(), 'ECH-2026-085', 'Jus multifruits', 'JUS-MF-1L', 'L-2026-037',
    '2026-04-14', '08:00', 3.5,
    'Casino', 'produit_fini', 1000, 'ml',
    'Quai expédition', 'Marie Leconte', 'Eurofins Analyses',
    ARRAY['Microbiologie (germes totaux, E.coli, Salmonella)', 'Vitamines et nutriments'],
    'refrigere', NULL, 'conforme', existing_user_id
  )
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
