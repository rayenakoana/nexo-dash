-- =============================================================================
-- SANITIZAÇÃO DE NOMES DE FUNIL REAIS — coluna `funil` (texto) nas tabelas
-- `public.vendas`, `public.configuracoes` (linhas tipo='Meta Funil'/'Meta
-- Funil Qtd', que carregam a meta de cada funil) e `public.metricas_diarias`.
-- =============================================================================
-- Sintoma relatado: o card "Meta x Vendido por Funil" (src/components/
-- MetaXVendidoFunil.tsx) ainda mostra os 4 nomes reais de funil que restavam
-- na coluna `vendas.funil`. Investigação:
--
--   MetaXVendidoFunil.tsx agrupa `vendas` por `v.funil` (NÃO por
--   `v.produto`) e casa com `funisVisiveis` (de useFunisVisiveis(), que lê
--   `configuracoes` tipo='Funil'). A migration
--   20260924000000_sanitiza_nomes_funil_demo.sql já trocou o VALOR de
--   configuracoes.tipo='Funil' → 'Workshop Growth' / 'Membership Legado'
--   (nomes que não batem exatamente com FUNIS_ORDEM_CANONICA em
--   src/lib/funis.ts!) — mas nunca tocou a coluna `funil` da própria tabela
--   `vendas` (nem de `configuracoes` tipo='Meta Funil'/'Meta Funil Qtd', nem
--   de `metricas_diarias`), que é de onde os valores do card realmente vêm.
--   Por isso o card seguia mostrando os nomes reais das vendas, mesmo com a
--   lista de opções do filtro já "corrigida" (incorretamente, com sufixos
--   extras) em outro lugar.
--
-- Mapeamento real → fictício abaixo usa os 5 nomes canônicos de
-- src/lib/funis.ts::FUNIS_ORDEM_CANONICA, mesmos PIPELINE_IDS usados pelos
-- leads fictícios de seed_geografia_leads.sql (o pipeline_id do funil real
-- que virou "Workshop" já batia com o pipeline_id de "Workshop" em
-- src/lib/funis.ts, documentado na migration 20260804133530).
--
-- IDEMPOTENTE: cada UPDATE casa só o nome real (WHERE funil/valor = 'X'),
-- então rodar de novo é inócuo depois da primeira execução. Roda no banco
-- PRINCIPAL (schema "public"), não no schema "wpp".
--
-- IMPORTANTE: este arquivo corrige a coluna `funil` que alimenta os cards e
-- filtros. Ele TAMBÉM corrige de novo (com os nomes canônicos corretos, sem
-- sufixo) a lista de opções em configuracoes tipo='Funil', substituindo a
-- correção incompleta da migration 20260924000000, para que
-- useFunisVisiveis()/FUNIS_ORDEM_CANONICA fiquem 100% alinhados — isso
-- também é pré-requisito para o Mapa Geográfico (MapaGeografico.tsx) filtrar
-- corretamente por funil/pipeline_id.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) configuracoes (tipo='Funil') — lista de opções do filtro de Funil.
--    Sobrescreve a correção parcial da migration 20260924000000 (que deixou
--    'Workshop Growth' / 'Membership Legado', nomes fora de
--    FUNIS_ORDEM_CANONICA) com os nomes canônicos exatos.
-- -----------------------------------------------------------------------------
UPDATE configuracoes SET valor = 'Workshop'
WHERE tipo = 'Funil' AND valor IN ('Supplytex', 'SUPPLYTEX', 'Workshop Growth');

UPDATE configuracoes SET valor = 'Membership'
WHERE tipo = 'Funil' AND valor IN ('UniForce', 'Membership Legado');

UPDATE configuracoes SET valor = 'Imersão Premium'
WHERE tipo = 'Funil' AND valor IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai');

UPDATE configuracoes SET valor = 'Consultoria'
WHERE tipo = 'Funil' AND valor IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE configuracoes SET valor = 'Expansão'
WHERE tipo = 'Funil' AND valor IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

-- Evita duas linhas 'Funil' com o mesmo valor final após o merge acima
-- (ex.: se já existisse uma linha 'Workshop' e outra virou 'Workshop' agora).
DELETE FROM configuracoes a USING configuracoes b
WHERE a.tipo = 'Funil' AND b.tipo = 'Funil'
  AND a.valor = b.valor AND a.ctid > b.ctid;

-- -----------------------------------------------------------------------------
-- 2) vendas.funil — mesma renomeação aplicada a cada linha de venda/deal
-- -----------------------------------------------------------------------------
UPDATE vendas SET funil = 'Workshop'
WHERE funil IN ('Supplytex', 'SUPPLYTEX');

UPDATE vendas SET funil = 'Membership'
WHERE funil IN ('UniForce');

UPDATE vendas SET funil = 'Imersão Premium'
WHERE funil IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai');

UPDATE vendas SET funil = 'Consultoria'
WHERE funil IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE vendas SET funil = 'Expansão'
WHERE funil IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

-- -----------------------------------------------------------------------------
-- 3) configuracoes.funil — REMOVIDO. Confirmado via information_schema.columns
--    neste projeto que a tabela `configuracoes` real só tem (id, tipo, valor)
--    — não existe coluna `funil` nem `mes_ref`. A feature de "meta por funil"
--    com granularidade própria (que MetaXVendidoFunil.tsx tenta ler via
--    m.funil/m.mes_ref) não está presente neste schema; não há nada para
--    sanitizar aqui. (Erro original: "column funil does not exist" na
--    tentativa de UPDATE configuracoes SET funil = ...).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4) metricas_diarias.funil — métricas diárias de leads por funil (usada em
--    src/pages/GestaoSafras.tsx, src/pages/InputDiario.tsx, src/pages/Index.tsx)
-- -----------------------------------------------------------------------------
UPDATE metricas_diarias SET funil = 'Workshop'
WHERE funil IN ('Supplytex', 'SUPPLYTEX');

UPDATE metricas_diarias SET funil = 'Membership'
WHERE funil IN ('UniForce');

UPDATE metricas_diarias SET funil = 'Imersão Premium'
WHERE funil IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai');

UPDATE metricas_diarias SET funil = 'Consultoria'
WHERE funil IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE metricas_diarias SET funil = 'Expansão'
WHERE funil IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

-- Mescla possíveis duplicatas de UNIQUE(data, funil) geradas pelo rename acima
-- (ex.: já existia uma linha 'Workshop' no mesmo dia da linha renomeada).
-- Mantém a linha mais recente e soma os totais das duplicadas nela antes de
-- apagar as demais, para não perder volume de leads.
WITH duplicadas AS (
  SELECT data, funil, array_agg(id ORDER BY created_at DESC) AS ids,
         SUM(leads_recebidos) AS soma_recebidos,
         SUM(leads_qualificados) AS soma_qualificados,
         SUM(reunioes_agendadas) AS soma_agendadas,
         SUM(reunioes_confirmadas) AS soma_confirmadas,
         SUM(compareceram_real) AS soma_compareceram
  FROM metricas_diarias
  GROUP BY data, funil
  HAVING count(*) > 1
)
UPDATE metricas_diarias m SET
  leads_recebidos = d.soma_recebidos,
  leads_qualificados = d.soma_qualificados,
  reunioes_agendadas = d.soma_agendadas,
  reunioes_confirmadas = d.soma_confirmadas,
  compareceram_real = d.soma_compareceram
FROM duplicadas d
WHERE m.id = d.ids[1];

DELETE FROM metricas_diarias m USING (
  SELECT data, funil, array_agg(id ORDER BY created_at DESC) AS ids
  FROM metricas_diarias GROUP BY data, funil HAVING count(*) > 1
) d
WHERE m.id = ANY(d.ids[2:]);

-- -----------------------------------------------------------------------------
-- 5) leads_diarios_por_funil — mesma coluna `funil`, tabela lida por
--    src/components/LeadsDiariosCard.tsx e src/pages/CSLive.tsx. Não existe
--    migration versionada dessa tabela no repo (criada fora das migrations),
--    então o bloco abaixo é guardado por um IF (só roda se a tabela existir)
--    para nunca falhar caso ela tenha um nome/coluna diferente.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_diarios_por_funil' AND column_name = 'funil'
  ) THEN
    UPDATE leads_diarios_por_funil SET funil = 'Workshop' WHERE funil IN ('Supplytex', 'SUPPLYTEX');
    UPDATE leads_diarios_por_funil SET funil = 'Membership' WHERE funil IN ('UniForce');
    UPDATE leads_diarios_por_funil SET funil = 'Imersão Premium' WHERE funil IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai');
    UPDATE leads_diarios_por_funil SET funil = 'Consultoria' WHERE funil IN ('CS Club', 'C$ Club', 'CS  Club');
    UPDATE leads_diarios_por_funil SET funil = 'Expansão' WHERE funil IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Conferência pós-execução (rode no SQL Editor para checar se sobrou algum
-- nome real fora dos 5 canônicos):
--   SELECT DISTINCT funil FROM vendas WHERE funil IS NOT NULL;
--   SELECT DISTINCT valor FROM configuracoes WHERE tipo = 'Funil';
--   SELECT DISTINCT funil FROM configuracoes WHERE funil IS NOT NULL;
--   SELECT DISTINCT funil FROM metricas_diarias;
-- Nenhuma dessas queries deve retornar qualquer um dos nomes reais listados
-- nos UPDATE ... WHERE funil/valor IN (...) acima depois deste script.
--
-- custos_marketing NÃO tem coluna `funil` (schema real: categoria, nome_item,
-- valor) — confirmado via migration 20260401204654 — por isso não é tocada
-- aqui, ao contrário do que o item 1 do relatório do usuário pediu para
-- verificar.
-- =============================================================================
