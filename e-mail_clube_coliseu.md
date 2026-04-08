<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Coliseu</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #000000; /* Preto absoluto */
      background-color: #f4f4f5; /* Fundo levemente cinza para destacar a div central */
      margin: 0;
      padding: 0;
    }
    .wrapper {
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      /* Neo-Brutalism: Borda grossa e sombra dura */
      border: 3px solid #000000;
      box-shadow: 8px 8px 0px #000000;
    }
    .header {
      background-color: #000000;
      color: #ffffff;
      padding: 25px 20px;
      text-align: center;
      border-bottom: 3px solid #000000;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -1px;
    }
    .header span {
      color: #dc2626; /* Vermelho Coliseu */
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      font-size: 24px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 25px;
      text-transform: uppercase;
    }
    .content p {
      font-size: 16px;
      margin-bottom: 20px;
      color: #18181b; /* Quase preto */
    }
    .features-box {
      background-color: #f4f4f5;
      border: 2px solid #000000;
      padding: 20px;
      margin: 30px 0;
    }
    .features-box p {
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .features-box ul {
      margin: 0;
      padding-left: 20px;
    }
    .features-box li {
      margin-bottom: 8px;
      font-weight: 500;
    }
    .cta-container {
      text-align: center;
      margin: 40px 0;
    }
    .cta-button {
      background-color: #dc2626; /* Fundo vermelho */
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      text-decoration: none;
      padding: 16px 32px;
      display: inline-block;
      /* Neo-Brutalism: Borda preta e sombra preta no botão */
      border: 2px solid #000000;
      box-shadow: 4px 4px 0px #000000;
    }
    .footer {
      padding: 20px;
      background-color: #ffffff;
      border-top: 2px solid #000000;
      text-align: center;
      font-size: 13px;
      color: #71717a;
      font-weight: 500;
    }
    .footer a {
      color: #000000;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Cabeçalho (Header) -->
      <div class="header">
        <h1>COLISEU<span>CLUBE</span></h1>
      </div>
      
      <!-- Conteúdo Principal -->
      <div class="content">
        <h2>FALA, {{ .Data.first_name }}! 🔥</h2>
        
        <p>Seu acesso ao app do <strong>Coliseu Clube</strong> já está pronto.</p>
        
        <p>Criamos esse espaço porque acreditamos na força da comunidade — e agora você faz oficialmente parte dela.</p>
        
        <div class="features-box">
          <p>O QUE VOCÊ VAI ENCONTRAR NO APP:</p>
          <ul>
            <li>Check-in em turmas e acompanhamento dos WODs.</li>
            <li>Registro dos pesos e recordes pessoais (PR).</li>
            <li>Seu histórico de atividades completo.</li>
          </ul>
        </div>
        
        <p>Para confirmar sua vaga, tudo o que você precisa fazer é definir a sua senha inicial.</p>
        
        <div class="cta-container">
          <a href="{{ .ConfirmationURL }}" class="cta-button">CRIAR SENHA DE ACESSO</a>
        </div>
        
        <p style="font-weight: 700; margin-top: 30px;">Nos vemos no Coliseu.</p>
      </div>

      <!-- Rodapé (Footer) com o link puro para fallback -->
      <div class="footer">
        Se o botão não funcionar, cole este link no navegador:<br>
        <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
        <br><br>
        ColiseuFit &copy; 2026.
      </div>

    </div>
  </div>
</body>
</html>
