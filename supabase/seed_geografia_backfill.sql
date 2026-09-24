-- =============================================================================
-- BACKFILL DE CIDADE — leads_geografia (DEMO)
-- =============================================================================
-- Problema: a maioria das linhas de leads_geografia tem `cidade` nula/vazia,
-- fazendo a tela de Mapa Geográfico (src/pages/MapaGeografico.tsx) mostrar
-- "Cidade não informada" como a entrada dominante ao abrir um estado.
--
-- Esta correção é só de PREENCHIMENTO DE ATRIBUTO: nenhuma linha é criada,
-- apagada, ou tem `pais`/`estado`/`uf`/`pipeline_id`/`rating` alterados — só a
-- coluna `cidade` é preenchida quando está nula/vazia, escolhendo uma cidade
-- plausível para o `uf` da linha, de forma DETERMINÍSTICA (hash do deal_id),
-- então idempotente: rodar de novo não muda o resultado.
--
-- Roda depois de seed_marketing_demo.sql (schema diferente, sem dependência
-- real entre os dois, mas por organização: marketing primeiro, depois CRM).
-- =============================================================================

BEGIN;

WITH pool AS (
  SELECT * FROM (VALUES
    ('SP', ARRAY['São Paulo','Campinas','Sorocaba','Ribeirão Preto','São José dos Campos','Americana']),
    ('MG', ARRAY['Belo Horizonte','Uberlândia','Juiz de Fora','Contagem','Divinópolis','Uberaba']),
    ('SC', ARRAY['Blumenau','Brusque','Jaraguá do Sul','Joinville','Florianópolis']),
    ('PR', ARRAY['Curitiba','Londrina','Maringá','Cascavel']),
    ('GO', ARRAY['Goiânia','Anápolis']),
    ('RJ', ARRAY['Rio de Janeiro','Nova Friburgo','Petrópolis']),
    ('RS', ARRAY['Porto Alegre','Caxias do Sul']),
    ('BA', ARRAY['Salvador','Feira de Santana','Vitória da Conquista']),
    ('PE', ARRAY['Recife','Caruaru','Petrolina']),
    ('CE', ARRAY['Fortaleza','Juazeiro do Norte','Sobral']),
    ('ES', ARRAY['Vitória','Vila Velha','Serra']),
    ('DF', ARRAY['Brasília']),
    ('MT', ARRAY['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Sorriso']),
    ('MS', ARRAY['Campo Grande','Dourados']),
    ('PA', ARRAY['Belém','Ananindeua']),
    ('AM', ARRAY['Manaus']),
    ('PB', ARRAY['João Pessoa','Campina Grande']),
    ('RN', ARRAY['Natal','Mossoró']),
    ('AL', ARRAY['Maceió']),
    ('SE', ARRAY['Aracaju']),
    ('PI', ARRAY['Teresina']),
    ('MA', ARRAY['São Luís']),
    ('TO', ARRAY['Palmas']),
    ('RO', ARRAY['Porto Velho']),
    ('AC', ARRAY['Rio Branco']),
    ('AP', ARRAY['Macapá']),
    ('RR', ARRAY['Boa Vista'])
  ) AS t(uf, cidades)
)
-- Match uf case/whitespace-insensitively: a prior run of this backfill left
-- Mato Grosso (and possibly other states) unfixed because the real `uf`
-- column value did not exactly equality-match the pool's uppercase 2-letter
-- code (e.g. trailing whitespace, or lowercase). upper(btrim(...)) makes the
-- match robust to both without assuming a specific stored format.
UPDATE leads_geografia lg
SET cidade = pool.cidades[1 + (abs(hashtext(lg.deal_id::text)) % array_length(pool.cidades, 1))]
FROM pool
WHERE pool.uf = upper(btrim(lg.uf))
  AND (lg.cidade IS NULL OR btrim(lg.cidade) = '' OR lg.cidade ILIKE 'cidade não informada' OR lg.cidade ILIKE 'nao informad%');

COMMIT;

-- Linhas cujo `uf` não está na lista acima (fora do Brasil, ou uf nula) ficam
-- sem cidade preenchida de propósito — é o "pequeno percentual residual sem
-- cidade" esperado, e não deve dominar mais nenhum estado listado acima.
