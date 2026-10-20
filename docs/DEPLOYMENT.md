# Preparação para publicação

Esta aplicação é uma base visual inicial. Não trate a compilação bem-sucedida como evidência de que banco de dados, catálogo licenciado, e-mail, conta publicitária ou domínio foram configurados.

## Etapas de desenvolvimento

1. Instale Node.js 20+ e npm 10+.
2. Execute `npm install`.
3. Execute `npm run dev` para desenvolvimento.
4. Execute `npm test` e `npm run build` antes de enviar alterações.
5. Configure os serviços externos apenas em contas pertencentes ao proprietário.

## Variáveis de ambiente

Consulte `.env.example`. Variáveis com prefixo `VITE_` ficam disponíveis no navegador após a compilação e não podem conter senhas, tokens privados ou credenciais. Configure `DATABASE_URL` e outras credenciais exclusivamente no ambiente de servidor/hospedagem; nesta versão não existe backend que as consuma.

Os anúncios ficam desativados por padrão. Só informe IDs reais depois de criar a conta do serviço. A publicação de slots não garante aprovação nem receita.

## Hospedagem

A estrutura pode ser compilada em hospedagem estática que suporte Vite:

- Build command: `npm ci && npm run build` (após gerar e versionar um lockfile validado).
- Output directory: `dist`.
- Configure fallback de SPA para `index.html` se adicionar rotas no cliente.
- Adicione domínio personalizado e HTTPS no painel do provedor quando o domínio for definido.
- Não publique `.env` real, segredos ou dados privados em commits.

## Antes do lançamento

- [ ] Confirmar nome fantasia, razão social e CNPJ com a documentação cadastral oficial.
- [ ] Informar e validar o e-mail institucional e o canal de direitos autorais.
- [ ] Revisar Termos de Uso e Política de Privacidade com base no tratamento real de dados e na legislação aplicável (incluindo LGPD quando aplicável).
- [ ] Definir responsável/canal do titular para solicitações de dados pessoais.
- [ ] Substituir exemplos por metadados e letras fornecidos por fonte licenciada/autorizada. Não copiar letras completas de terceiros sem autorização ou fundamento legal válido.
- [ ] Criar backend seguro para formulários, administração e persistência antes de recolher dados de usuários.
- [ ] Configurar validação de entrada, proteção contra abuso, política de acesso e registro de erros sem capturar segredos.
- [ ] Configurar consentimento/cookies apenas de acordo com tecnologias realmente utilizadas.
- [ ] Criar páginas institucionais definitivas antes de submeter a redes de anúncios.
- [ ] Validar políticas da rede publicitária e configurar os IDs reais; não gerar cliques ou impressões artificiais.
- [ ] Configurar Search Console, URL canônica, sitemap.xml dinâmico/atualizado e robots.txt para o domínio final.
- [ ] Adicionar monitoramento de erros, disponibilidade, alertas e política de retenção de logs.
- [ ] Definir rotina de backup e testar a restauração de bancos de dados e arquivos.
- [ ] Configurar pipeline de CI para testes e compilação após geração/validação do lockfile.
- [ ] Conferir acessibilidade, responsividade, desempenho, links e metadados em dispositivo real.
- [ ] Realizar revisão de segurança e jurídica antes da publicação.

## Persistência e banco de dados

Não há banco de dados nem migrações nesta versão. Escolha um provedor e modelo de dados após decidir como serão obtidos os metadados musicais, a origem das letras, as contas administrativas e os requisitos de retenção. Não execute migrações destrutivas no banco de produção sem backup verificado, revisão e plano de reversão.

## CI e dependências

O repositório inicial não inclui `package-lock.json`. Execute `npm install` em ambiente compatível e faça commit do lockfile resultante depois de revisar as dependências. Configure CI com instalação reprodutível, `npm test` e `npm run build` quando o lockfile estiver presente.

## Dados institucionais

O único dado cadastral preenchido é o CNPJ informado pelo proprietário: 69.623.245/0001-71. Razão social, contato institucional, endereço e canal de direitos autorais permanecem vazios intencionalmente. A configuração não valida a situação cadastral junto à Receita Federal.
