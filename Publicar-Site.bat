@echo off
echo ========================================================
echo   PUBLICANDO O SITE MRM AUTO NA VERCEL
echo ========================================================
echo.
echo Passo 1: O sistema vai pedir para voce fazer login na Vercel.
echo Use as setas do teclado para escolher a opcao de login (ex: Continue with Email) e aperte ENTER.
echo Uma tela vai abrir no seu navegador para voce aprovar.
echo Quando aprovar no navegador, volte para esta janela preta.
echo.
pause
call npx vercel login

echo.
echo ========================================================
echo Passo 2: Agora vamos enviar o codigo do site.
echo Nas proximas perguntas, basta apertar a tecla ENTER para aceitar todas as configuracoes padrao.
echo.
pause
call npx vercel

echo.
echo ========================================================
echo Processo finalizado! O link do seu site deve estar aparecendo acima.
echo.
echo IMPORTANTE: Nao se esqueca de colocar suas chaves do Supabase na aba "Environment Variables" nas configuracoes do projeto no site da Vercel.
echo.
pause
