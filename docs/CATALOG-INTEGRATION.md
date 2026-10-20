# Catálogo musical real e sincronização diária

## Provedor identificado

Musixmatch oferece uma API de catálogo e letras e documenta o uso de letras licenciadas em produtos. O proprietário precisa criar uma conta, obter uma chave e confirmar por escrito que o plano/contrato autoriza a exibição pública de letras completas neste site, nos territórios desejados e no modelo comercial pretendido. Uma chave de API, por si só, não comprova licença para publicar letras completas.

- Cadastro/documentação: https://developer.musixmatch.com/
- Termos: https://www.musixmatch.com/apiterms/
- SDK/OpenAPI público: https://github.com/musixmatch/musixmatch-sdk

Os planos, limites, endpoints disponíveis e direitos concedidos podem variar. Não foi criada nem presumida qualquer conta ou chave.

## Como configurar no VPS

Configure estas variáveis no painel de ambiente da aplicação, sem incluí-las no Git:

- `MUSIXMATCH_API_KEY`: chave real fornecida ao titular da conta.
- `MUSIXMATCH_LYRICS_ENABLED`: manter `false` até confirmar o contrato de exibição pública de letras completas. Alterar para `true` somente após autorização aplicável.
- `CATALOG_SYNC_TOKEN`: token aleatório forte para proteger a rota de sincronização manual.
- `DATA_DIR`: diretório persistente com permissão de escrita, preferencialmente um volume montado do VPS (ex.: `/data`).

O processo precisa ter saída HTTPS para `api.musixmatch.com`. Nunca use prefixo `VITE_` para credenciais privadas.

## Endpoints implementados

- `GET /api/health`: estado do serviço e configuração (não expõe segredos).
- `GET /api/catalog?q=nome+da+faixa&page=1`: pesquisa catálogo pelo provedor.
- `GET /api/catalog`: devolve itens da cache da sincronização.
- `GET /api/lyrics/{trackId}`: permanece bloqueado por padrão até ativação explícita após validação da licença.
- `POST /api/admin/sync`: sincronização manual autenticada com `Authorization: Bearer <CATALOG_SYNC_TOKEN>`.

A sincronização automática roda ao iniciar (se a chave existir) e depois a cada 24 horas, consultando o chart configurado para Brasil. A cache é mesclada por identificador e limitada a 1.000 faixas. Configure um volume persistente em `DATA_DIR`; sem volume, a cache pode ser perdida quando o contêiner for recriado.

## Limitações e segurança

- A disponibilidade de endpoints, charts, campos e letras depende do plano e dos limites atuais do provedor. Erros são devolvidos como JSON e registrados sem imprimir a chave.
- A resposta de letras pode ser apenas um trecho dependendo do acesso contratado; não se presume disponibilidade de letras completas.
- A sincronização inicial atualiza o chart do Brasil, não é uma importação exaustiva de todas as músicas do mundo. Pesquisa sob demanda pode encontrar faixas internacionais.
- Não há catálogo completo de todas as músicas: isso exige contrato, limites, fonte e estratégia de ingestão próprios.
- A cache é um arquivo JSON, não um banco de dados multiusuário. Para escala, adicionar banco de dados, migrações, fila de sincronização, controle de rate limit e política de retenção.
- Revise atribuição, avisos de copyright, cache, uso de capas e restrições territoriais de acordo com o contrato.
