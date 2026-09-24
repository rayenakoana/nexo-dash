-- =============================================================================
-- BACKFILL DE CIDADE — leads_geografia (DEMO)
-- =============================================================================
-- Problema: a maioria das linhas de leads_geografia tem `cidade` nula/vazia,
-- fazendo a tela de Mapa Geográfico (src/pages/MapaGeografico.tsx) mostrar
-- "Cidade não informada" como a entrada dominante ao abrir um estado.
--
-- Esquema REAL confirmado via information_schema.columns neste projeto
-- (diferente da interface TS em src/hooks/useLeadsGeografia.ts, que é mais
-- ampla — provavelmente reflete outro ambiente/versão futura da tabela):
--   id (text, chave), rating (integer), pipeline_id (text), deletado (boolean),
--   pais (text), estado (text), cidade (text), created_at (timestamptz).
-- Não existem `deal_id`, `uf`, `regiao`, `estado_organizacao` nesta tabela —
-- tentativas anteriores deste arquivo assumiram esses nomes e quebraram
-- ("column lg.uf does not exist", depois "column lg.deal_id does not exist").
-- O componente MapaGeografico.tsx agrupa por `estado` (não por `uf`), então
-- é essa coluna que precisa casar com o pool de cidades abaixo.
--
-- `estado` pode estar armazenado como nome completo ("Minas Gerais") ou como
-- sigla ("MG") dependendo de como o seed comercial/funil (já existente e não
-- mexido por esta tarefa) populou os leads — não temos certeza de qual. Por
-- isso o pool cobre AMBOS os formatos por estado, casando de forma
-- case-insensitive e sem acentuação (unaccent) para não depender de
-- maiúsculas/minúsculas ou grafia exata.
--
-- Esta correção é só de PREENCHIMENTO DE ATRIBUTO: nenhuma linha é criada,
-- apagada, ou tem `pais`/`estado`/`pipeline_id`/`rating` alterados — só a
-- coluna `cidade` é preenchida quando está nula/vazia/"Cidade não informada",
-- escolhendo uma cidade plausível de forma DETERMINÍSTICA (hash do `id`),
-- então idempotente: rodar de novo não muda o resultado.
--
-- Roda depois de seed_marketing_demo.sql (schema diferente, sem dependência
-- real entre os dois, mas por organização: marketing primeiro, depois CRM).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

WITH estados AS (
  SELECT * FROM (VALUES
    ('SP', 'São Paulo',           ARRAY['São Paulo','Campinas','Sorocaba','Ribeirão Preto','São José dos Campos','Americana']),
    ('MG', 'Minas Gerais',        ARRAY['Belo Horizonte','Uberlândia','Juiz de Fora','Contagem','Divinópolis','Uberaba']),
    ('SC', 'Santa Catarina',      ARRAY['Blumenau','Brusque','Jaraguá do Sul','Joinville','Florianópolis']),
    ('PR', 'Paraná',              ARRAY['Curitiba','Londrina','Maringá','Cascavel']),
    ('GO', 'Goiás',               ARRAY['Goiânia','Anápolis']),
    ('RJ', 'Rio de Janeiro',      ARRAY['Rio de Janeiro','Nova Friburgo','Petrópolis']),
    ('RS', 'Rio Grande do Sul',   ARRAY['Porto Alegre','Caxias do Sul']),
    ('BA', 'Bahia',               ARRAY['Salvador','Feira de Santana','Vitória da Conquista']),
    ('PE', 'Pernambuco',          ARRAY['Recife','Caruaru','Petrolina']),
    ('CE', 'Ceará',               ARRAY['Fortaleza','Juazeiro do Norte','Sobral']),
    ('ES', 'Espírito Santo',      ARRAY['Vitória','Vila Velha','Serra']),
    ('DF', 'Distrito Federal',    ARRAY['Brasília']),
    ('MT', 'Mato Grosso',         ARRAY['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Sorriso']),
    ('MS', 'Mato Grosso do Sul',  ARRAY['Campo Grande','Dourados']),
    ('PA', 'Pará',                ARRAY['Belém','Ananindeua']),
    ('AM', 'Amazonas',            ARRAY['Manaus']),
    ('PB', 'Paraíba',             ARRAY['João Pessoa','Campina Grande']),
    ('RN', 'Rio Grande do Norte', ARRAY['Natal','Mossoró']),
    ('AL', 'Alagoas',             ARRAY['Maceió']),
    ('SE', 'Sergipe',             ARRAY['Aracaju']),
    ('PI', 'Piauí',               ARRAY['Teresina']),
    ('MA', 'Maranhão',            ARRAY['São Luís']),
    ('TO', 'Tocantins',           ARRAY['Palmas']),
    ('RO', 'Rondônia',            ARRAY['Porto Velho']),
    ('AC', 'Acre',                ARRAY['Rio Branco']),
    ('AP', 'Amapá',               ARRAY['Macapá']),
    ('RR', 'Roraima',             ARRAY['Boa Vista'])
  ) AS t(uf, nome, cidades)
),
-- Cada estado gera duas chaves de casamento possíveis (sigla e nome
-- completo), normalizadas (minúsculo, sem acento, sem espaço nas pontas),
-- ambas apontando para a mesma lista de cidades.
pool AS (
  SELECT unaccent(lower(btrim(uf)))   AS chave, cidades FROM estados
  UNION ALL
  SELECT unaccent(lower(btrim(nome))) AS chave, cidades FROM estados
)
UPDATE leads_geografia lg
SET cidade = pool.cidades[1 + (abs(hashtext(lg.id::text)) % array_length(pool.cidades, 1))]
FROM pool
WHERE pool.chave = unaccent(lower(btrim(lg.estado)))
  AND (lg.cidade IS NULL OR btrim(lg.cidade) = '' OR lg.cidade ILIKE 'cidade não informada' OR lg.cidade ILIKE 'nao informad%');

COMMIT;

-- Linhas cujo `estado` não bate com nenhuma sigla/nome acima (fora do
-- Brasil, ou estado nulo/grafado de forma muito diferente) ficam sem cidade
-- preenchida de propósito — é o "pequeno percentual residual sem cidade"
-- esperado, e não deve dominar mais nenhum estado listado acima.
--
-- Diagnóstico pós-execução: rode a query abaixo para conferir se sobrou
-- algum estado com `cidade` ainda vazia em volume relevante — se sobrar,
-- provavelmente é uma grafia de `estado` fora do pool acima (ex. "Sao Paulo"
-- sem acento já é coberto pelo unaccent, mas um erro de digitação não seria).
--
-- SELECT estado, count(*) FILTER (WHERE cidade IS NULL OR btrim(cidade) = '') AS sem_cidade, count(*) AS total
-- FROM leads_geografia WHERE pais = 'Brasil' GROUP BY estado ORDER BY sem_cidade DESC;
