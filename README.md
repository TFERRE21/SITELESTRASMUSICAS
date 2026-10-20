# Site Letras Musicais

Base inicial para uma plataforma de descoberta de músicas, letras autorizadas e conteúdo musical.

> Estado: o portal inclui pesquisa musical, ranking, player de vídeo incorporado, cadastro/login com senhas derivadas via scrypt, favoritos por conta e abertura/consulta de chamados. Ainda requer testes de compilação e implantação, configuração de armazenamento persistente e finalização de recursos pendentes antes de produção.

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

O cadastro institucional centraliza o CNPJ fornecido pelo proprietário. Razão social, nome fantasia, e-mail, endereço e contato de direitos autorais permanecem pendentes de confirmação. Não interprete a inclusão do CNPJ como validação cadastral.\n\n### Contas e suporte\n\n- Configure `DATA_DIR` em um volume persistente da hospedagem; o servidor grava ali contas, sessões, favoritos e chamados em arquivos JSON. Se o diretório for efêmero, os dados podem ser perdidos em uma nova implantação.\n- Defina `ADMIN_SUPPORT_TOKEN` como segredo longo e aleatório no painel da hospedagem para proteger os endpoints administrativos de suporte. Não o publique nem use prefixo `VITE_`.\n- Cadastro e login estão disponíveis via `/api/auth/register` e `/api/auth/login`; senhas são derivadas com `scrypt` e não são armazenadas em texto puro.\n- A recuperação de senha por e-mail, edição completa do perfil, playlists e painel visual administrativo ainda precisam de implementação. Configure serviço de e-mail antes de oferecer recuperação de senha.

## Direitos autorais

Não publique letras completas sem base legal, licença ou autorização aplicável. Prefira conteúdo licenciado, material de domínio público quando confirmado, metadados e links para fontes autorizadas. Disponibilize um canal válido para solicitações de titulares antes do lançamento.

## Publicidade

Os espaços de publicidade ficam desativados por padrão. IDs de anúncios só devem ser preenchidos após cadastro real e conforme as políticas da rede escolhida. A aprovação por uma rede publicitária não é garantida.

## Publicação

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para preparação de ambiente, segurança, SEO, backup e checklist de lançamento.

## Status e próximos passos

A estrutura inicial não representa uma plataforma pronta para produção. Persistência/banco de dados, autenticação administrativa, ingestão musical licenciada, formulários de contato operacionais, monitoramento e publicação precisam ser definidos e implementados antes do lançamento.
