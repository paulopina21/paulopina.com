# Validação visível no formulário de envio (Fotocity / Kouritsu)

**Data:** 2026-08-06
**Escopo:** `apps/fotocity/web` — tela de upload (`Upload.tsx`), afeta todos os tenants
**Status:** aprovado para implementação

## Problema

Clientes finais relatam que o envio "não está concluindo". A tela do gerente confirma
que muitos pedidos nunca chegam. Investigando o código, existem **três causas
independentes**, todas com o mesmo sintoma: o cliente clica no botão verde e nada
acontece, sem nenhuma mensagem.

### Causa 1 — botão desabilitado que parece habilitado

`Upload.tsx:725` desabilita o botão quando os dados não passam na validação:

```tsx
disabled={!canSubmit || uploading}
```

E `index.css:253` dá ao estado desabilitado apenas `opacity: 0.6`. Sobre o verde
`#2e7d32` do `.btn.green`, 60% de opacidade continua sendo um botão verde com cara
de clicável. O cliente clica, o navegador ignora o clique, **nenhuma mensagem
aparece**. Do ponto de vista dele o site travou.

### Causa 2 — placeholders que parecem valores preenchidos

`Upload.tsx:687,701,715`:

| Campo | Placeholder atual |
|---|---|
| Nome | `Seu nome` |
| E-mail | `seu@email.com` |
| WhatsApp | `(11) 91234-5678` |

`(11) 91234-5678` é um número de telefone plausível e completo. No celular, a
diferença entre o cinza do placeholder e o preto de um valor real é sutil. O cliente
lê a tela, vê três campos "preenchidos", clica em concluir e nada acontece. Quando o
suporte pede para preencher os dados, ele responde que **já preencheu** — porque é
literalmente o que ele está vendo.

### Causa 3 — tamanho não validado, mas obrigatório

`canSubmit` (`Upload.tsx:232`) valida nome, e-mail e WhatsApp, mas **não valida o
tamanho das fotos**. Já `handleSubmit` (`Upload.tsx:243`) exige o tamanho:

```tsx
if (!canSubmit || uploading || !sizeInfo) return
```

Num link sem `?tamanho=` na URL, o cliente pode preencher os três campos corretamente
e deixar o select em "SELECIONE O TAMANHO". `canSubmit` fica `true`, **o botão fica
verde e habilitado**, ele clica, e `handleSubmit` sai calado no `!sizeInfo`. É a pior
das três: o botão está funcionando visualmente e mesmo assim não faz nada.

### Agravante — erro de upload nasce fora da tela

Quando o upload falha de verdade, `Upload.tsx:374` chama
`showMessage('Erro ao enviar fotos. Tente novamente.', 'error')`. Essa mensagem é
renderizada em `Upload.tsx:526`, **no topo da página**, antes da grade de miniaturas
(`:562`) e do formulário (`:662`). Com 40 fotos selecionadas, a distância entre o
botão e a mensagem é de vários scrolls. O cliente clica no botão embaixo e o aviso
aparece acima da área visível — ele nunca vê.

### Ruído visual — tamanho travado renderizado em cinza

Quando o link traz `?tamanho=10x15` (o caso do Kouritsu), `Upload.tsx:671` marca o
`<select>` como `disabled`, e o navegador o pinta em cinza. É o "10x15" apagado que
aparece no print do cliente. Não é um bug, mas reforça a leitura de "campo vazio"
numa tela onde o cliente já está confuso sobre o que falta preencher.

## Objetivo

**Todo clique no botão verde produz uma resposta visível.** Ou o envio começa, ou o
cliente vê exatamente qual campo está faltando, no lugar onde ele está olhando.

## Design

### 1. Regra de validação isolada — `src/utils/validation.ts` (arquivo novo)

Função pura, sem React, sem DOM. Recebe os valores dos campos e devolve um mapa de
erros. Vazio significa válido.

```ts
export type UploadField = 'tamanho' | 'nome' | 'email' | 'whats'
export type FieldErrors = Partial<Record<UploadField, string>>

export interface UploadFormValues {
  tamanho: string
  nome: string
  email: string
  whats: string
}

export const FIELD_ORDER: UploadField[] = ['tamanho', 'nome', 'email', 'whats']

export function validateUploadForm(v: UploadFormValues): FieldErrors
```

Regras e mensagens — em linguagem de cliente, não de sistema:

| Campo | Condição | Mensagem |
|---|---|---|
| `tamanho` | vazio | `Selecione o tamanho das fotos` |
| `nome` | menos de 2 caracteres após `trim()` | `Preencha seu nome` |
| `email` | vazio após `trim()` | `Preencha seu e-mail` |
| `email` | não casa `/.+@.+\..+/` | `E-mail inválido — confira se tem @ e ponto` |
| `whats` | nenhum dígito | `Preencha seu WhatsApp` |
| `whats` | menos de 11 dígitos | `Digite o DDD e o número completo` |

**Decisão sobre o WhatsApp:** o mínimo atual é 10 dígitos (`Upload.tsx:234`), o que
aceita celular sem o nono dígito e também telefone fixo. Como o campo é WhatsApp e
todo celular brasileiro tem 11 dígitos com DDD, o mínimo sobe para 11. Consequência
aceita e intencional: números fixos passam a ser rejeitados. A máscara
`formatPhoneBR` (`Upload.tsx:12`) já corta em 11 dígitos, então o campo consegue
chegar no valor exigido.

`FIELD_ORDER` é exportado junto porque tanto o foco no primeiro erro quanto a ordem
de leitura da tela dependem dessa sequência; deixá-la ao lado das regras evita que as
duas se desencontrem.

### 2. Estado de validação em `Upload.tsx`

Remove:

```tsx
const canSubmit = nome.trim().length > 1 && /.+@.+\..+/.test(email.trim()) && whats.replace(/\D/g, '').length >= 10
```

Adiciona:

```tsx
type FormAlert = { text: string; kind: 'validation' | 'upload' }

const [errors, setErrors] = useState<FieldErrors>({})
const [triedSubmit, setTriedSubmit] = useState(false)
const [formAlert, setFormAlert] = useState<FormAlert | null>(null)
```

Comportamento:

- **Antes do primeiro clique** — nenhum campo aparece em vermelho. Não se acusa o
  cliente de erro antes de ele tentar.
- **No clique** — `handleSubmit` valida. Se houver erro: grava `errors`, marca
  `triedSubmit`, escreve o resumo em `formAlert`, dá `focus()` no primeiro campo
  inválido segundo `FIELD_ORDER` e retorna sem enviar.
- **Depois do primeiro clique** — um `useEffect` com dependência em
  `[triedSubmit, currentSize, nome, email, whats]` revalida a cada tecla. O vermelho
  do campo some assim que o cliente corrige, sem precisar clicar de novo.

**Por que `formAlert` carrega a origem da mensagem.** O mesmo bloco visual mostra
tanto o resumo de validação quanto a falha de upload (seção 6). Se o efeito de
revalidação limpasse qualquer mensagem ao ficar válido, ele apagaria o
"Erro ao enviar fotos" — porque um upload só falha depois de o formulário já estar
válido, e qualquer tecla digitada em seguida dispararia a limpeza. Por isso o efeito
só limpa quando `kind === 'validation'`; a mensagem de falha de upload permanece até
o cliente clicar em enviar de novo.

O botão perde a condição de validação e mantém apenas o estado de envio:

```tsx
disabled={uploading}
```

O `if (!canSubmit || uploading || !sizeInfo) return` de `Upload.tsx:243` desaparece: o
tamanho passa a ser campo validado como os outros, então `!sizeInfo` deixa de ser uma
saída silenciosa. `handleSubmit` mantém uma guarda `if (uploading) return` no topo
para evitar duplo envio.

### 3. Foco no primeiro campo inválido

Cada campo recebe um `ref`. Ao falhar a validação, o primeiro campo inválido segundo
`FIELD_ORDER` recebe `focus()`.

Usar `focus()` e não `scrollIntoView()`: o foco já rola o elemento para a área visível
em todos os navegadores relevantes, abre o teclado no celular e é anunciado por
leitores de tela. Chamar os dois briga pelo scroll.

Quando o tamanho vem travado pela URL, ele não pode estar inválido (a URL sempre traz
um valor), então o foco nunca cai num elemento que não existe. Ainda assim o código
trata o `ref` como possivelmente nulo (`?.focus()`), porque os campos pré-preenchidos
por URL também são renderizados como texto e não como `input`.

**Campos travados continuam sendo validados.** Se o operador gerar um link com
`?email=lixo`, o e-mail é inválido e o cliente não consegue editá-lo. O envio é
bloqueado — como já é hoje —, mas agora com a mensagem visível ao lado do campo, em
vez do botão morto. A tela já traz o botão "Suporte via WhatsApp"
(`Upload.tsx:649`), então o cliente tem para onde ir. Validar sempre é o
comportamento correto: um e-mail inválido gravado no pedido quebra o envio da
confirmação depois.

### 4. Placeholders

| Campo | Novo placeholder |
|---|---|
| Nome | `Inserir seu nome` |
| E-mail | `Inserir seu e-mail` |
| WhatsApp | `Inserir seu WhatsApp com DDD` |

O número de exemplo sai. Nenhum placeholder passa a conter algo que possa ser lido
como um valor real.

No CSS, o placeholder ganha itálico e cinza mais claro:

```css
.form-item input::placeholder {
  color: #9e9e9e;
  font-style: italic;
}
```

O itálico é o que resolve a confusão no celular — é uma diferença de forma, não só de
tom, e sobrevive a tela clara, brilho alto e daltonismo.

### 5. Tamanho travado vira texto

Quando `lockedSize` está presente, renderizar

```tsx
<span className="form-value-locked">{lockedSize}</span>
```

no lugar do `<select disabled>`. A classe `.form-value-locked` já existe
(`index.css:337`) e já é usada pelos campos nome/e-mail/telefone pré-preenchidos por
URL. Fica consistente com o resto do formulário e sem CSS novo.

O `<select>` continua sendo renderizado normalmente quando o tamanho não vem na URL.

### 6. Mensagem de erro acima do botão

Bloco novo dentro de `.finalize-form`, imediatamente acima de `.form-actions`:

```tsx
{formAlert && (
  <div className="form-error" role="alert">
    <i className="fas fa-exclamation-triangle"></i> {formAlert.text}
  </div>
)}
```

Recebe duas coisas:

1. O resumo da validação: `Faltam dados. Confira os campos marcados em vermelho.`
   (`kind: 'validation'`)
2. **Os erros de upload** (`kind: 'upload'`). O tratamento de erro de
   `Upload.tsx:374` passa a escrever também em `formAlert`, além do `showMessage` do
   topo. O topo continua servindo aos avisos ligados à seleção de fotos (limite de
   imagens, remoção); o bloco novo serve ao que acontece no momento do clique.

`role="alert"` para que leitores de tela anunciem o erro sem depender do foco.

### 7. CSS novo (`index.css`)

Quatro regras, todas na linguagem visual que o arquivo já usa:

- `.form-item input.invalid, .form-item select.invalid` — borda vermelha de 2px e
  fundo levemente rosado. O select entra na mesma regra porque o tamanho agora é
  campo validado.
- `.field-error` — texto vermelho, pequeno e em negrito, logo abaixo do campo.
- `.form-error` — caixa de aviso acima do botão, seguindo `.message.error`
  (`index.css:101`): fundo `#ffe5e5`, texto `#a30000`, borda tracejada.
- `.form-item input::placeholder` — itálico e cinza claro.

O vermelho nunca é o único sinal: campo inválido tem borda mais grossa, mensagem
textual embaixo e o resumo acima do botão.

## O que fica de fora

- **`Manager.tsx:1022`** tem o mesmo placeholder `(11) 91234-5678`, mas é o gerador de
  links — ferramenta interna do operador, não do cliente final. Fora de escopo.
- **Setup de testes automatizados.** O projeto não tem test runner
  (`package.json` só traz `dev`, `build`, `preview`). `validateUploadForm` fica pura e
  isolada justamente para que adicionar vitest depois seja barato, mas montar a
  infraestrutura agora infla uma entrega que precisa chegar rápido no cliente.
- **Redesenho do formulário.** Layout, ordem dos campos e passos do fluxo continuam
  como estão.

## Verificação

Sem test runner no projeto, a verificação é o `tsc` do build mais conferência manual.

**Build:** `npm run fotocity:web:build` e `npm run kouritsu:web:build` — ambos rodam
`tsc` antes do `vite build`, então erro de tipo quebra o build.

**Cenários manuais**, em `npm run fotocity:web:dev`:

| # | Cenário | Esperado |
|---|---|---|
| 1 | Link sem `?tamanho=`, formulário totalmente vazio, clicar em concluir | Quatro campos em vermelho com mensagem, resumo acima do botão, foco no select de tamanho |
| 2 | Preencher tudo menos e-mail, clicar | Só o e-mail em vermelho, foco no e-mail |
| 3 | E-mail `paulo@teste`, clicar | Mensagem `E-mail inválido — confira se tem @ e ponto` |
| 4 | WhatsApp com 9 dígitos, clicar | Mensagem `Digite o DDD e o número completo` |
| 5 | Após falhar, corrigir o campo digitando | Vermelho e mensagem somem sem novo clique |
| 6 | Link com `?tamanho=10x15` | Tamanho aparece como texto preto, sem select cinza |
| 7 | Link com `?nome=&email=&telefone=` preenchidos | Campos travados seguem como texto, sem regressão |
| 8 | Formulário válido, enviar | Envio acontece normalmente, sem erro falso |

**Produção:** após o deploy, repetir os cenários 1 e 6 em
`https://envios.fotocity.com.br` e `https://kouritsu.fotopronto.com.br`.

## Nota de deploy

Os dois tenants compartilham o mesmo diretório de saída (`apps/fotocity/web/dist`).
Os scripts de deploy publicam o conteúdo atual desse diretório:

```
npm run fotocity:web:build  && npm run fotocity:web:deploy
npm run kouritsu:web:build  && npm run kouritsu:web:deploy
```

O build precisa rodar imediatamente antes do deploy correspondente. Inverter a ordem
publica o bundle do tenant errado — com a marca, as cores e a URL de API do outro.
