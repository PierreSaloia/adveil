# AdVeil Browser para Android

Primeira etapa do navegador pessoal AdVeil. O projeto é Android nativo (Kotlin) e usa Android System WebView; não é um APK de extensão Chromium.

## Abrir e compilar

Abra esta pasta (`android/`) no Android Studio e aguarde a sincronização do Gradle. Com Android SDK 36 instalado, use **Build > Build APK(s)**. O APK debug deve aparecer em `app/build/outputs/apk/debug/app-debug.apk`. Pelo terminal, execute `gradlew.bat assembleDebug` no Windows ou `./gradlew assembleDebug` no Linux/macOS.

Para atualizar a lista de rede depois de mudar as listas na raiz do repositório, execute na pasta raiz:

```sh
node android/scripts/export-rules.mjs
```

O exportador produz as 4.599 regras Equilibrado e as 13.604 regras Reforçado/privacidade do AdVeil.
O APK também inclui os avisos de licença das listas e as licenças de software, disponíveis em **AdVeil > Licenças e fontes**.

## O que já funciona

- Navegação por endereço ou pesquisa, voltar, avançar e recarregar.
- Abas em memória, com criação, seleção e fechamento; grupos de abas podem ser salvos localmente e reabertos.
- Favoritos e histórico de navegação persistidos no aparelho.
- WebView com JavaScript e armazenamento local habilitados para compatibilidade com sites.
- Bloqueio de sub-recursos pelas listas Equilibrado ou Reforçado, filtros de domínio personalizados, pausa global, por host e contador local.
- Exceções e listas personalizadas, além de backup JSON pela área de transferência.
- Sincronização opcional de histórico, favoritos, grupos de abas salvas e preferências do AdVeil com o Google Drive.
- Perfil Complemento, com listas de anúncios desligadas e camadas de página ainda disponíveis.
- Camuflagem JavaScript, compatibilidade com detectores, bloqueio de pop-ups e substitutos locais para alguns scripts, pixels e frames de publicidade.
- Atalhos de destino para URLs de encurtadores reconhecidos e fluxo controlado para as etapas observadas em Tech8s/Game5s.
- Limpeza visual conservadora no perfil Reforçado.
- Pacote de regras especial do `steamverde.net`.

## Limites desta etapa

O WebView não oferece as mesmas APIs da extensão Chromium. A integração atual ainda não porta todas as exceções individuais nem o fechamento de abas já criadas por anúncios; os atalhos de encurtador com etapas no servidor também são limitados aos fluxos implementados. O matcher não reproduz toda a semântica de Declarative Net Request: alguns tipos de recurso e a origem de requisições podem não ser identificados, e regras regex são omitidas pelo exportador. A cobertura não é igual à extensão.

O histórico começa a ser guardado a partir da instalação desta versão; o Android não importa automaticamente o histórico ou favoritos do Chrome. A sincronização Google usa um arquivo privado na pasta `appDataFolder` do Drive do app. Senhas, cookies, sessões de sites e conteúdo de páginas não entram no backup. O conteúdo da navegação não é enviado a um serviço de IA nesta versão.

### Configurar a conexão Google

Antes do primeiro login, configure um projeto no Google Cloud:

1. Ative a **Google Drive API**.
2. Configure a tela de consentimento OAuth e crie um cliente OAuth para Android com o pacote `app.adveil.browser`.
3. Cadastre o SHA-1 da assinatura usada para instalar o APK. Para o APK debug local, consulte o certificado `debug.keystore` do Android; para qualquer APK assinado para distribuição, cadastre também o SHA-1 da chave de release.
4. No app, abra **⚙ > Sincronizar com Google Drive**, escolha a conta e aprove o acesso solicitado.

A autorização pede somente `https://www.googleapis.com/auth/drive.appdata`. O AdVeil usa essa área privada do Drive para manter um único backup JSON; o usuário não precisa escolher ou compartilhar um arquivo manualmente. Favoritos, histórico, grupos de abas e preferências já existentes são mesclados durante a sincronização. Após conectar, alterações novas sincronizam automaticamente enquanto o navegador estiver aberto; também é possível iniciar a sincronização pelo painel do AdVeil.

A interface de conversa com IA e a leitura contextual da página ficam para uma etapa posterior. Antes dessa integração, será necessário escolher o provedor/modelo e explicitar quando o conteúdo da página será enviado para fora do aparelho.

O bloqueio de requisições é feito por interceptação no WebView. Algumas APIs internas do navegador ou pedidos que o WebView não encaminha para essa interceptação não podem ser cobertos por esse método.
