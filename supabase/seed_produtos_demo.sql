-- =============================================================================
-- SANITIZAÇÃO DE NOMES DE PRODUTO REAIS — `configuracoes` (tipo='Produto') e
-- `vendas.produto` (schema public — banco principal, NÃO o schema "wpp")
-- =============================================================================
-- Sintoma relatado: a tela de Vendas/Receita por Produto (src/pages/Index.tsx,
-- "Receita por Produto" — produtoData agrupa `vendas.produto`; filtro de
-- Produto em src/pages/Index.tsx lê de useConfiguracoes("Produto") →
-- `configuracoes` tipo='Produto') ainda mostra nomes reais de produto — ver
-- o mapeamento completo abaixo (WHERE ... IN (...)) para a lista exata.
--
-- Diferente do schema "wpp" (seed_marketing_demo.sql), `public.vendas` é a
-- tabela real de negócios/deals do CRM (usada em Vendas.tsx, FunilXPTO.tsx,
-- Index.tsx) — NÃO é uma tabela só de demo. Apagar/truncar `vendas` inteira
-- destruiria histórico real de vendas (datas, valores, clientes, ciclo de
-- venda) que o restante do app depende para funcionar corretamente. Por isso
-- esta correção é um RENAME não-destrutivo: troca só a STRING do nome do
-- produto (em `configuracoes.valor` e `vendas.produto`) por um nome fictício
-- equivalente, mantendo linha, data, valor e todo o resto da estrutura real
-- intactos — mesmo padrão já usado em
-- supabase/migrations/20260924000000_sanitiza_nomes_funil_demo.sql para os
-- nomes de funil.
--
-- IDEMPOTENTE: cada UPDATE casa só o nome real (WHERE valor/produto = 'X'),
-- então rodar de novo é inócuo depois da primeira execução.
--
-- Rode no SQL Editor do Supabase, no banco PRINCIPAL do projeto (schema
-- "public" — mesmo projeto de configuracoes/vendas, não o schema "wpp").
-- =============================================================================

BEGIN;

-- Pool fictício: Nexo Growth, Nexo Scale, Nexo Gestão, Nexo Performance.
-- Mapeamento 1:1 com os nomes reais — ver cada bloco UPDATE ... WHERE ... IN
-- (...) abaixo para o valor real exato coberto por cada linha (variações de
-- grafia/maiúsculas incluídas).

-- -----------------------------------------------------------------------------
-- 1) configuracoes (tipo='Produto') — lista de opções do filtro de Produto
-- -----------------------------------------------------------------------------
UPDATE configuracoes SET valor = 'Nexo Growth'
WHERE tipo = 'Produto' AND valor IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE configuracoes SET valor = 'Nexo Scale'
WHERE tipo = 'Produto' AND valor IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai', 'Paraguai Nov/26');

UPDATE configuracoes SET valor = 'Nexo Gestão'
WHERE tipo = 'Produto' AND valor IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

UPDATE configuracoes SET valor = 'Nexo Performance'
WHERE tipo = 'Produto' AND valor IN ('Supplytex', 'SUPPLYTEX');

-- -----------------------------------------------------------------------------
-- 2) vendas.produto — mesma renomeação aplicada a cada linha de venda/deal
-- -----------------------------------------------------------------------------
UPDATE vendas SET produto = 'Nexo Growth'
WHERE produto IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE vendas SET produto = 'Nexo Scale'
WHERE produto IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai', 'Paraguai Nov/26');

UPDATE vendas SET produto = 'Nexo Gestão'
WHERE produto IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

UPDATE vendas SET produto = 'Nexo Performance'
WHERE produto IN ('Supplytex', 'SUPPLYTEX');

-- -----------------------------------------------------------------------------
-- 3) custos_marketing.produto — mesma coluna existe aqui também (migration
--    20260402180952_...), usada por src/pages/CustosMarketing.tsx
-- -----------------------------------------------------------------------------
UPDATE custos_marketing SET produto = 'Nexo Growth'
WHERE produto IN ('CS Club', 'C$ Club', 'CS  Club');

UPDATE custos_marketing SET produto = 'Nexo Scale'
WHERE produto IN ('Imersão Paraguai', 'Imersao Paraguai', 'Paraguai', 'Paraguai Nov/26');

UPDATE custos_marketing SET produto = 'Nexo Gestão'
WHERE produto IN ('Segredos da Confecção', 'Segredos da Confeccao', 'Segredos');

UPDATE custos_marketing SET produto = 'Nexo Performance'
WHERE produto IN ('Supplytex', 'SUPPLYTEX');

COMMIT;

-- =============================================================================
-- IMPORTANTE — o que este arquivo NÃO faz e por quê:
-- Não apaga nem regenera linhas de `vendas`/`configuracoes`/`custos_marketing`.
-- Essas tabelas guardam histórico real de negócio (datas de fechamento,
-- valores, clientes, ciclo de venda, responsável) consultado em várias telas
-- (Vendas, Funil, Index, CustosMarketing) — truncar ou reescrever valores
-- destruiria dados reais que o dashboard precisa continuar mostrando
-- corretamente para além do módulo de marketing. Se existir algum outro nome
-- real de produto além dos 4 listados acima, rode:
--   SELECT DISTINCT produto FROM vendas WHERE produto IS NOT NULL;
--   SELECT DISTINCT valor FROM configuracoes WHERE tipo = 'Produto';
-- no SQL Editor para identificá-lo e adicionar um UPDATE equivalente aqui.
-- =============================================================================
