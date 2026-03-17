# Como colocar seu app no ar no Vercel (Grátis)

Siga estes passos simples para hospedar seu app sem pagar nada:

### 1. Preparação no GitHub
Certifique-se de que você já enviou as alterações mais recentes para o seu repositório do GitHub.
(Eu já ajustei o código para você!)

### 2. Criar conta no Vercel
1.  Acesse [vercel.com](https://vercel.com).
2.  Clique em **"Sign Up"**.
3.  Escolha **"Continue with GitHub"**.
4.  Autorize o acesso.

### 3. Importar o Projeto
1.  No painel do Vercel, clique no botão azul **"Add New..."** e selecione **"Project"**.
2.  Você verá uma lista dos seus repositórios do GitHub. Encontre o seu (ex: `nexis-flow-app`) e clique em **"Import"**.

### 4. Configurar Variáveis de Ambiente (IMPORTANTE!)
Antes de clicar em Deploy, procure a seção **"Environment Variables"**:
Adicione estas chaves (copie e cole os valores):

*   `STRIPE_SECRET_KEY`: (Sua chave secreta do Stripe `sk_test_...`)
*   `GEMINI_API_KEY`: (Sua chave da API Gemini)
*   `APP_URL`: (Deixe em branco por enquanto ou coloque o link que o Vercel te der depois)
*   `NODE_ENV`: `production`

### 5. Deploy!
1.  Clique no botão **"Deploy"**.
2.  Aguarde cerca de 1 a 2 minutos.
3.  **Pronto!** O Vercel vai te dar um link (ex: `https://seu-app.vercel.app`).

### Por que o Vercel?
*   **Totalmente Grátis:** Você não precisa de cartão de crédito.
*   **Rápido:** O site carrega muito rápido globalmente.
*   **Automático:** Sempre que você atualizar o código no GitHub, o Vercel atualiza o site sozinho.

**Qualquer dúvida, é só me chamar!**
