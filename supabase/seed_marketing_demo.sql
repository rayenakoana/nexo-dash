-- =============================================================================
-- SEED DE DADOS FICTÍCIOS — MÓDULOS DE MARKETING (DEMO)
-- =============================================================================
-- Preenche as tabelas do schema "wpp" (lido pelo frontend via supabaseWpp,
-- schema separado do Postgres principal — ver src/integrations/supabase/wppClient.ts)
-- com dados 100% fictícios, coerentes e com matemática consistente, cobrindo
-- Meta Ads, Instagram, E-mail Marketing e Campanhas WhatsApp para o período
-- de 2026-07-01 a 2026-09-30.
--
-- IDEMPOTENTE E DESTRUTIVO POR DESIGN: cada bloco APAGA TODAS AS LINHAS
-- PRÉ-EXISTENTES da tabela (TRUNCATE/DELETE sem WHERE) antes de inserir os
-- dados fictícios — não apenas linhas com IDs/nomes específicos. Rounds
-- anteriores usavam DELETE ... WHERE id IN (<uuids fixos>) ou
-- WHERE name ILIKE '%padrão%', o que NUNCA remove linhas reais pré-existentes
-- com IDs/nomes diferentes: o seed só empilhava linhas fictícias ao lado das
-- reais, e o frontend somava as duas. Todas as tabelas abaixo (schema "wpp")
-- pertencem inteiramente à integração de marketing lida por este dashboard —
-- não há nenhum outro consumidor legítimo dessas linhas — então é seguro
-- possuí-las por completo e apagar tudo antes de reinserir. Pode ser
-- executado quantas vezes for preciso sem duplicar dados. Nenhuma tabela nova
-- é criada: todas as tabelas abaixo já são
-- consultadas pelo frontend (src/hooks/useMetaAdsInsights.ts,
-- useInstagramInsights.ts, useEmailMarketing.ts, useWppCampanhasResumo.ts) e
-- presumidamente existem no schema "wpp" do projeto Supabase, gerenciado fora
-- das migrations deste repositório.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (projeto ligado ao
-- schema "wpp"). Requer a extensão pgcrypto/pgcrypto (gen_random_uuid()),
-- já habilitada por padrão em projetos Supabase.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) SCHEMA + TABELAS — só cria o que faltar
-- -----------------------------------------------------------------------------
-- Se o projeto Supabase de destino ainda não tem o schema "wpp" (ex.: um
-- projeto novo criado só para a DEMO, sem o pipeline n8n original que
-- normalmente alimenta essas tabelas), as instruções abaixo criam schema e
-- tabelas com exatamente as colunas que o frontend consome (ver
-- src/hooks/useMetaAdsInsights.ts, useInstagramInsights.ts,
-- useEmailMarketing.ts, useWppCampanhasResumo.ts). Tudo IF NOT EXISTS: se o
-- schema/tabelas já existirem (projeto original), este bloco não faz nada.
--
-- IMPORTANTE: depois de rodar este arquivo, se "wpp" for um schema NOVO,
-- vá em Supabase Dashboard → Project Settings → API → Data API →
-- "Exposed schemas" e adicione "wpp" na lista. Sem isso o PostgREST não
-- serve o schema pro frontend mesmo com as tabelas e dados corretos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS wpp;

CREATE TABLE IF NOT EXISTS wpp.meta_ads_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL,
  campaign_name   text NOT NULL,
  date_start      date NOT NULL,
  date_stop       date NOT NULL,
  impressions     integer NOT NULL DEFAULT 0,
  clicks          integer NOT NULL DEFAULT 0,
  spend           numeric NOT NULL DEFAULT 0,
  leads           integer NOT NULL DEFAULT 0,
  purchases       integer NOT NULL DEFAULT 0,
  purchase_value  numeric NOT NULL DEFAULT 0,
  cpl             numeric NOT NULL DEFAULT 0,
  roas            numeric NOT NULL DEFAULT 0,
  reach           integer,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wpp.instagram_account_daily (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id        text NOT NULL,
  username          text NOT NULL,
  date              date NOT NULL,
  followers_count   integer NOT NULL DEFAULT 0,
  media_count       integer NOT NULL DEFAULT 0,
  followers_gained  integer NOT NULL DEFAULT 0,
  followers_lost    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wpp.instagram_profile_daily (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id      text NOT NULL,
  username        text NOT NULL,
  date            date NOT NULL,
  profile_views   integer NOT NULL DEFAULT 0,
  website_clicks  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wpp.instagram_post_insights (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id         text NOT NULL,
  account_id      text NOT NULL,
  username        text NOT NULL,
  posted_at       timestamptz NOT NULL,
  media_type      text NOT NULL,
  permalink       text,
  caption         text,
  like_count      integer NOT NULL DEFAULT 0,
  comments_count  integer NOT NULL DEFAULT 0,
  shares          integer NOT NULL DEFAULT 0,
  saved           integer NOT NULL DEFAULT 0,
  reach           integer NOT NULL DEFAULT 0,
  impressions     integer NOT NULL DEFAULT 0,
  views           integer NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wpp.email_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  type                text NOT NULL,
  subject             text,
  sent_at             timestamptz,
  version             text NOT NULL DEFAULT 'v1',
  ab_group_id         uuid,
  recipients          integer NOT NULL DEFAULT 0,
  delivered           integer NOT NULL DEFAULT 0,
  delivery_rate       numeric NOT NULL DEFAULT 0,
  open_rate           numeric NOT NULL DEFAULT 0,
  click_rate          numeric NOT NULL DEFAULT 0,
  bounce_rate         numeric NOT NULL DEFAULT 0,
  spam_rate           numeric NOT NULL DEFAULT 0,
  unsubscribe_rate    numeric NOT NULL DEFAULT 0,
  engaged             integer NOT NULL DEFAULT 0,
  disengaged          integer NOT NULL DEFAULT 0,
  indeterminate       integer NOT NULL DEFAULT 0,
  invalid             integer NOT NULL DEFAULT 0,
  synced_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wpp.campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'completed',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wpp.campaign_sends (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id   uuid NOT NULL REFERENCES wpp.campaigns(id) ON DELETE CASCADE,
  status        text NOT NULL,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS + policy de leitura anônima (a mesma anon key do frontend precisa ler
-- essas tabelas). Se o projeto já tiver policies próprias, os comandos
-- abaixo são no-ops seguros (DROP POLICY IF EXISTS antes de recriar).
ALTER TABLE wpp.meta_ads_insights      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.instagram_account_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.instagram_profile_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.instagram_post_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.email_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpp.campaign_sends         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['meta_ads_insights','instagram_account_daily','instagram_profile_daily','instagram_post_insights','email_campaigns','campaigns','campaign_sends']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS wpp_demo_read ON wpp.%I', t);
    EXECUTE format('CREATE POLICY wpp_demo_read ON wpp.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- Reforço de permissões — RLS por si só NÃO libera leitura: o Postgres
-- também exige GRANT de USAGE no schema e SELECT nas tabelas para as roles
-- que o PostgREST usa (anon/authenticated), senão a query falha com
-- "permission denied" mesmo com a policy acima criada. Isso é a causa mais
-- comum de uma tabela nova de um schema customizado (que não é "public")
-- aparecer vazia/quebrada no frontend enquanto outras tabelas do mesmo
-- schema funcionam — cobrindo aqui também tabelas futuras (DEFAULT
-- PRIVILEGES), para não repetir esse problema em novos rounds.
GRANT USAGE ON SCHEMA wpp TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA wpp TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA wpp GRANT SELECT ON TABLES TO anon, authenticated;

SELECT setseed(0.4242);

-- -----------------------------------------------------------------------------
-- 1) META ADS — wpp.meta_ads_insights
-- -----------------------------------------------------------------------------
-- Duas contas fictícias, diferenciadas pelo prefixo do campaign_name (a tabela
-- não tem coluna de conta/account_id — o frontend agrupa só por campaign_id):
--   Conta A "Nexo Commerce | Principal" → prefixo "[Nexo Commerce]" (volume maior)
--   Conta B "Nexo Lab | Growth"         → prefixo "[Nexo Lab]"      (performance forte)
-- 3 campanhas por conta, granularidade diária, 2026-07-01 a 2026-09-30 (92 dias).

-- Blanket purge: remove ANY pre-existing row (real or previously-seeded),
-- not just the fixed demo campaign_ids, so any stale real Meta Ads campaign
-- (whatever its bracketed name tag) cannot survive alongside the fictitious
-- ones.
TRUNCATE TABLE wpp.meta_ads_insights RESTART IDENTITY;

WITH params AS (
  SELECT * FROM (VALUES
    ('11111111-1111-4111-8111-111111111101'::uuid, '[Nexo Commerce] Growth Setembro',       'A', 2200::numeric, 0.0090::numeric, 1.35::numeric, 0.045::numeric, 0.08::numeric,  780::numeric),
    ('11111111-1111-4111-8111-111111111102'::uuid, '[Nexo Commerce] Remarketing Growth',    'A',  900::numeric, 0.0140::numeric, 1.10::numeric, 0.090::numeric, 0.15::numeric,  780::numeric),
    ('11111111-1111-4111-8111-111111111103'::uuid, '[Nexo Commerce] Captação Setembro',     'A', 1500::numeric, 0.0070::numeric, 1.60::numeric, 0.055::numeric, 0.05::numeric,  780::numeric),
    ('22222222-2222-4222-8222-222222222201'::uuid, '[Nexo Lab] Scale Q3',                   'B', 3200::numeric, 0.0210::numeric, 0.85::numeric, 0.070::numeric, 0.22::numeric, 1450::numeric),
    ('22222222-2222-4222-8222-222222222202'::uuid, '[Nexo Lab] Workshop Performance',       'B', 2600::numeric, 0.0160::numeric, 0.95::numeric, 0.060::numeric, 0.12::numeric, 1450::numeric),
    ('22222222-2222-4222-8222-222222222203'::uuid, '[Nexo Lab] Retargeting Vídeo',          'B', 1100::numeric, 0.0280::numeric, 0.70::numeric, 0.130::numeric, 0.30::numeric, 1450::numeric)
  ) AS t(campaign_id, campaign_name, account, base_impr, base_ctr, base_cpc, conv_rate, purchase_rate, avg_ticket)
),
days AS (
  SELECT d::date AS d, (d::date - DATE '2026-07-01') AS day_idx, EXTRACT(DOW FROM d) AS dow
  FROM generate_series(DATE '2026-07-01', DATE '2026-09-30', interval '1 day') AS d
),
base AS (
  SELECT
    p.campaign_id, p.campaign_name, p.account, d.d AS date_start,
    p.base_impr, p.base_ctr, p.base_cpc, p.conv_rate, p.purchase_rate, p.avg_ticket,
    (1 + (d.day_idx::numeric / 92) * 0.30) AS trend,
    (CASE WHEN d.dow IN (0, 6) THEN 0.70 ELSE 1.0 END) AS dow_factor
  FROM params p CROSS JOIN days d
),
step1 AS (
  SELECT *, GREATEST(1, ROUND(base_impr * trend * dow_factor * (0.85 + random() * 0.30))) AS impressions
  FROM base
),
step2 AS (
  SELECT *, ROUND(impressions * (base_ctr * (0.80 + random() * 0.40))) AS clicks
  FROM step1
),
step3 AS (
  SELECT *,
    ROUND((clicks * (base_cpc * (0.85 + random() * 0.30)))::numeric, 2) AS spend,
    ROUND(clicks * conv_rate * (0.80 + random() * 0.40)) AS leads
  FROM step2
),
step4 AS (
  SELECT *, ROUND(leads * purchase_rate * (0.70 + random() * 0.60)) AS purchases
  FROM step3
),
step5 AS (
  SELECT *,
    ROUND((purchases * avg_ticket * (0.85 + random() * 0.30))::numeric, 2) AS purchase_value,
    ROUND(impressions / (1.3 + random() * 0.5)) AS reach
  FROM step4
)
INSERT INTO wpp.meta_ads_insights
  (campaign_id, campaign_name, date_start, date_stop, impressions, clicks, spend, leads, purchases, purchase_value, cpl, roas, reach, synced_at)
SELECT
  campaign_id, campaign_name, date_start, date_start,
  impressions::integer, clicks::integer, spend, leads::integer, purchases::integer, purchase_value,
  CASE WHEN leads > 0 THEN ROUND((spend / leads)::numeric, 2) ELSE 0 END,
  CASE WHEN spend > 0 THEN ROUND((purchase_value / spend)::numeric, 2) ELSE 0 END,
  reach::integer, now()
FROM step5;

-- -----------------------------------------------------------------------------
-- 2) INSTAGRAM — wpp.instagram_account_daily / instagram_profile_daily / instagram_post_insights
-- -----------------------------------------------------------------------------
-- Duas contas: os usernames abaixo são os mesmos já hard-coded no frontend
-- (src/components/MarketingSection.tsx: ACCOUNT_LABEL, filtro de conta), por
-- isso são reaproveitados tal como estão no código-fonte para que o filtro de
-- conta e os KPIs "@NC" / "@NL" funcionem sem alterar a UI.
--   nexocommerce → conta principal (base maior, alcance/volume maior)
--   nexolab      → conta menor, com engajamento proporcional mais alto

-- Blanket purge: remove ANY pre-existing rows, not just the fixed demo
-- account_ids. Real Instagram accounts/captions and their historical rows
-- must not remain alongside the fictitious nexocommerce/nexolab rows — this
-- is also what fixes the "Todas" vs. per-account filter mismatch (the
-- account filter in src/components/MarketingSection.tsx matches on the exact
-- `username` string 'nexocommerce'/'nexolab'; any leftover username from an
-- earlier fictitious-handle round or a real handle would count toward
-- "Todas" but match zero rows when a specific account button is selected).
TRUNCATE TABLE wpp.instagram_account_daily RESTART IDENTITY;
TRUNCATE TABLE wpp.instagram_profile_daily RESTART IDENTITY;
TRUNCATE TABLE wpp.instagram_post_insights RESTART IDENTITY;

WITH accounts AS (
  SELECT * FROM (VALUES
    ('33333333-3333-4333-8333-333333333301'::uuid, 'nexocommerce', 26800::numeric, 340::numeric, 68::numeric, 26::numeric, 22::numeric, 12::numeric),
    ('33333333-3333-4333-8333-333333333302'::uuid, 'nexolab',      18400::numeric, 120::numeric, 40::numeric, 18::numeric, 14::numeric, 8::numeric)
  ) AS t(account_id, username, start_followers, start_media, avg_gain, gain_var, avg_loss, loss_var)
),
days AS (
  SELECT d::date AS d, (d::date - DATE '2026-07-01') AS day_idx
  FROM generate_series(DATE '2026-07-01', DATE '2026-09-30', interval '1 day') AS d
),
raw AS (
  SELECT
    a.account_id, a.username, d.d AS date, d.day_idx, a.start_followers, a.start_media,
    GREATEST(0, ROUND(a.avg_gain + (random() * 2 - 1) * a.gain_var)) AS followers_gained,
    GREATEST(0, ROUND(a.avg_loss + (random() * 2 - 1) * a.loss_var)) AS followers_lost
  FROM accounts a CROSS JOIN days d
),
cum AS (
  SELECT *,
    (start_followers + SUM(followers_gained - followers_lost) OVER (PARTITION BY account_id ORDER BY date))::integer AS followers_count,
    (start_media + FLOOR(day_idx / 2))::integer AS media_count
  FROM raw
)
INSERT INTO wpp.instagram_account_daily (account_id, username, date, followers_count, media_count, followers_gained, followers_lost)
SELECT account_id, username, date, followers_count, media_count, followers_gained::integer, followers_lost::integer
FROM cum;

INSERT INTO wpp.instagram_profile_daily (account_id, username, date, profile_views, website_clicks)
SELECT
  account_id, username, date,
  ROUND(followers_count * (0.008 + random() * 0.010))::integer AS profile_views,
  ROUND(followers_count * (0.0008 + random() * 0.0012))::integer AS website_clicks
FROM wpp.instagram_account_daily
WHERE account_id IN ('33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333302');

WITH accounts AS (
  SELECT * FROM (VALUES
    ('33333333-3333-4333-8333-333333333301'::uuid, 'nexocommerce', 32000::numeric, 1.00::numeric),
    ('33333333-3333-4333-8333-333333333302'::uuid, 'nexolab',      21000::numeric, 1.55::numeric)
  ) AS t(account_id, username, base_reach, eng_multiplier)
),
posts AS (
  SELECT
    a.account_id, a.username, a.base_reach, a.eng_multiplier, gs AS post_idx,
    (TIMESTAMP '2026-07-01 08:00:00' + (gs * interval '2.5 days') + (make_interval(hours => (8 + (gs % 11))))) AS posted_at
  FROM accounts a CROSS JOIN generate_series(0, 36) gs
),
enriched AS (
  SELECT *, (ARRAY['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'])[1 + (post_idx % 3)] AS media_type
  FROM posts
)
INSERT INTO wpp.instagram_post_insights
  (post_id, account_id, username, posted_at, media_type, permalink, caption, like_count, comments_count, shares, saved, reach, impressions, views, synced_at)
SELECT
  gen_random_uuid()::text,
  account_id, username, posted_at, media_type,
  'https://instagram.com/p/demo' || REPLACE(gen_random_uuid()::text, '-', ''),
  CASE media_type
    WHEN 'VIDEO'           THEN 'Bastidores do time hoje 🚀 #growth #ecommerce #bastidores'
    WHEN 'CAROUSEL_ALBUM'  THEN '5 erros que travam o crescimento do seu negócio digital 👇 #growth #performance'
    ELSE                        'Nova turma com vagas abertas! Resultado que o cliente sente. #growth #performance'
  END,
  ROUND(base_reach * eng_multiplier * (0.020 + random() * 0.050))::integer AS like_count,
  ROUND(base_reach * eng_multiplier * (0.0010 + random() * 0.0040))::integer AS comments_count,
  ROUND(base_reach * eng_multiplier * (0.0005 + random() * 0.0020))::integer AS shares,
  ROUND(base_reach * eng_multiplier * (0.0020 + random() * 0.0060))::integer AS saved,
  ROUND(base_reach * (0.80 + random() * 0.50))::integer AS reach,
  ROUND(base_reach * (1.10 + random() * 0.60))::integer AS impressions,
  CASE WHEN media_type = 'VIDEO' THEN ROUND(base_reach * (1.50 + random() * 1.50))::integer ELSE 0 END AS views,
  now()
FROM enriched;

-- -----------------------------------------------------------------------------
-- 3) E-MAIL MARKETING — wpp.email_campaigns
-- -----------------------------------------------------------------------------
-- ~51 campanhas (45 regulares + 3 pares A/B = 6) espalhadas de 2026-07-01 a
-- 2026-09-30, alternando newsletter/comercial, com matemática consistente
-- (delivered a partir de delivery_rate; bounce_rate = 100 - delivery_rate).

-- Blanket purge: remove ALL pre-existing rows, not just ones matching a
-- specific name prefix in the demo date range.
TRUNCATE TABLE wpp.email_campaigns RESTART IDENTITY;

WITH idx AS (
  SELECT gs AS i FROM generate_series(0, 44) gs
),
rows1 AS (
  SELECT
    i,
    (TIMESTAMP '2026-07-01 07:30:00' + (i * interval '2 days') + (make_interval(hours => (i % 5)))) AS sent_at,
    CASE WHEN i % 2 = 0 THEN 'commercial' ELSE 'news' END AS type,
    (ARRAY[
      'Newsletter #09 — Tendências de Mercado',
      'Growth — Últimas vagas',
      'Scale — Case de crescimento',
      'Workshop — Convite',
      'Newsletter #10 — Estratégias de vendas',
      'Guia rápido: precificação sem perder margem',
      'Convite exclusivo: Consultoria de Performance de Setembro',
      'O erro nº 1 que trava o crescimento de negócios digitais pequenos',
      'Última chamada — inscrições encerram hoje',
      'Case de sucesso: de 3 para 12 pessoas no time em 1 ano'
    ])[1 + (i % 10)] AS subject,
    (ARRAY[
      'Nexo Commerce: Newsletter Semanal',
      'Nexo Commerce: Oferta Comercial',
      'Nexo Commerce: Convite Evento',
      'Nexo Commerce: Conteúdo Educativo',
      'Nexo Commerce: Lembrete Turma'
    ])[1 + (i % 5)] || ' #' || (i + 1) AS name
  FROM idx
),
rows2 AS (
  SELECT
    *,
    (3200 + (random() * 2000))::numeric AS recipients_f,
    (96.0 + random() * 3.4)::numeric AS delivery_rate_f,
    (CASE WHEN type = 'news' THEN 22 + random() * 16 ELSE 16 + random() * 14 END)::numeric AS open_rate_f,
    (CASE WHEN type = 'news' THEN 1.8 + random() * 2.5 ELSE 1.2 + random() * 2.0 END)::numeric AS click_rate_f,
    (0.02 + random() * 0.12)::numeric AS spam_rate_f,
    (0.05 + random() * 0.55)::numeric AS unsubscribe_rate_f
  FROM rows1
),
rows3 AS (
  SELECT
    *,
    ROUND(recipients_f)::integer AS recipients,
    ROUND(recipients_f * delivery_rate_f / 100)::integer AS delivered
  FROM rows2
)
INSERT INTO wpp.email_campaigns
  (name, type, subject, sent_at, version, ab_group_id, recipients, delivered, delivery_rate, open_rate, click_rate,
   bounce_rate, spam_rate, unsubscribe_rate, engaged, disengaged, indeterminate, invalid, synced_at)
SELECT
  name, type, subject, sent_at, 'general', NULL,
  recipients, delivered,
  ROUND(delivery_rate_f, 2), ROUND(open_rate_f, 2), ROUND(click_rate_f, 2),
  ROUND(100 - delivery_rate_f, 2), ROUND(spam_rate_f, 3), ROUND(unsubscribe_rate_f, 3),
  ROUND(delivered * open_rate_f / 100)::integer AS engaged,
  GREATEST(0, delivered - ROUND(delivered * open_rate_f / 100)::integer - ROUND(delivered * unsubscribe_rate_f / 100)::integer) AS disengaged,
  ROUND(recipients * 0.01)::integer AS indeterminate,
  (recipients - delivered) AS invalid,
  now()
FROM rows3;

-- 3 pares de teste A/B (6 campanhas adicionais), datas fixas dentro do período
WITH ab AS (
  SELECT * FROM (VALUES
    (gen_random_uuid(), 'Nexo Commerce: Teste A/B Lançamento Julho',   TIMESTAMP '2026-07-15 08:00:00', 'commercial'),
    (gen_random_uuid(), 'Nexo Commerce: Teste A/B Newsletter Agosto',  TIMESTAMP '2026-08-12 07:45:00', 'news'),
    (gen_random_uuid(), 'Nexo Commerce: Teste A/B Oferta Setembro',    TIMESTAMP '2026-09-10 08:15:00', 'commercial')
  ) AS t(ab_group_id, base_name, sent_at, type)
),
variants AS (
  SELECT ab.*, v.version, v.subject_suffix, v.open_boost, v.click_boost
  FROM ab CROSS JOIN (VALUES
    ('A', ' — Assunto direto',  0.0, 0.0),
    ('B', ' — Assunto com gatilho de urgência', 4.5, 0.8)
  ) AS v(version, subject_suffix, open_boost, click_boost)
),
computed AS (
  SELECT
    *,
    (3800 + random() * 1500)::numeric AS recipients_f,
    (97.0 + random() * 2.5)::numeric AS delivery_rate_f,
    (20 + random() * 12 + open_boost)::numeric AS open_rate_f,
    (1.5 + random() * 2.2 + click_boost)::numeric AS click_rate_f,
    (0.02 + random() * 0.08)::numeric AS spam_rate_f,
    (0.08 + random() * 0.35)::numeric AS unsubscribe_rate_f
  FROM variants
),
final AS (
  SELECT *, ROUND(recipients_f)::integer AS recipients, ROUND(recipients_f * delivery_rate_f / 100)::integer AS delivered
  FROM computed
)
INSERT INTO wpp.email_campaigns
  (name, type, subject, sent_at, version, ab_group_id, recipients, delivered, delivery_rate, open_rate, click_rate,
   bounce_rate, spam_rate, unsubscribe_rate, engaged, disengaged, indeterminate, invalid, synced_at)
SELECT
  base_name || ' (' || version || ')', type, base_name || subject_suffix, sent_at, version, ab_group_id,
  recipients, delivered,
  ROUND(delivery_rate_f, 2), ROUND(open_rate_f, 2), ROUND(click_rate_f, 2),
  ROUND(100 - delivery_rate_f, 2), ROUND(spam_rate_f, 3), ROUND(unsubscribe_rate_f, 3),
  ROUND(delivered * open_rate_f / 100)::integer AS engaged,
  GREATEST(0, delivered - ROUND(delivered * open_rate_f / 100)::integer - ROUND(delivered * unsubscribe_rate_f / 100)::integer) AS disengaged,
  ROUND(recipients * 0.01)::integer AS indeterminate,
  (recipients - delivered) AS invalid,
  now()
FROM final;

-- -----------------------------------------------------------------------------
-- 4) WHATSAPP — wpp.campaigns / wpp.campaign_sends
-- -----------------------------------------------------------------------------
-- 12 campanhas espalhadas de 2026-07-01 a 2026-09-20, 2.000-15.000 envios cada,
-- com taxa de entrega/leitura variando por campanha (entrega 90-98%, leitura
-- 65-90% do entregue) para não repetir os mesmos números em todas.
-- Blanket purge: remove ALL pre-existing rows in both tables (child table
-- first for FK safety), not just the fixed demo campaign ids or names
-- matching a known dev/test campaign pattern. This is what actually removes
-- any stale real or dev/test campaign, regardless of its id or name.
DELETE FROM wpp.campaign_sends;
DELETE FROM wpp.campaigns;

WITH camp AS (
  SELECT * FROM (VALUES
    ('44444444-4444-4444-8444-444444444401'::uuid, 'Growth — Convite',                   TIMESTAMP '2026-07-02 09:00:00',  4200, 0.94::numeric, 0.78::numeric),
    ('44444444-4444-4444-8444-444444444402'::uuid, 'Remarketing Growth',                 TIMESTAMP '2026-07-09 10:00:00', 11350, 0.91::numeric, 0.69::numeric),
    ('44444444-4444-4444-8444-444444444403'::uuid, 'Workshop — Últimas vagas',           TIMESTAMP '2026-07-18 14:00:00',  6890, 0.95::numeric, 0.82::numeric),
    ('44444444-4444-4444-8444-444444444404'::uuid, 'Scale — Follow-up',                  TIMESTAMP '2026-07-27 09:30:00',  3610, 0.97::numeric, 0.74::numeric),
    ('44444444-4444-4444-8444-444444444405'::uuid, 'Newsletter — Conteúdo',              TIMESTAMP '2026-08-05 11:00:00',  5740, 0.92::numeric, 0.71::numeric),
    ('44444444-4444-4444-8444-444444444406'::uuid, 'Remarketing — Leads interessados',   TIMESTAMP '2026-08-13 15:00:00',  2980, 0.96::numeric, 0.88::numeric),
    ('44444444-4444-4444-8444-444444444407'::uuid, 'Scale Q3 — Promoção Relâmpago',      TIMESTAMP '2026-08-20 09:00:00', 14680, 0.90::numeric, 0.66::numeric),
    ('44444444-4444-4444-8444-444444444408'::uuid, 'Growth — Convite Live',              TIMESTAMP '2026-08-28 16:00:00',  2460, 0.98::numeric, 0.85::numeric),
    ('44444444-4444-4444-8444-444444444409'::uuid, 'Growth Setembro — Lançamento',       TIMESTAMP '2026-09-03 09:00:00', 15200, 0.93::numeric, 0.73::numeric),
    ('44444444-4444-4444-8444-444444444410'::uuid, 'Workshop — Follow-up Pós-Evento',    TIMESTAMP '2026-09-10 10:30:00',  4780, 0.95::numeric, 0.80::numeric),
    ('44444444-4444-4444-8444-444444444411'::uuid, 'Newsletter — Oferta Última Chamada', TIMESTAMP '2026-09-16 08:00:00',  7950, 0.91::numeric, 0.67::numeric),
    ('44444444-4444-4444-8444-444444444412'::uuid, 'Scale — Alerta Vagas Limitadas',     TIMESTAMP '2026-09-20 09:00:00',  3630, 0.97::numeric, 0.90::numeric)
  ) AS t(id, name, created_at, total_target, delivery_rate, read_of_delivered)
)
INSERT INTO wpp.campaigns (id, name, status, created_at)
SELECT id, name, CASE WHEN created_at > TIMESTAMP '2026-09-19' THEN 'firing' ELSE 'completed' END, created_at
FROM camp;

WITH camp AS (
  SELECT id AS campaign_id, name, created_at AS base_time, total_target, delivery_rate, read_of_delivered
  FROM (VALUES
    ('44444444-4444-4444-8444-444444444401'::uuid, 'Growth — Convite',                   TIMESTAMP '2026-07-02 09:00:00',  4200, 0.94::numeric, 0.78::numeric),
    ('44444444-4444-4444-8444-444444444402'::uuid, 'Remarketing Growth',                 TIMESTAMP '2026-07-09 10:00:00', 11350, 0.91::numeric, 0.69::numeric),
    ('44444444-4444-4444-8444-444444444403'::uuid, 'Workshop — Últimas vagas',           TIMESTAMP '2026-07-18 14:00:00',  6890, 0.95::numeric, 0.82::numeric),
    ('44444444-4444-4444-8444-444444444404'::uuid, 'Scale — Follow-up',                  TIMESTAMP '2026-07-27 09:30:00',  3610, 0.97::numeric, 0.74::numeric),
    ('44444444-4444-4444-8444-444444444405'::uuid, 'Newsletter — Conteúdo',              TIMESTAMP '2026-08-05 11:00:00',  5740, 0.92::numeric, 0.71::numeric),
    ('44444444-4444-4444-8444-444444444406'::uuid, 'Remarketing — Leads interessados',   TIMESTAMP '2026-08-13 15:00:00',  2980, 0.96::numeric, 0.88::numeric),
    ('44444444-4444-4444-8444-444444444407'::uuid, 'Scale Q3 — Promoção Relâmpago',      TIMESTAMP '2026-08-20 09:00:00', 14680, 0.90::numeric, 0.66::numeric),
    ('44444444-4444-4444-8444-444444444408'::uuid, 'Growth — Convite Live',              TIMESTAMP '2026-08-28 16:00:00',  2460, 0.98::numeric, 0.85::numeric),
    ('44444444-4444-4444-8444-444444444409'::uuid, 'Growth Setembro — Lançamento',       TIMESTAMP '2026-09-03 09:00:00', 15200, 0.93::numeric, 0.73::numeric),
    ('44444444-4444-4444-8444-444444444410'::uuid, 'Workshop — Follow-up Pós-Evento',    TIMESTAMP '2026-09-10 10:30:00',  4780, 0.95::numeric, 0.80::numeric),
    ('44444444-4444-4444-8444-444444444411'::uuid, 'Newsletter — Oferta Última Chamada', TIMESTAMP '2026-09-16 08:00:00',  7950, 0.91::numeric, 0.67::numeric),
    ('44444444-4444-4444-8444-444444444412'::uuid, 'Scale — Alerta Vagas Limitadas',     TIMESTAMP '2026-09-20 09:00:00',  3630, 0.97::numeric, 0.90::numeric)
  ) AS t(id, name, created_at, total_target, delivery_rate, read_of_delivered)
),
sends AS (
  SELECT
    c.campaign_id,
    (c.base_time + (gs || ' seconds')::interval) AS sent_at,
    random() AS r,
    c.delivery_rate,
    -- fração do total que fica "lida" (entregue*read_of_delivered) vs. só entregue vs. falha
    (c.delivery_rate * c.read_of_delivered) AS read_frac
  FROM camp c CROSS JOIN LATERAL generate_series(1, c.total_target) AS gs
)
INSERT INTO wpp.campaign_sends (campaign_id, status, sent_at, created_at)
SELECT
  campaign_id,
  CASE
    WHEN r < read_frac THEN 'read'
    WHEN r < delivery_rate THEN 'delivered'
    WHEN r < delivery_rate + (1 - delivery_rate) * 0.60 THEN 'sent'
    ELSE 'failed'
  END,
  sent_at, sent_at
FROM sends;

COMMIT;

-- =============================================================================
-- Fim do seed. Cada bloco acima faz TRUNCATE/DELETE sem WHERE na tabela
-- inteira antes de inserir — qualquer linha real ou de rounds anteriores é
-- removida, não só as de ID/nome fixo. Resumo aproximado de linhas inseridas:
--   wpp.meta_ads_insights        : 6 campanhas x 92 dias  = 552 linhas
--   wpp.instagram_account_daily  : 2 contas   x 92 dias   = 184 linhas
--   wpp.instagram_profile_daily  : 2 contas   x 92 dias   = 184 linhas
--   wpp.instagram_post_insights  : 2 contas   x 37 posts  =  74 linhas
--   wpp.email_campaigns          : 45 + 6 (A/B)           =  51 linhas
--   wpp.campaigns                : 12 linhas
--   wpp.campaign_sends           : soma dos total_target  ≈ 83.470 linhas
-- =============================================================================
