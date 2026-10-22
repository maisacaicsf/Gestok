# Gestok — Notas de segurança

## O que foi corrigido nesta versão
1. **Assinatura protegida** (`firebase/firestore.rules`): o navegador não consegue mais gravar/alterar
   `assinatura`, `donoUid` nem `codigo` na loja. Na criação, a loja só nasce como teste grátis (até ~45 dias).
2. **Índice `acessos` protegido**: só o dono da loja cria a chave, e ela precisa ser exatamente `codigoLoja_usuario`.
   Não é possível trocar `uid`/`lojaId` depois.
3. **`aprovarPagamentoGestok()` desativada** (`auth.js`): permitia ativar a assinatura pelo navegador. Ninguém a usava.
4. **Correção de datas**: `vencimento` vindo do Firestore (Timestamp) agora é convertido para ISO ao montar a conta local.
5. **Limpeza**: removidos `operadores/Nova pasta/` (cópia antiga e mais fraca) e `firebase/teste.html`.

## IMPORTANTE — publicar as regras
Alterar o arquivo não muda o Firebase. Abra **Firebase Console → Firestore Database → Regras**,
cole o conteúdo de `firebase/firestore.rules` e clique em **Publicar**.
Teste depois: cadastro de loja nova, login, recuperação de senha, cadastro de produto, entrada e saída.

## Ainda recomendado (exige Cloud Functions / console)
- `acessos` ainda tem leitura pública (necessária para o login por Código + Usuário). O ideal é resolver isso
  numa Cloud Function que não devolva o e-mail ao navegador, e usar códigos de loja mais longos que 4 dígitos.
- Ativar **Firebase App Check** e limites de cota.
- Passar o início do teste grátis para o servidor (data pelo relógio do servidor).
- Login real para operadores do PDV, com papéis (hoje só o dono acessa `operadores`).
- Cabeçalhos de segurança (CSP, X-Frame-Options) no servidor de hospedagem.

## Fluxo de assinatura (como funciona agora)
1. Cadastro → loja criada com **teste grátis de 30 dias**.
2. A cada página protegida, o sistema lê a assinatura no Firestore. Vencida ou pendente → vai para `/pagamento/`.
3. Pagamento aprovado → as Cloud Functions gravam `status: "ativa"`, `pagamento: "aprovado"` e o novo `vencimento`.
   (Esses valores exatos são os que o front espera.)
4. Páginas livres mesmo vencido: login, cadastro, planos, pagamento, perfil e suporte.

## Checklist antes de lançar
- [ ] Regras do Firestore publicadas (arquivo `firebase/firestore.rules`)
- [ ] Cloud Functions de pagamento publicadas (`paymentConfig`, `paymentStatus` e o webhook)
- [ ] Mercado Pago em **modo produção** (credenciais reais) e URL do webhook cadastrada
- [ ] Domínio do site em Authentication → Settings → Authorized domains
- [ ] Teste completo: criar conta, simular vencimento, pagar, conferir liberação
