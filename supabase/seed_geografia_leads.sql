-- =============================================================================
-- VOLUME DE LEADS — leads_geografia (DEMO)
-- =============================================================================
-- A tabela leads_geografia neste projeto tinha só ~19 linhas no total (uma
-- por estado, a maioria), o que é pouco para o Mapa Geográfico (drill-down
-- Brasil → Estado → Cidade) parecer uma demo funcional. Este script ADICIONA
-- leads fictícios com pais/estado/cidade/pipeline_id/rating coerentes,
-- distribuídos pelos mesmos 27 estados e cidades usados no backfill
-- (seed_geografia_backfill.sql), mais uma fatia internacional pequena (os
-- países que src/pages/MapaGeografico.tsx já sabe desenhar no mapa mundo).
--
-- Esquema real confirmado via information_schema.columns:
--   id (text), rating (integer), pipeline_id (text), deletado (boolean),
--   pais (text), estado (text), cidade (text), created_at (timestamptz).
-- pipeline_id usa os mesmos IDs fictícios já usados pelo funil comercial
-- (src/lib/funis.ts → PIPELINE_IDS), então os novos leads aparecem
-- corretamente nos filtros de funil da tela de Mapa Geográfico.
--
-- IDEMPOTENTE: todas as linhas geradas aqui usam id com prefixo
-- 'demo-geo-', diferente do padrão dos ids reais (ObjectId-like, 24 hex).
-- Reexecutar apaga só as linhas com esse prefixo e recria — nunca toca nas
-- ~19 linhas pré-existentes (reais ou já ajustadas pelo backfill).
-- =============================================================================

BEGIN;

DELETE FROM leads_geografia WHERE id LIKE 'demo-geo-%';

WITH estados AS (
  SELECT * FROM (VALUES
    ('SP', ARRAY['São Paulo','Campinas','Sorocaba','Ribeirão Preto','São José dos Campos','Americana'], 60),
    ('MG', ARRAY['Belo Horizonte','Uberlândia','Juiz de Fora','Contagem','Divinópolis','Uberaba'],      38),
    ('RJ', ARRAY['Rio de Janeiro','Nova Friburgo','Petrópolis'],                                        30),
    ('PR', ARRAY['Curitiba','Londrina','Maringá','Cascavel'],                                           26),
    ('SC', ARRAY['Blumenau','Brusque','Jaraguá do Sul','Joinville','Florianópolis'],                    24),
    ('RS', ARRAY['Porto Alegre','Caxias do Sul'],                                                       22),
    ('BA', ARRAY['Salvador','Feira de Santana','Vitória da Conquista'],                                 18),
    ('GO', ARRAY['Goiânia','Anápolis'],                                                                 16),
    ('PE', ARRAY['Recife','Caruaru','Petrolina'],                                                       14),
    ('CE', ARRAY['Fortaleza','Juazeiro do Norte','Sobral'],                                             13),
    ('ES', ARRAY['Vitória','Vila Velha','Serra'],                                                       12),
    ('DF', ARRAY['Brasília'],                                                                           12),
    ('MT', ARRAY['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Sorriso'],                            10),
    ('MS', ARRAY['Campo Grande','Dourados'],                                                             8),
    ('PA', ARRAY['Belém','Ananindeua'],                                                                  8),
    ('AM', ARRAY['Manaus'],                                                                              6),
    ('PB', ARRAY['João Pessoa','Campina Grande'],                                                        6),
    ('RN', ARRAY['Natal','Mossoró'],                                                                     6),
    ('AL', ARRAY['Maceió'],                                                                              5),
    ('SE', ARRAY['Aracaju'],                                                                             4),
    ('PI', ARRAY['Teresina'],                                                                            4),
    ('MA', ARRAY['São Luís'],                                                                            4),
    ('TO', ARRAY['Palmas'],                                                                              3),
    ('RO', ARRAY['Porto Velho'],                                                                         3),
    ('AC', ARRAY['Rio Branco'],                                                                          2),
    ('AP', ARRAY['Macapá'],                                                                              2),
    ('RR', ARRAY['Boa Vista'],                                                                           2)
  ) AS t(estado, cidades, peso)
),
pipelines AS (
  SELECT * FROM (VALUES
    ('699effbf7b4346001f83c691'), -- Imersão Premium
    ('699f00342be5b20013e23f9c'), -- Expansão
    ('6848412da06be900147fd766'), -- Membership
    ('699f332c5c43de0019d4f9ef'), -- Workshop
    ('69d7f7289d03880026773178')  -- Consultoria
  ) AS t(pipeline_id)
),
gerados_br AS (
  SELECT
    'demo-geo-br-' || e.estado || '-' || gs AS id,
    'Brasil' AS pais,
    e.estado,
    e.cidades[1 + floor(random() * array_length(e.cidades, 1))::int] AS cidade,
    (SELECT pipeline_id FROM pipelines ORDER BY random() LIMIT 1) AS pipeline_id,
    (1 + floor(random() * 5))::int AS rating,
    now() - (random() * interval '120 days') AS created_at
  FROM estados e
  CROSS JOIN LATERAL generate_series(1, e.peso) AS gs
),
internacional AS (
  SELECT * FROM (VALUES
    ('Paraguai',  22),
    ('Portugal',  10),
    ('Argentina',  8),
    ('Estados Unidos/Canadá', 6),
    ('Uruguai',    4),
    ('Espanha',    3)
  ) AS t(pais, qtd)
),
gerados_intl AS (
  SELECT
    'demo-geo-intl-' || i.pais || '-' || gs AS id,
    i.pais,
    NULL::text AS estado,
    NULL::text AS cidade,
    (SELECT pipeline_id FROM pipelines ORDER BY random() LIMIT 1) AS pipeline_id,
    (1 + floor(random() * 5))::int AS rating,
    now() - (random() * interval '120 days') AS created_at
  FROM internacional i
  CROSS JOIN LATERAL generate_series(1, i.qtd) AS gs
)
INSERT INTO leads_geografia (id, pais, estado, cidade, pipeline_id, rating, created_at, deletado)
SELECT id, pais, estado, cidade, pipeline_id, rating, created_at, false FROM gerados_br
UNION ALL
SELECT id, pais, estado, cidade, pipeline_id, rating, created_at, false FROM gerados_intl;

COMMIT;

-- Conferência pós-execução:
-- SELECT pais, count(*) FROM leads_geografia WHERE deletado = false GROUP BY pais ORDER BY count(*) DESC;
-- SELECT estado, count(*) FROM leads_geografia WHERE pais = 'Brasil' AND deletado = false GROUP BY estado ORDER BY count(*) DESC;
