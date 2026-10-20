# Integração do catálogo musical LRCLIB

## Provedor configurado

O site usa a API pública do LRCLIB. **Não é necessária chave de API nem cadastro** para consultar os endpoints documentados.

- Documentação oficial: https://lrclib.net/docs
- Base da API: https://lrclib.net
- Busca: `GET /api/search?q=nome+da+faixa+artista`
- Letra por ID: `GET /api/get/{id}`
- Consulta por assinatura da faixa: `GET /api/get?track_name=...&artist_name=...&album_name=...&duration=...`

O servidor envia um User-Agent identificando o projeto, verifica respostas HTTP e retorna erro 429 quando há limitação temporária. Faça buscas sob demanda, sem varreduras em massa; respeite Retry-After e os limites publicados pela LRCLIB.

## Variáveis no iContainer

Para a integração LRCLIB, não é necessário preencher `MUSIXMATCH_API_KEY`, `MUSIXMATCH_LYRICS_ENABLED` ou `CATALOG_SYNC_TOKEN`. Removemos essas configurações da integração atual.

Opcional:

- `DATA_DIR=/data`: diretório gravável para cache de metadados de buscas. Monte um volume persistente no caminho se quiser preservar o cache entre recriações do contêiner. As letras não são gravadas nessa cache.

Mantenha a porta interna `4173` no iContainer (ou defina `PORT` para a porta configurada na aplicação).

## Endpoints locais

- `GET /api/health`: informa provedor LRCLIB e confirma que não é necessária chave.
- `GET /api/catalog?q=nome+da+faixa`: consulta a busca LRCLIB, retorna até 20 resultados e armazena apenas metadados em cache.
- `GET /api/catalog`: devolve os metadados armazenados em cache.
- `GET /api/lyrics/{trackId}`: consulta a letra por ID no LRCLIB.

## Limitações importantes

- LRCLIB não documenta um endpoint de charts para popular automaticamente um catálogo mundial. Por isso, não fazemos sincronização diária em massa; a pesquisa ocorre quando o visitante busca uma música ou artista.
- A presença de uma letra na API não garante autorização para republicá-la em um site comercial. Verifique os termos, os direitos autorais e a adequação ao seu uso antes de publicar letras completas.
- A base pode não conter todas as músicas. A API tem limites; ao receber HTTP 429, aguarde o período indicado em `Retry-After`.
- O projeto não usa scraping de sites de terceiros.
