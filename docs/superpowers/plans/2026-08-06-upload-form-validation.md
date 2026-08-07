# Validação visível no formulário de envio — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que todo clique no botão "Concluir Envio de Fotos" produza uma resposta visível — ou o envio começa, ou o cliente vê qual campo falta, onde ele está olhando.

**Architecture:** As regras de validação saem do componente para um módulo puro (`src/utils/validation.ts`), sem React e sem DOM. `Upload.tsx` passa a guardar um mapa de erros por campo em vez de um booleano, o botão deixa de ser desabilitado, e uma caixa de aviso nasce imediatamente acima do botão para receber tanto o resumo da validação quanto as falhas de upload.

**Tech Stack:** React 18 + TypeScript 5.6 + Vite 6, CSS puro em `src/index.css`, deploy em Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-06-upload-form-validation-design.md`

## Global Constraints

- **Sem test runner no projeto.** `package.json` de `apps/fotocity/web` só tem `dev`, `build`, `preview`. O ciclo de verificação de cada tarefa é `npx tsc --noEmit` (erro de tipo quebra) mais o cenário de navegador indicado na tarefa. Não adicionar vitest/jest — está explicitamente fora de escopo no spec.
- **Mensagens de erro em português, na voz do cliente**, copiadas literalmente da tabela do spec. Não inventar variação de texto.
- **WhatsApp exige 11 dígitos** (DDD + 9 dígitos). Rejeitar telefone fixo é intencional.
- **Nenhum placeholder pode conter algo que se leia como um valor real.** Nada de números, endereços de e-mail ou nomes de exemplo.
- **Vermelho nunca é o único sinal** de erro: sempre acompanha borda mais grossa e texto.
- **O componente serve todos os tenants.** Nenhuma condicional por marca.
- **`Upload.tsx` não pode ganhar nenhum caminho de retorno silencioso.** Todo `return` antecipado em `handleSubmit` escreve uma mensagem visível antes de sair.

---

### Task 1: Módulo puro de validação

**Files:**
- Create: `apps/fotocity/web/src/utils/validation.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `UploadField`, `FieldErrors`, `UploadFormValues`, `FIELD_ORDER`, `validateUploadForm(v: UploadFormValues): FieldErrors`, `firstInvalidField(errors: FieldErrors): UploadField | null`. A Task 4 importa três deles — `validateUploadForm`, `firstInvalidField` e o tipo `FieldErrors`. `FIELD_ORDER`, `UploadField` e `UploadFormValues` são usados dentro do próprio módulo e ficam exportados para uso futuro em testes.

- [ ] **Step 1: Criar o arquivo**

```ts
// Regras de validação do formulário de conclusão de envio.
// Sem React e sem DOM: as regras podem ser lidas — e testadas depois — sozinhas.

export type UploadField = 'tamanho' | 'nome' | 'email' | 'whats'

export type FieldErrors = Partial<Record<UploadField, string>>

export interface UploadFormValues {
  tamanho: string
  nome: string
  email: string
  whats: string
}

// Ordem em que os campos são lidos na tela. O foco após uma tentativa falha segue
// essa sequência, então ela mora ao lado das regras para as duas não se desencontrarem.
export const FIELD_ORDER: UploadField[] = ['tamanho', 'nome', 'email', 'whats']

// Todo celular brasileiro tem 11 dígitos com DDD. O campo é WhatsApp, então
// telefone fixo (10 dígitos) é recusado de propósito.
const WHATS_MIN_DIGITS = 11

export function validateUploadForm(v: UploadFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!v.tamanho.trim()) {
    errors.tamanho = 'Selecione o tamanho das fotos'
  }

  if (v.nome.trim().length < 2) {
    errors.nome = 'Preencha seu nome'
  }

  const email = v.email.trim()
  if (!email) {
    errors.email = 'Preencha seu e-mail'
  } else if (!/.+@.+\..+/.test(email)) {
    errors.email = 'E-mail inválido — confira se tem @ e ponto'
  }

  const digits = v.whats.replace(/\D/g, '')
  if (!digits) {
    errors.whats = 'Preencha seu WhatsApp'
  } else if (digits.length < WHATS_MIN_DIGITS) {
    errors.whats = 'Digite o DDD e o número completo'
  }

  return errors
}

export function firstInvalidField(errors: FieldErrors): UploadField | null {
  return FIELD_ORDER.find(field => errors[field]) ?? null
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd apps/fotocity/web && npx tsc --noEmit`
Expected: sem saída (sucesso). O módulo ainda não é importado por ninguém — isso é esperado nesta tarefa.

- [ ] **Step 3: Commit**

```bash
git add apps/fotocity/web/src/utils/validation.ts
git commit -m "feat(fotocity): regras de validação do formulário de envio em módulo puro"
```

---

### Task 2: Estilos de erro

**Files:**
- Modify: `apps/fotocity/web/src/index.css` (acrescentar após o bloco `.form-value-locked`, que termina por volta da linha 345)

**Interfaces:**
- Consumes: nada.
- Produces: as classes `invalid`, `field-error` e `form-error`, usadas pela Task 4. O `max-width: 420px` de `.form-error` casa com o `.form-grid` existente para os dois alinharem.

- [ ] **Step 1: Acrescentar as regras**

Localizar o fim do bloco `.form-value-locked { ... }` em `apps/fotocity/web/src/index.css` e inserir logo depois:

```css
/* Placeholder em itálico e cinza claro: diferença de forma, não só de tom, para
   o campo vazio não ser lido como preenchido no celular. */
.form-item input::placeholder {
  color: #9e9e9e;
  font-style: italic;
}

.form-item input.invalid,
.form-item select.invalid {
  border: 2px solid #c62828;
  background: #fff5f5;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  color: #c62828;
  font-size: 14px;
  font-weight: 700;
}

/* Caixa de aviso logo acima do botão, na mesma linguagem visual de .message.error */
.form-error {
  max-width: 420px;
  margin: 0 auto 12px;
  padding: 12px;
  border: 2px dashed #a30000;
  border-radius: 5px;
  background: #ffe5e5;
  color: #a30000;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
}
```

- [ ] **Step 2: Verificar que o build passa**

Run: `cd apps/fotocity/web && npx vite build`
Expected: build completa sem erro. As classes ainda não são usadas — esperado nesta tarefa.

- [ ] **Step 3: Commit**

```bash
git add apps/fotocity/web/src/index.css
git commit -m "style(fotocity): estilos de campo inválido e caixa de aviso do formulário"
```

---

### Task 3: Placeholders e tamanho travado como texto

Mudança puramente visual, sem tocar em lógica. Fica separada da validação para poder ser revisada e revertida sozinha.

**Files:**
- Modify: `apps/fotocity/web/src/pages/Upload.tsx` (bloco `.finalize-form`, por volta das linhas 662-721)

**Interfaces:**
- Consumes: a classe `.form-value-locked`, que já existe em `index.css:337`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Trocar os três placeholders**

Em `apps/fotocity/web/src/pages/Upload.tsx`:

| Linha atual | De | Para |
|---|---|---|
| ~687 | `placeholder="Seu nome"` | `placeholder="Inserir seu nome"` |
| ~701 | `placeholder="seu@email.com"` | `placeholder="Inserir seu e-mail"` |
| ~715 | `placeholder="(11) 91234-5678"` | `placeholder="Inserir seu WhatsApp com DDD"` |

- [ ] **Step 2: Renderizar o tamanho travado como texto**

Substituir o bloco do select (linhas ~666-677) por:

```tsx
<label htmlFor="photo-size">Tamanho das Fotos</label>
{lockedSize ? (
  <span className="form-value-locked">{lockedSize}</span>
) : (
  <select
    id="photo-size"
    value={photoSize}
    onChange={(e) => setPhotoSize(e.target.value)}
  >
    <option value="">SELECIONE O TAMANHO</option>
    {PHOTO_SIZES.map(size => (
      <option key={size} value={size}>{size}</option>
    ))}
  </select>
)}
```

Duas mudanças embutidas, ambas intencionais: some o atributo `disabled` (não há mais select para desabilitar quando o tamanho vem travado) e `value` passa de `photoSize || defaultSize` para `photoSize`. O segundo é seguro porque `defaultSize` e `lockedSize` leem exatamente o mesmo parâmetro de URL (`Upload.tsx:59-60`) — quando `defaultSize` tem valor, o select nem é renderizado.

- [ ] **Step 3: Verificar tipos**

Run: `cd apps/fotocity/web && npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 4: Conferir no navegador**

Run: `npm run fotocity:web:dev` (na raiz do repositório)

Abrir `http://localhost:5173/?tamanho=10x15`, selecionar uma foto qualquer, clicar em "CONCLUIR ENVIO DE FOTOS" para abrir o formulário.

Expected:
- "10x15" aparece como texto preto em caixa cinza-clara, igual aos campos de nome/e-mail pré-preenchidos — sem select cinza.
- Os três placeholders aparecem em itálico cinza, sem número de telefone de exemplo.

Abrir `http://localhost:5173/` (sem `?tamanho=`) e repetir.
Expected: o select aparece normalmente, com "SELECIONE O TAMANHO" como primeira opção.

- [ ] **Step 5: Commit**

```bash
git add apps/fotocity/web/src/pages/Upload.tsx
git commit -m "fix(fotocity): placeholders que não parecem valores e tamanho travado como texto"
```

---

### Task 4: Validação visível

O núcleo da correção.

**Files:**
- Modify: `apps/fotocity/web/src/pages/Upload.tsx`

**Interfaces:**
- Consumes: `validateUploadForm`, `firstInvalidField`, `FieldErrors` da Task 1; as classes `invalid`, `field-error`, `form-error` da Task 2.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Importar o módulo de validação**

Acrescentar após a linha 4 de `Upload.tsx`:

```tsx
import { validateUploadForm, firstInvalidField, FieldErrors } from '../utils/validation'
```

- [ ] **Step 2: Declarar o estado e os refs**

Logo após `const [sentLightbox, setSentLightbox] = useState<number>(-1)` (linha ~52):

```tsx
  // Origem da mensagem: o efeito de revalidação só pode limpar o resumo de validação.
  // Uma falha de upload acontece com o formulário já válido, então seria apagada
  // pela primeira tecla digitada em seguida.
  type FormAlert = { text: string; kind: 'validation' | 'upload' }
  const [errors, setErrors] = useState<FieldErrors>({})
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [formAlert, setFormAlert] = useState<FormAlert | null>(null)

  const tamanhoRef = useRef<HTMLSelectElement>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const whatsRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 3: Trocar `canSubmit` pelo efeito de revalidação**

Remover integralmente (linhas ~232-234):

```tsx
  const canSubmit = nome.trim().length > 1 &&
    /.+@.+\..+/.test(email.trim()) &&
    whats.replace(/\D/g, '').length >= 10
```

Colocar no lugar:

```tsx
  // Só marca campo em vermelho depois da primeira tentativa: ninguém é acusado de
  // erro antes de tentar. A partir daí revalida a cada tecla, e o vermelho some
  // sozinho conforme o cliente corrige.
  useEffect(() => {
    if (!triedSubmit) return
    const found = validateUploadForm({ tamanho: currentSize, nome, email, whats })
    setErrors(found)
    if (Object.keys(found).length === 0) {
      setFormAlert(prev => (prev?.kind === 'validation' ? null : prev))
    }
  }, [triedSubmit, currentSize, nome, email, whats])
```

- [ ] **Step 4: Reescrever a abertura do `handleSubmit`**

Substituir a linha 243 (`if (!canSubmit || uploading || !sizeInfo) return`) por:

```tsx
    if (uploading) return

    const found = validateUploadForm({ tamanho: currentSize, nome, email, whats })
    setErrors(found)
    setTriedSubmit(true)

    const first = firstInvalidField(found)
    if (first) {
      setFormAlert({ text: 'Faltam dados. Confira os campos marcados em vermelho.', kind: 'validation' })
      const refs = { tamanho: tamanhoRef, nome: nomeRef, email: emailRef, whats: whatsRef }
      // focus() já rola o campo para a área visível, abre o teclado no celular e é
      // anunciado por leitor de tela — melhor que scrollIntoView para os três casos.
      refs[first].current?.focus()
      return
    }

    // Um link com ?tamanho=abc passa na regra de "não vazio" mas não é um tamanho
    // real. Só acontece com link malformado, então a mensagem aponta para o link.
    if (!sizeInfo) {
      setErrors({ tamanho: 'Tamanho de foto inválido neste link' })
      setFormAlert({ text: 'O link usado tem um tamanho de foto inválido. Fale com o suporte.', kind: 'validation' })
      tamanhoRef.current?.focus()
      return
    }

    setFormAlert(null)
```

- [ ] **Step 5: Fazer a falha de upload aparecer perto do botão**

Substituir o bloco `catch` da linha ~373:

```tsx
    } catch (err) {
      showMessage('Erro ao enviar fotos. Tente novamente.', 'error')
```

por:

```tsx
    } catch (err) {
      // Também na caixa junto ao botão: com dezenas de fotos na tela, a mensagem do
      // topo nasce fora da área visível e o cliente nunca a vê.
      showMessage('Erro ao enviar fotos. Tente novamente.', 'error')
      setFormAlert({ text: 'Erro ao enviar fotos. Tente novamente.', kind: 'upload' })
```

- [ ] **Step 6: Ligar os campos aos erros no JSX**

No bloco `.finalize-form`, cada campo ganha `ref`, classe condicional e mensagem embaixo.

Campo de tamanho — o `<select>` do ramo não travado (Task 3):

```tsx
  <select
    id="photo-size"
    ref={tamanhoRef}
    className={errors.tamanho ? 'invalid' : ''}
    value={photoSize}
    onChange={(e) => setPhotoSize(e.target.value)}
  >
```

E logo após o fechamento do bloco condicional do tamanho, ainda dentro do `.form-item`:

```tsx
{errors.tamanho && (
  <div className="field-error">
    <i className="fas fa-exclamation-circle"></i> {errors.tamanho}
  </div>
)}
```

Campo de nome:

```tsx
  <input
    id="nome"
    ref={nomeRef}
    className={errors.nome ? 'invalid' : ''}
    type="text"
    placeholder="Inserir seu nome"
    value={nome}
    onChange={(e) => setNome(e.target.value)}
  />
)}
{errors.nome && (
  <div className="field-error">
    <i className="fas fa-exclamation-circle"></i> {errors.nome}
  </div>
)}
```

Campo de e-mail:

```tsx
  <input
    id="email"
    ref={emailRef}
    className={errors.email ? 'invalid' : ''}
    type="email"
    placeholder="Inserir seu e-mail"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
)}
{errors.email && (
  <div className="field-error">
    <i className="fas fa-exclamation-circle"></i> {errors.email}
  </div>
)}
```

Campo de WhatsApp:

```tsx
  <input
    id="whats"
    ref={whatsRef}
    className={errors.whats ? 'invalid' : ''}
    type="tel"
    placeholder="Inserir seu WhatsApp com DDD"
    value={whats}
    onChange={(e) => setWhats(formatPhoneBR(e.target.value))}
  />
)}
{errors.whats && (
  <div className="field-error">
    <i className="fas fa-exclamation-circle"></i> {errors.whats}
  </div>
)}
```

O bloco `{errors.X && ...}` fica **fora** do ternário `prefilledX ? ... : ...`, dentro do `.form-item` — assim o erro também aparece nos campos travados por URL, que continuam sendo validados.

- [ ] **Step 7: Caixa de aviso e botão sempre clicável**

Substituir o bloco `.form-actions` (linhas ~722-731) por:

```tsx
            {formAlert && (
              <div className="form-error" role="alert">
                <i className="fas fa-exclamation-triangle"></i> {formAlert.text}
              </div>
            )}
            <div className="form-actions">
              <button
                className={`btn green ${uploading ? 'disabled' : ''}`}
                disabled={uploading}
                onClick={handleSubmit}
              >
                <i className="fas fa-paper-plane"></i>
                {uploading ? 'Enviando... aguarde' : 'CONCLUIR ENVIO DE FOTOS'}
              </button>
            </div>
```

- [ ] **Step 8: Verificar tipos**

Run: `cd apps/fotocity/web && npx tsc --noEmit`
Expected: sem saída. Em especial, nenhum erro de `sizeInfo` possivelmente nulo depois da linha do guard — se aparecer, o guard do Step 4 foi colocado no lugar errado.

- [ ] **Step 9: Commit**

```bash
git add apps/fotocity/web/src/pages/Upload.tsx
git commit -m "fix(fotocity): validação visível por campo no envio de fotos"
```

---

### Task 5: Verificação de comportamento no navegador

**Files:** nenhum (verificação). Correções que surgirem entram como commits próprios.

**Interfaces:**
- Consumes: tudo das tarefas 1-4.
- Produces: confirmação de que os oito cenários do spec passam.

- [ ] **Step 1: Subir o servidor de desenvolvimento**

Run: `npm run fotocity:web:dev` (na raiz)
Expected: Vite em `http://localhost:5173`.

- [ ] **Step 2: Rodar os oito cenários**

Em todos, é preciso primeiro selecionar ao menos uma foto e clicar em "CONCLUIR ENVIO DE FOTOS" para o formulário abrir.

| # | URL | Ação | Esperado |
|---|---|---|---|
| 1 | `/` | Formulário vazio, clicar em concluir | Quatro campos com borda vermelha e mensagem; caixa "Faltam dados..." acima do botão; foco no select de tamanho |
| 2 | `/` | Preencher tamanho, nome e WhatsApp; deixar e-mail vazio; clicar | Só o e-mail em vermelho, com "Preencha seu e-mail"; foco no e-mail |
| 3 | `/` | E-mail `paulo@teste`, resto válido, clicar | "E-mail inválido — confira se tem @ e ponto" |
| 4 | `/` | WhatsApp `11912345` (9 dígitos), resto válido, clicar | "Digite o DDD e o número completo" |
| 5 | `/` | Depois de falhar no cenário 2, digitar um e-mail válido | Vermelho e mensagem do e-mail somem sem novo clique; a caixa acima do botão some quando o último erro é corrigido |
| 6 | `/?tamanho=10x15` | Abrir o formulário | Tamanho como texto preto, sem select cinza; nenhum erro de tamanho |
| 7 | `/?tamanho=10x15&nome=Paulo&email=paulo@teste.com&telefone=11966427971` | Abrir o formulário e clicar em concluir | Os quatro campos aparecem como texto travado; nenhum erro é acusado e o envio começa direto |
| 8 | `/` | Preencher tudo corretamente e clicar | O envio começa (botão vira "Enviando... aguarde"); nenhum erro falso |

- [ ] **Step 3: Corrigir o que falhar**

Cada correção vira um commit próprio com mensagem descrevendo o cenário que falhou. Reexecutar o cenário afetado depois de cada correção.

- [ ] **Step 4: Build dos dois tenants**

```bash
npm run fotocity:web:build
npm run kouritsu:web:build
```
Expected: os dois completam sem erro de tipo nem de build.

---

### Task 6: Deploy e verificação em produção

**Files:** nenhum.

**Interfaces:**
- Consumes: tudo das tarefas 1-5.

- [ ] **Step 1: Publicar o fotocity**

```bash
npm run fotocity:web:build && npm run fotocity:web:deploy
```

Os dois tenants compartilham `apps/fotocity/web/dist`. O build tem de rodar imediatamente antes do deploy correspondente — encadeados com `&&` justamente para isso. Inverter a ordem publica o bundle do tenant errado, com marca, cores e URL de API do outro.

- [ ] **Step 2: Publicar o kouritsu**

```bash
npm run kouritsu:web:build && npm run kouritsu:web:deploy
```

- [ ] **Step 3: Verificar em produção**

Em `https://envios.fotocity.com.br` e em `https://kouritsu.fotopronto.com.br/?tamanho=10x15`, repetir os cenários 1 e 6 da Task 5.

Expected:
- Fotocity: formulário vazio + clique produz os quatro campos em vermelho e a caixa de aviso.
- Kouritsu: o tamanho aparece como texto preto; a marca continua Kouritsu (logo e vermelho `#E30613`), confirmando que o bundle correto foi publicado em cada projeto.

- [ ] **Step 4: Publicar os commits**

```bash
git push
```

---

## Notas de execução

- Há alterações não commitadas anteriores em `PhotoEditor.tsx`, `canvasUtils.ts`, `Manager.tsx`, `photoSizes.ts` e `.env.kouritsu`. Não são deste trabalho. Cada `git add` deste plano nomeia arquivos explicitamente — não usar `git add -A` nem `git commit -a`, para não arrastar essas mudanças junto.
- A modificação pendente em `Upload.tsx` (troca para `sanitizeSizeForId`) é pequena e não conflita com nenhuma linha tocada aqui; ela será carregada junto nos commits das tarefas 3 e 4, o que é aceitável por ser uma alteração já existente e coerente na mesma tela.
