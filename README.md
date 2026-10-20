# Site Letras Musicais

Base inicial para uma plataforma de descoberta de músicas, letras autorizadas e conteúdo musical.

> Estado: estrutura inicial de projeto. Antes de publicação, configure o nome comercial, contato oficial, fonte/licença das letras, hospedagem e serviços externos.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço local informado pelo Vite.

## Comandos

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: valida a compilação de produção.
- `npm run preview`: visualiza a compilação local.
- `npm test`: executa os testes básicos.

## Configuração

Copie `.env.example` para `.env` quando necessário. Não envie arquivos `.env` reais, tokens ou credenciais para o GitHub.

O cadastro institucional centraliza o CNPJ fornecido pelo proprietário. Razão social, nome fantasia, e-mail, endereço e contato de direitos autorais permanecem pendentes de confirmação. Não interprete a inclusão do CNPJ como validação cadastral.

## Direitos autorais

Não publique letras completas sem base legal, licença ou autorização aplicável. Prefira conteúdo licenciado, material de domínio público quando confirmado, metadados e links para fontes autorizadas. Disponibilize um canal válido para solicitações de titulares antes do lançamento.

## Publicidade

Os espaços de publicidade ficam desativados por padrão. IDs de anúncios só devem ser preenchidos após cadastro real e conforme as políticas da rede escolhida. A aprovação por uma rede publicitária não é garantida.

## Publicação

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para preparação de ambiente, segurança, SEO, backup e checklist de lançamento.

## Status e próximos passos

A estrutura inicial não representa uma plataforma pronta para produção. Persistência/banco de dados, autenticação administrativa, ingestão musical licenciada, formulários de contato operacionais, monitoramento e publicação precisam ser definidos e implementados antes do lançamento.
