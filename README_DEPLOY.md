# 🚀 Guia de Publicação Profissional - Nexis Flow

Este guia contém os passos para colocar seu aplicativo no ar de forma profissional, segura e escalável.

## 1. Preparação do Ambiente
Antes de publicar, garanta que você tem as chaves de produção:
- **Stripe:** Mude para o modo "Live" no painel do Stripe e pegue a `Secret Key`.
- **Google Cloud:** Verifique se o faturamento (billing) está ativo para evitar interrupções na API Gemini.

## 2. Opções de Hospedagem

### Opção A: Vercel (A mais simples)
1. Vá em **Settings** (Engrenagem) > **Export** > **Push to GitHub** aqui no AI Studio.
2. No site da [Vercel](https://vercel.com), clique em "Add New" > "Project".
3. Importe o repositório que o AI Studio acabou de criar.
4. **Configuração Importante:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - **Environment Variables:** Adicione `STRIPE_SECRET_KEY`, `GEMINI_API_KEY` e `APP_URL`.

### Opção B: Firebase App Hosting (Recomendado para ecossistema Google)
1. Conecte seu repositório GitHub ao Firebase Console.
2. O Firebase detectará automaticamente o `package.json` e fará o build.
3. Configure as variáveis de ambiente (Secrets) no painel do Firebase.

### Opção C: Google Cloud Run (Onde o app está agora)
Ideal para controle total e alta performance.
1. Use o `Dockerfile` que eu criei.
2. Execute: `gcloud run deploy nexis-flow --source .`
3. Configure um domínio personalizado no painel do Cloud Run.

## 3. Configurações de Segurança Cruciais

### Domínios Autorizados
No Console do Firebase, vá em **Authentication > Settings > Authorized Domains** e adicione seu domínio final (ex: `www.seuapp.com`). Sem isso, o login do Google falhará.

### Regras do Firestore
As regras já estão configuradas no arquivo `firestore.rules`. Ao publicar, use o comando:
```bash
firebase deploy --only firestore:rules
```

### Tela de Consentimento OAuth
No Google Cloud Console, configure a "OAuth Consent Screen". Adicione sua logo, e-mail de suporte e links de política de privacidade para remover o aviso de "App não verificado".

## 4. Variáveis de Ambiente
Certifique-se de configurar estas variáveis no seu serviço de hospedagem:
- `STRIPE_SECRET_KEY`: Sua chave real do Stripe.
- `APP_URL`: A URL final do seu site (importante para os redirecionamentos do Stripe).
- `NODE_ENV`: Defina como `production`.

## 5. Checklist Final
- [ ] O site tem o cadeado (HTTPS)?
- [ ] O login do Google funciona no domínio final?
- [ ] O pagamento do Stripe redireciona de volta para o site correto?
- [ ] As regras do Firestore estão protegendo os dados dos usuários?

---
*Desenvolvido com foco em segurança e escalabilidade.*
