/*
  # Limpar dados de teste
  
  Esta migration remove todos os dados de teste para começar a operação real do sistema.
  
  ## O que será removido:
  - Todos os itens de compras (purchase_items)
  - Todas as compras (purchases)
  - Todos os boletos (bills)
  
  ## Notas importantes:
  - As tabelas e estruturas permanecem intactas
  - Apenas os dados são removidos
  - Os usuários não são afetados
*/

-- Limpar itens de compras
DELETE FROM purchase_items;

-- Limpar compras
DELETE FROM purchases;

-- Limpar boletos
DELETE FROM bills;
