# REDESOCIAL

RedeSOCIOLOCAL é uma PWA de vídeo social com identidade própria, construída para crescer por módulos.

## Fundação atual

- React + Vite + TypeScript
- Lucide React para a biblioteca de ícones
- UI mobile-first em tema escuro, baseada no modelo visual aprovado
- Navegação principal reduzida a **Vídeos** e **Perfil**
- Telegrafo permanece como módulo separado, acessado pelo ícone de chat
- Estrutura preparada para cache, normalização, roteamento de conteúdo e enriquecimento por IA
- Catálogo normalizado com deduplicação, expiração e estatísticas por fonte
- Cache local como camada de aceleração; o catálogo central continuará sendo server-side
- GitHub Actions para validação automática

## Composição planejada do feed

- **40% Pinterest**
- **60% demais fontes**, incluindo NASA, NARA, Europeana, DPLA, Wikimedia, Internet Archive, Guardian e futuras APIs.

Essa proporção é do feed, não do tamanho do acervo de nenhuma fonte.

## Segurança

Nenhuma chave de API é colocada no frontend. Segredos devem permanecer em variáveis de ambiente do servidor/GitHub Actions.

O arquivo `.env.example` contém somente os nomes das variáveis esperadas.

## Estrutura inicial

```text
REDESOCIAL/
├── .github/workflows/validate.yml
├── public/manifest.webmanifest
├── src/
│   ├── content/
│   │   ├── cache.ts
│   │   ├── catalog.ts
│   │   ├── content-router.ts
│   │   ├── index.ts
│   │   ├── qwen.ts
│   │   ├── sources.ts
│   │   └── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Próximas etapas

1. validar o bootstrap;
2. consolidar o sistema visual;
3. criar o catálogo/cache normalizado;
4. conectar as fontes uma por uma;
5. implementar o roteador 40/60;
6. integrar Qwen somente no lado seguro;
7. integrar Supabase após a arquitetura estar validada;
8. preparar deploy no Vercel.

> O branch `architecture/bootstrap` é a fundação inicial. A `main` permanece separada até a validação.
